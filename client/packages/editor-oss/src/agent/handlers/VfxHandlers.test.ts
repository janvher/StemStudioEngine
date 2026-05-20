import * as THREE from "three";
import {CircleEmitter, ParticleEmitter, ParticleSystem, SphereEmitter} from "three.quarks";
import {describe, expect, it, vi} from "vitest";

import {VFXHandlers} from "./VfxHandlers";
import {createFreshParticleConfig} from "../../services";

vi.mock("../../command/Commands", () => ({
    AddObjectCommand: class AddObjectCommand {
        async execute() {}
    },
    RemoveObjectCommand: class RemoveObjectCommand {
        async execute() {}
    },
    SetPositionCommand: class SetPositionCommand {
        execute() {}
    },
    SetRotationCommand: class SetRotationCommand {
        execute() {}
    },
    SetScaleCommand: class SetScaleCommand {
        execute() {}
    },
}));

/**
 *
 */
function createHarness() {
    const scene = new THREE.Scene();
    const app = {
        scene,
        call: vi.fn(),
    };

    return {
        app,
        scene,
        handlers: new VFXHandlers(app as any),
    };
}

describe("VFXHandlers shape handling", () => {
    it("normalizes legacy emitterShape into a real emitter instance", () => {
        const {handlers} = createHarness();

        const result = (handlers as any).deserializeConfig({
            emitterShape: {type: "CircleEmitter", radius: 1.25},
        });

        expect(result.shape).toBeInstanceOf(CircleEmitter);
        expect((result.shape as CircleEmitter).radius).toBe(1.25);
        expect((result).emitterShape).toBeUndefined();
    });

    it("applies config.shape to system.emitterShape during modify_vfx", async () => {
        const {app, handlers, scene} = createHarness();
        const system = new ParticleSystem(createFreshParticleConfig());
        const emitter = new ParticleEmitter(system);
        emitter.name = "Smoke";
        scene.add(emitter);

        const result = await handlers.handleModifyVFX({
            target: "Smoke",
            config: {
                shape: {type: "SphereEmitter", radius: 2},
            } as any,
        });

        expect(result.status).toBe("success");
        expect(system.emitterShape).toBeInstanceOf(SphereEmitter);
        expect((system.emitterShape as SphereEmitter).radius).toBe(2);
        expect(typeof (system.emitterShape as any).toJSON).toBe("function");
        expect((system as any).shape).toBeUndefined();
        expect(app.call).toHaveBeenCalledWith("objectChanged", handlers, emitter);
    });

    it("accepts legacy emitterShape during modify_vfx and maps it safely", async () => {
        const {handlers, scene} = createHarness();
        const system = new ParticleSystem(createFreshParticleConfig());
        const emitter = new ParticleEmitter(system);
        emitter.name = "Sparks";
        scene.add(emitter);

        const result = await handlers.handleModifyVFX({
            target: "Sparks",
            config: {
                emitterShape: {type: "CircleEmitter", radius: 0.75},
            },
        });

        expect(result.status).toBe("success");
        expect(system.emitterShape).toBeInstanceOf(CircleEmitter);
        expect((system.emitterShape as CircleEmitter).radius).toBe(0.75);
        expect(typeof (system.emitterShape as any).toJSON).toBe("function");
    });

    it("rejects untyped shape objects before they can break serialization", () => {
        const {handlers} = createHarness();

        expect(() =>
            (handlers as any).deserializeConfig({
                emitterShape: {radius: 1},
            })
        ).toThrow(/Invalid VFX shape config|expected either an emitter instance/i);
    });
});
