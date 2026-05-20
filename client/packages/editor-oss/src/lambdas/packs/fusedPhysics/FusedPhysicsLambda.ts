import { runPhysicsKernel } from "./FusedPhysicsKernel";
import type { ComponentFieldSchema } from "@stem/editor-oss/scheduler/data/ComponentStore";
import type { PhysicsWorkerResult } from "@stem/editor-oss/scheduler/workers/physics-worker";
import type { LambdaOptions } from "../../Lambda";
import { SoALambdaBase } from "../../SoALambdaBase";

/**
 * Single-pass physics lambda that fuses velocity + rigidbody + gravity
 * into one iteration. Eliminates redundant passes over the same objects.
 *
 * Pipeline per-object (single loop):
 *   1. Apply gravity to vy
 *   2. Apply linear drag to vx/vy/vz
 *   3. Apply angular drag to avx/avy/avz
 *   4. Clamp speed (maxSpeed)
 *   5. Apply damping (exponential decay)
 *   6. Integrate velocity → position (respecting freeze constraints)
 *   7. Integrate angular velocity → rotation (respecting freeze constraints)
 */

export const FUSED_PHYSICS_ID = "fused-physics";

/** IDs of individual lambdas this fused lambda replaces */
export const FUSABLE_LAMBDA_IDS = new Set(["velocity", "rigidbody", "gravity"]);

export const FUSED_PHYSICS_SCHEMA: ComponentFieldSchema[] = [
    // Linear velocity
    { name: "vx", type: "f32", default: 0 },
    { name: "vy", type: "f32", default: 0 },
    { name: "vz", type: "f32", default: 0 },
    // Angular velocity
    { name: "avx", type: "f32", default: 0 },
    { name: "avy", type: "f32", default: 0 },
    { name: "avz", type: "f32", default: 0 },
    // Physics properties
    { name: "mass", type: "f32", default: 1 },
    { name: "drag", type: "f32", default: 0 },
    { name: "angularDrag", type: "f32", default: 0.05 },
    { name: "gravityScale", type: "f32", default: 1 },
    // Velocity properties
    { name: "damping", type: "f32", default: 0 },
    { name: "maxSpeed", type: "f32", default: 100 },
    // Boolean flags (u8)
    { name: "useGravity", type: "u8", default: 1 },
    { name: "isKinematic", type: "u8", default: 0 },
    { name: "freezePositionX", type: "u8", default: 0 },
    { name: "freezePositionY", type: "u8", default: 0 },
    { name: "freezePositionZ", type: "u8", default: 0 },
    { name: "freezeRotationX", type: "u8", default: 0 },
    { name: "freezeRotationY", type: "u8", default: 0 },
    { name: "freezeRotationZ", type: "u8", default: 0 },
];

export default class FusedPhysicsLambda extends SoALambdaBase {
    /** Minimum entity count before offloading to Web Worker */
    private static readonly WORKER_THRESHOLD = 128;

    private worker: Worker | null = null;
    private workerBusy = false;
    private pendingResult: PhysicsWorkerResult | null = null;

    constructor(id: string, options: LambdaOptions) {
        super(id, options, FUSED_PHYSICS_SCHEMA);
        this.tryInitWorker();
    }

    private tryInitWorker(): void {
        try {
            this.worker = new Worker(
                new URL("../../../scheduler/workers/physics-worker.ts", import.meta.url),
                { type: "module" },
            );
            this.worker.onmessage = (e: MessageEvent<PhysicsWorkerResult>) => {
                this.pendingResult = e.data;
                this.workerBusy = false;
            };
            this.worker.onerror = () => {
                // Worker failed; fall back to main thread permanently
                this.worker?.terminate();
                this.worker = null;
            };
        } catch {
            this.worker = null;
        }
    }

    protected updateSoA(deltaTime: number): void {
        // Apply any pending worker results from the previous frame
        this.applyWorkerResult();

        const store = this.store;
        const count = store.count;
        if (count === 0) return;

        const gravity = this.attributes.gravity ?? this.attributes.gravityStrength ?? 9.81;

        // Use worker for large entity counts if available and not busy
        if (this.worker && !this.workerBusy && count >= FusedPhysicsLambda.WORKER_THRESHOLD) {
            this.dispatchToWorker(deltaTime, gravity);
            return;
        }

        // Main-thread fallback using the extracted kernel
        this.runMainThread(deltaTime, gravity);
    }

    private runMainThread(deltaTime: number, gravity: number): void {
        const store = this.store;
        const count = store.count;

        const result = runPhysicsKernel({
            count,
            deltaTime,
            gravity,
            vx: store.getField("vx") as Float32Array,
            vy: store.getField("vy") as Float32Array,
            vz: store.getField("vz") as Float32Array,
            avx: store.getField("avx") as Float32Array,
            avy: store.getField("avy") as Float32Array,
            avz: store.getField("avz") as Float32Array,
            drag: store.getField("drag") as Float32Array,
            angularDrag: store.getField("angularDrag") as Float32Array,
            gravityScale: store.getField("gravityScale") as Float32Array,
            damping: store.getField("damping") as Float32Array,
            maxSpeed: store.getField("maxSpeed") as Float32Array,
            useGravity: store.getField("useGravity") as Uint8Array,
            isKinematic: store.getField("isKinematic") as Uint8Array,
            freezePositionX: store.getField("freezePositionX") as Uint8Array,
            freezePositionY: store.getField("freezePositionY") as Uint8Array,
            freezePositionZ: store.getField("freezePositionZ") as Uint8Array,
            freezeRotationX: store.getField("freezeRotationX") as Uint8Array,
            freezeRotationY: store.getField("freezeRotationY") as Uint8Array,
            freezeRotationZ: store.getField("freezeRotationZ") as Uint8Array,
            visibilityMask: this._visibilityMask as Float32Array | null,
        });

        // Apply position/rotation deltas to Object3D
        for (let i = 0; i < count; i++) {
            const obj = store.getObject(i);
            if (!obj) continue;
            obj.position.x += result.dpx[i]!;
            obj.position.y += result.dpy[i]!;
            obj.position.z += result.dpz[i]!;
            obj.rotation.x += result.drx[i]!;
            obj.rotation.y += result.dry[i]!;
            obj.rotation.z += result.drz[i]!;
            obj.updateMatrix();
        }

        this.syncSoAToMap(["vx", "vy", "vz", "avx", "avy", "avz"]);
    }

    private dispatchToWorker(deltaTime: number, gravity: number): void {
        const store = this.store;
        const count = store.count;

        // Copy SoA arrays (they'll be transferred to the worker)
        const copy = (field: string, Ctor: Float32ArrayConstructor | Uint8ArrayConstructor) => {
            const src = store.getField(field);
            const dst = new Ctor(count);
            (dst as Float32Array | Uint8Array).set(src!.subarray(0, count));
            return dst;
        };

        const visMask = this._visibilityMask;
        const visBuffer = visMask ? new Float32Array(visMask.subarray(0, count)).buffer : null;

        const msg = {
            type: "run" as const,
            count,
            deltaTime,
            gravity,
            vx: copy("vx", Float32Array).buffer,
            vy: copy("vy", Float32Array).buffer,
            vz: copy("vz", Float32Array).buffer,
            avx: copy("avx", Float32Array).buffer,
            avy: copy("avy", Float32Array).buffer,
            avz: copy("avz", Float32Array).buffer,
            drag: copy("drag", Float32Array).buffer,
            angularDrag: copy("angularDrag", Float32Array).buffer,
            gravityScale: copy("gravityScale", Float32Array).buffer,
            damping: copy("damping", Float32Array).buffer,
            maxSpeed: copy("maxSpeed", Float32Array).buffer,
            useGravity: copy("useGravity", Uint8Array).buffer,
            isKinematic: copy("isKinematic", Uint8Array).buffer,
            freezePositionX: copy("freezePositionX", Uint8Array).buffer,
            freezePositionY: copy("freezePositionY", Uint8Array).buffer,
            freezePositionZ: copy("freezePositionZ", Uint8Array).buffer,
            freezeRotationX: copy("freezeRotationX", Uint8Array).buffer,
            freezeRotationY: copy("freezeRotationY", Uint8Array).buffer,
            freezeRotationZ: copy("freezeRotationZ", Uint8Array).buffer,
            visibilityMask: visBuffer,
        };

        const transfers: ArrayBuffer[] = [
            msg.vx, msg.vy, msg.vz,
            msg.avx, msg.avy, msg.avz,
            msg.drag, msg.angularDrag, msg.gravityScale,
            msg.damping, msg.maxSpeed,
            msg.useGravity, msg.isKinematic,
            msg.freezePositionX, msg.freezePositionY, msg.freezePositionZ,
            msg.freezeRotationX, msg.freezeRotationY, msg.freezeRotationZ,
        ];
        if (visBuffer) transfers.push(visBuffer);

        this.workerBusy = true;
        this.worker!.postMessage(msg, transfers);
    }

    private applyWorkerResult(): void {
        const result = this.pendingResult;
        if (!result) return;
        this.pendingResult = null;

        const store = this.store;
        const count = Math.min(store.count, new Float32Array(result.dpx).length);

        // Write back updated velocities
        const writeBack = (field: string, buf: ArrayBuffer) => {
            const src = new Float32Array(buf);
            const dst = store.getField(field) as Float32Array;
            dst.set(src.subarray(0, count));
        };
        writeBack("vx", result.vx);
        writeBack("vy", result.vy);
        writeBack("vz", result.vz);
        writeBack("avx", result.avx);
        writeBack("avy", result.avy);
        writeBack("avz", result.avz);

        // Apply position/rotation deltas
        const dpx = new Float32Array(result.dpx);
        const dpy = new Float32Array(result.dpy);
        const dpz = new Float32Array(result.dpz);
        const drx = new Float32Array(result.drx);
        const dry = new Float32Array(result.dry);
        const drz = new Float32Array(result.drz);

        for (let i = 0; i < count; i++) {
            const obj = store.getObject(i);
            if (!obj) continue;
            obj.position.x += dpx[i]!;
            obj.position.y += dpy[i]!;
            obj.position.z += dpz[i]!;
            obj.rotation.x += drx[i]!;
            obj.rotation.y += dry[i]!;
            obj.rotation.z += drz[i]!;
            obj.updateMatrix();
        }

        this.syncSoAToMap(["vx", "vy", "vz", "avx", "avy", "avz"]);
    }

    /**
     * Sliced version: yields every SLICE_SIZE entities for time-sliced execution
     * @param deltaTime
     */
    protected *updateSoASliced(deltaTime: number): Generator {
        const store = this.store;
        const count = store.count;
        if (count === 0) return;

        const SLICE = 64;
        const gravity = this.attributes.gravity ?? this.attributes.gravityStrength ?? 9.81;

        const vx = store.getField("vx") as Float32Array;
        const vy = store.getField("vy") as Float32Array;
        const vz = store.getField("vz") as Float32Array;
        const avx = store.getField("avx") as Float32Array;
        const avy = store.getField("avy") as Float32Array;
        const avz = store.getField("avz") as Float32Array;
        const dragArr = store.getField("drag") as Float32Array;
        const angularDrag = store.getField("angularDrag") as Float32Array;
        const gravityScale = store.getField("gravityScale") as Float32Array;
        const dampingArr = store.getField("damping") as Float32Array;
        const maxSpeedArr = store.getField("maxSpeed") as Float32Array;
        const useGravity = store.getField("useGravity") as Uint8Array;
        const isKinematic = store.getField("isKinematic") as Uint8Array;
        const freezePX = store.getField("freezePositionX") as Uint8Array;
        const freezePY = store.getField("freezePositionY") as Uint8Array;
        const freezePZ = store.getField("freezePositionZ") as Uint8Array;
        const freezeRX = store.getField("freezeRotationX") as Uint8Array;
        const freezeRY = store.getField("freezeRotationY") as Uint8Array;
        const freezeRZ = store.getField("freezeRotationZ") as Uint8Array;

        for (let i = 0; i < count; i++) {
            if (isKinematic[i]) continue;

            const multiplier = this._visibilityMask?.[i] ?? 1;
            if (multiplier === 0) continue;
            const effectiveDt = deltaTime * multiplier;

            let cvx = vx[i]!;
            let cvy = vy[i]!;
            let cvz = vz[i]!;

            if (useGravity[i]) cvy -= gravity * gravityScale[i]! * effectiveDt;

            const d = dragArr[i]!;
            if (d > 0) { const f = 1 - d; cvx *= f; cvy *= f; cvz *= f; }

            const ad = angularDrag[i]!;
            if (ad > 0) { const f = 1 - ad; avx[i]! *= f; avy[i]! *= f; avz[i]! *= f; }

            const ms = maxSpeedArr[i]!;
            const speed = Math.sqrt(cvx * cvx + cvy * cvy + cvz * cvz);
            if (speed > ms && speed > 0) { const s = ms / speed; cvx *= s; cvy *= s; cvz *= s; }

            const damp = dampingArr[i]!;
            if (damp > 0) { const f = 1 - damp; cvx *= f; cvy *= f; cvz *= f; }

            vx[i] = cvx; vy[i] = cvy; vz[i] = cvz;

            const obj = store.getObject(i);
            if (obj) {
                if (!freezePX[i]) obj.position.x += cvx * effectiveDt;
                if (!freezePY[i]) obj.position.y += cvy * effectiveDt;
                if (!freezePZ[i]) obj.position.z += cvz * effectiveDt;
                if (!freezeRX[i]) obj.rotation.x += avx[i]! * effectiveDt;
                if (!freezeRY[i]) obj.rotation.y += avy[i]! * effectiveDt;
                if (!freezeRZ[i]) obj.rotation.z += avz[i]! * effectiveDt;
                obj.updateMatrix();
            }

            // Yield between slices to let TimeSliceRunner check budget
            if ((i + 1) % SLICE === 0) yield;
        }

        this.syncSoAToMap(["vx", "vy", "vz", "avx", "avy", "avz"]);
    }
}
