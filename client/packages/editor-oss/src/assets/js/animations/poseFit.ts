/**
 * Pose-based skeleton alignment using MediaPipe BlazePose.
 *
 * Renders the avatar from MULTIPLE orthographic camera angles
 * (front + side), runs pose landmark detection on each, then
 * triangulates 3D world positions from the per-view 2D image
 * landmarks. This is significantly more accurate than relying on
 * BlazePose's single-view monocular depth estimate, which tended to
 * push wrists / elbows forward of the body plane.
 *
 * Pipeline:
 *   1. Render front (+Z) view with an orthographic camera framing
 *      the avatar — gives precise X, Y per landmark.
 *   2. Render side (+X) view with an orthographic camera — gives
 *      precise Y, Z per landmark.
 *   3. For each landmark index, combine: X from front, Z from side,
 *      Y averaged.
 *   4. Build a `PoseTargets` and pass to `applyPoseToSkeleton`,
 *      which rotates parent bones so each chain points at the next
 *      detected joint direction.
 *
 * We deliberately ROTATE bones rather than reposition them — this
 * keeps the Mixamo bone hierarchy intact and avoids the "stretched
 * spine" / "long neck" artifacts that bone-translation produced.
 */

import * as THREE from "three";
import {FilesetResolver, PoseLandmarker, type NormalizedLandmark} from "@mediapipe/tasks-vision";

const WASM_URL = "/assets/js/mediapipe-pose/wasm";
const MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

async function getLandmarker(): Promise<PoseLandmarker> {
    if (!landmarkerPromise) {
        landmarkerPromise = (async () => {
            const vision = await FilesetResolver.forVisionTasks(WASM_URL);
            return PoseLandmarker.createFromOptions(vision, {
                baseOptions: {modelAssetPath: MODEL_URL, delegate: "GPU"},
                runningMode: "IMAGE",
                numPoses: 1,
                outputSegmentationMasks: false,
            });
        })().catch(err => {
            landmarkerPromise = null;
            throw err;
        });
    }
    return landmarkerPromise;
}

// BlazePose landmark indices.
const LM = {
    NOSE: 0,
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13,
    RIGHT_ELBOW: 14,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_KNEE: 25,
    RIGHT_KNEE: 26,
    LEFT_ANKLE: 27,
    RIGHT_ANKLE: 28,
} as const;

export interface PoseTargets {
    nose: THREE.Vector3;
    leftShoulder: THREE.Vector3;
    rightShoulder: THREE.Vector3;
    leftElbow: THREE.Vector3;
    rightElbow: THREE.Vector3;
    leftWrist: THREE.Vector3;
    rightWrist: THREE.Vector3;
    leftHip: THREE.Vector3;
    rightHip: THREE.Vector3;
    leftKnee: THREE.Vector3;
    rightKnee: THREE.Vector3;
    leftAnkle: THREE.Vector3;
    rightAnkle: THREE.Vector3;
    // Avatar bbox extents, captured during the detection pass so
    // applyPoseToSkeleton can scale terminal bones (HeadTop_End,
    // Toe_End) to actually reach the mesh top / floor — BlazePose
    // doesn't return a top-of-head landmark and the Mixamo head bone
    // alone undershoots the dome on big-headed cartoon characters.
    bboxMaxY: number;
    bboxMinY: number;
}

interface OrthoRender {
    canvas: HTMLCanvasElement;
    frustumWidth: number;
    frustumHeight: number;
    cameraCenter: THREE.Vector3;
    cameraRight: THREE.Vector3;
    cameraUp: THREE.Vector3;
}

// Dedicated Three.js layer for pose-detection renders. The avatar
// and its lights opt into this layer for the brief window during
// detection; everything else (platform, helpers, gizmos, scene
// background) stays off the layer and is culled, so BlazePose sees
// the avatar in isolation on a flat backdrop.
const POSE_RENDER_LAYER = 7;

/**
 * Render the scene from an orthographic camera framing the avatar.
 * Returns enough metadata to unproject 2D pixel coords back to 3D
 * world points lying on the camera's view plane.
 */
function renderAvatarOrtho(
    scene: THREE.Scene,
    cameraPos: THREE.Vector3,
    lookAt: THREE.Vector3,
    frustumWidth: number,
    frustumHeight: number,
    cameraUp: THREE.Vector3 = new THREE.Vector3(0, 1, 0),
    maxCanvasDim = 512,
): OrthoRender {
    // Match canvas aspect to frustum aspect so the avatar doesn't
    // get stretched in either dimension. BlazePose's landmark math
    // assumes natural body proportions — a stretched avatar
    // produces shifted X / Y readings.
    const fAspect = frustumWidth / frustumHeight;
    let canvasWidth, canvasHeight;
    if (fAspect >= 1) {
        canvasWidth = maxCanvasDim;
        canvasHeight = Math.max(64, Math.round(maxCanvasDim / fAspect));
    } else {
        canvasHeight = maxCanvasDim;
        canvasWidth = Math.max(64, Math.round(maxCanvasDim * fAspect));
    }

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const renderer = new THREE.WebGLRenderer({canvas, antialias: true, preserveDrawingBuffer: true});
    renderer.setSize(canvasWidth, canvasHeight, false);
    renderer.setClearColor(0xdddddd, 1.0);

    const dist = cameraPos.distanceTo(lookAt);
    const camera = new THREE.OrthographicCamera(
        -frustumWidth / 2, frustumWidth / 2,
        frustumHeight / 2, -frustumHeight / 2,
        0.01, Math.max(dist * 4, 100),
    );
    camera.position.copy(cameraPos);
    camera.up.copy(cameraUp);
    camera.lookAt(lookAt);
    // Only render objects opted into the pose layer (avatar + lights).
    camera.layers.set(POSE_RENDER_LAYER);
    camera.updateMatrixWorld(true);

    renderer.render(scene, camera);

    // Extract world-space camera-right and camera-up axes for
    // unprojection later.
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();

    setTimeout(() => {
        try {
            renderer.dispose();
        } catch {
            /* ignored */
        }
    }, 12000);

    return {
        canvas,
        frustumWidth,
        frustumHeight,
        cameraCenter: lookAt.clone(),
        cameraRight: right,
        cameraUp: up,
    };
}

/**
 * Unproject a 2D normalized image landmark to a 3D point lying on
 * the camera's view plane. Returns a world-space Vector3 where two
 * coordinates are reliable (those in the view plane) and one is
 * pinned to the view plane itself — the caller fuses across views
 * to recover the third coordinate.
 */
function landmarkToWorldOnPlane(lm: NormalizedLandmark, view: OrthoRender): THREE.Vector3 {
    // Image-space convention: lm.x = 0 → left edge, lm.x = 1 → right
    // edge; lm.y = 0 → top, lm.y = 1 → bottom. World-up = +Y.
    const camLocalX = (lm.x - 0.5) * view.frustumWidth;
    const camLocalY = -(lm.y - 0.5) * view.frustumHeight;
    return view.cameraCenter
        .clone()
        .addScaledVector(view.cameraRight, camLocalX)
        .addScaledVector(view.cameraUp, camLocalY);
}

/**
 * Run BlazePose on a canvas and log the per-landmark visibility /
 * presence scores so we can tell *which* landmarks the model thinks
 * it could see. Visibility < 0.5 is the model saying "I'm guessing".
 */
async function detectImageLandmarks(
    canvas: HTMLCanvasElement,
    viewLabel: string,
): Promise<NormalizedLandmark[] | null> {
    const landmarker = await getLandmarker();
    const t0 = performance.now();
    const result = landmarker.detect(canvas);
    const elapsedMs = (performance.now() - t0).toFixed(1);

    const lms = result.landmarks?.[0];

    console.debug(`[poseFit] detect[${viewLabel}]`, {
        canvas: `${canvas.width}×${canvas.height}`,
        elapsedMs,
        poses: result.landmarks?.length ?? 0,
        landmarks: lms?.length ?? 0,
        worldLandmarks: result.worldLandmarks?.[0]?.length ?? 0,
    });

    if (!lms || lms.length < 29) {
        console.warn(`[poseFit] detect[${viewLabel}] no usable pose`);
        return null;
    }

    // Visibility table for the key joints — lets us spot which
    // limbs the model is *guessing* vs *seeing*.
    const lbl = (i: number, name: string) => ({
        name,
        x: lms[i]!.x.toFixed(3),
        y: lms[i]!.y.toFixed(3),
        z: lms[i]!.z.toFixed(3),
        // `visibility` & `presence` are optional and sometimes absent
        vis: (lms[i] as NormalizedLandmark & {visibility?: number}).visibility?.toFixed(2),
        pres: (lms[i] as NormalizedLandmark & {presence?: number}).presence?.toFixed(2),
    });
    console.debug(`[poseFit] detect[${viewLabel}] landmark table`, [
        lbl(LM.NOSE, "nose"),
        lbl(LM.LEFT_SHOULDER, "L.shoulder"),
        lbl(LM.RIGHT_SHOULDER, "R.shoulder"),
        lbl(LM.LEFT_ELBOW, "L.elbow"),
        lbl(LM.RIGHT_ELBOW, "R.elbow"),
        lbl(LM.LEFT_WRIST, "L.wrist"),
        lbl(LM.RIGHT_WRIST, "R.wrist"),
        lbl(LM.LEFT_HIP, "L.hip"),
        lbl(LM.RIGHT_HIP, "R.hip"),
        lbl(LM.LEFT_KNEE, "L.knee"),
        lbl(LM.RIGHT_KNEE, "R.knee"),
        lbl(LM.LEFT_ANKLE, "L.ankle"),
        lbl(LM.RIGHT_ANKLE, "R.ankle"),
    ]);

    return lms;
}

/**
 * Attach a canvas as a small fixed-position overlay so the developer
 * can see what BlazePose received from each view. Auto-removed after
 * 8 seconds.
 */
function attachDebugCanvas(canvas: HTMLCanvasElement, label: string, offsetRightPx: number): void {
    if (typeof document === "undefined") return;
    // Box is fixed-size square; object-fit:contain keeps each view's
    // aspect intact even when canvases have different proportions.
    canvas.style.cssText =
        `position:fixed; right:${offsetRightPx}px; bottom:8px;` +
        " width:200px; height:200px; border:2px solid magenta;" +
        " z-index:99999; background:#fff; object-fit:contain;";
    canvas.title = label;
    document.body.appendChild(canvas);
    setTimeout(() => {
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }, 10000);
}

/**
 * Multi-view pose detection. Renders the avatar from a front camera
 * (sees X, Y) and a side camera (sees Y, Z), runs BlazePose on each,
 * and triangulates 3D world positions per landmark.
 *
 * If the side view detection fails (BlazePose can be unreliable on
 * profile renders for stylized characters), we fall back to the
 * front view only with Z pinned to the avatar's center plane.
 */
export async function detectPoseMultiView(
    scene: THREE.Scene,
    object: THREE.Object3D,
): Promise<PoseTargets | null> {
    object.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(object);
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());

    const dist = Math.max(size.x, size.y, size.z) * 2.0 + 1.0;
    const margin = 1.25;
    const minDim = 0.5;
    const w = (n: number) => Math.max(n, minDim) * margin;

    // === Isolate the avatar for pose rendering ===
    // Opt the avatar mesh hierarchy AND every scene light into the
    // pose-render layer. The render cameras are restricted to that
    // layer, so the platform, helpers, gizmos, and any debug spheres
    // are excluded. Without this BlazePose tries to interpret the
    // platform as a body part and gives gibberish landmarks.
    const layerSnapshot: Array<{obj: THREE.Object3D; mask: number}> = [];
    const enablePoseLayer = (n: THREE.Object3D) => {
        layerSnapshot.push({obj: n, mask: n.layers.mask});
        n.layers.enable(POSE_RENDER_LAYER);
    };
    object.traverse(enablePoseLayer);
    scene.traverse(n => {
        if ((n as THREE.Light).isLight) enablePoseLayer(n);
    });

    // Replace scene background with a flat grey for the duration of
    // detection — high-contrast skybox / tonemapped HDR backgrounds
    // confuse BlazePose's segmentation.
    const originalBg = scene.background;
    scene.background = new THREE.Color(0xdddddd);

    console.debug("[poseFit] isolation", {
        objectsTagged: layerSnapshot.length,
        avatarBbox: {
            min: bbox.min.toArray().map(n => n.toFixed(2)),
            max: bbox.max.toArray().map(n => n.toFixed(2)),
            size: size.toArray().map(n => n.toFixed(2)),
        },
        cameraDist: dist.toFixed(2),
        frustums: {
            front: [w(size.x).toFixed(2), w(size.y).toFixed(2)],
            side: [w(size.z).toFixed(2), w(size.y).toFixed(2)],
            top: [w(size.x).toFixed(2), w(size.z).toFixed(2)],
        },
    });

    // `landmarker.detect()` is synchronous and blocks the main
    // thread ~100 ms per view. Without explicit yields here the
    // entire pipeline runs in a single frame and the "Detecting
    // skeleton…" overlay never gets a chance to paint. We use
    // setTimeout(0) instead of requestAnimationFrame because rAF
    // can be coalesced; setTimeout always queues a new task.
    const yieldUI = () => new Promise<void>(r => setTimeout(r, 16));

    let frontView: OrthoRender;
    let sideView: OrthoRender;
    let topView: OrthoRender;
    let lmsFront: NormalizedLandmark[] | null = null;
    let lmsSide: NormalizedLandmark[] | null = null;
    let lmsTop: NormalizedLandmark[] | null = null;
    try {
        await yieldUI(); // overlay paints
        frontView = renderAvatarOrtho(
            scene,
            new THREE.Vector3(center.x, center.y, center.z + dist),
            center,
            w(size.x), w(size.y),
        );
        await yieldUI();
        sideView = renderAvatarOrtho(
            scene,
            new THREE.Vector3(center.x + dist, center.y, center.z),
            center,
            w(size.z), w(size.y),
        );
        await yieldUI();
        topView = renderAvatarOrtho(
            scene,
            new THREE.Vector3(center.x, center.y + dist, center.z),
            center,
            w(size.x), w(size.z),
            new THREE.Vector3(0, 0, 1),
        );
        await yieldUI();

        attachDebugCanvas(frontView.canvas, "front", 8);
        attachDebugCanvas(sideView.canvas, "side", 8 + 208);
        attachDebugCanvas(topView.canvas, "top", 8 + 208 * 2);
        await yieldUI();

        // Detect serially with a yield between each so the spinner
        // keeps animating (parallelism inside a synchronous WASM call
        // doesn't actually parallelise — it just serialises with no
        // paint gaps in between).
        lmsFront = await detectImageLandmarks(frontView.canvas, "front");
        await yieldUI();
        lmsSide = await detectImageLandmarks(sideView.canvas, "side");
        await yieldUI();
        lmsTop = await detectImageLandmarks(topView.canvas, "top");
    } finally {
        // Restore everything we touched, even if detection threw.
        for (const s of layerSnapshot) s.obj.layers.mask = s.mask;
        scene.background = originalBg;
    }

    console.debug("[poseFit] multi-view detect summary", {
        frontFound: !!lmsFront,
        sideFound: !!lmsSide,
        topFound: !!lmsTop,
    });

    if (!lmsFront) {
        console.warn("[poseFit] front view: no landmarks");
        return null;
    }

    // Triangulation. Each axis is averaged across whichever views
    // saw it:
    //   X: front + top      (Y is the camera axis in top view)
    //   Y: front + side     (only horizontal views can see Y)
    //   Z: side + top
    // When a view didn't detect, we just use whichever views did.
    // If only front is available, Z and X fall back to the avatar's
    // bbox center plane (== Z-damping fallback).
    const triangulate = (idx: number, label: string): THREE.Vector3 => {
        const fLm = lmsFront[idx];
        const front = fLm ? landmarkToWorldOnPlane(fLm, frontView) : null;
        const sLm = lmsSide?.[idx];
        const side = sLm ? landmarkToWorldOnPlane(sLm, sideView) : null;
        const tLm = lmsTop?.[idx];
        const top = tLm ? landmarkToWorldOnPlane(tLm, topView) : null;

        // X candidates (front.x, top.x)
        const xs: number[] = [];
        if (front) xs.push(front.x);
        if (top) xs.push(top.x);
        // Y candidates (front.y, side.y)
        const ys: number[] = [];
        if (front) ys.push(front.y);
        if (side) ys.push(side.y);
        // Z candidates (side.z, top.z)
        const zs: number[] = [];
        if (side) zs.push(side.z);
        if (top) zs.push(top.z);

        const avg = (arr: number[], fallback: number) =>
            arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : fallback;

        const out = new THREE.Vector3(
            avg(xs, center.x),
            avg(ys, center.y),
            avg(zs, center.z),
        );

        console.debug(`[poseFit]   ${label}`, {
            front: front ? [front.x.toFixed(3), front.y.toFixed(3)] : null,
            side: side ? [side.y.toFixed(3), side.z.toFixed(3)] : null,
            top: top ? [top.x.toFixed(3), top.z.toFixed(3)] : null,
            world: out.toArray().map(n => n.toFixed(3)),
        });
        return out;
    };

    const raw = {
        nose: triangulate(LM.NOSE, "nose"),
        leftShoulder: triangulate(LM.LEFT_SHOULDER, "leftShoulder"),
        rightShoulder: triangulate(LM.RIGHT_SHOULDER, "rightShoulder"),
        leftElbow: triangulate(LM.LEFT_ELBOW, "leftElbow"),
        rightElbow: triangulate(LM.RIGHT_ELBOW, "rightElbow"),
        leftWrist: triangulate(LM.LEFT_WRIST, "leftWrist"),
        rightWrist: triangulate(LM.RIGHT_WRIST, "rightWrist"),
        leftHip: triangulate(LM.LEFT_HIP, "leftHip"),
        rightHip: triangulate(LM.RIGHT_HIP, "rightHip"),
        leftKnee: triangulate(LM.LEFT_KNEE, "leftKnee"),
        rightKnee: triangulate(LM.RIGHT_KNEE, "rightKnee"),
        leftAnkle: triangulate(LM.LEFT_ANKLE, "leftAnkle"),
        rightAnkle: triangulate(LM.RIGHT_ANKLE, "rightAnkle"),
    };

    // Mirror-sanitize the hips. BlazePose can return asymmetric
    // L/R hip X readings on stylized characters — one hip a few
    // centimetres off-axis is enough to tilt the entire leg chain.
    // Force the pair to be a mirror around their X midpoint so the
    // hips line stays perpendicular to the body axis.
    const hipMidX = (raw.leftHip.x + raw.rightHip.x) * 0.5;
    const hipHalfWidth = Math.abs(raw.leftHip.x - hipMidX);
    raw.leftHip.x = hipMidX + hipHalfWidth;
    raw.rightHip.x = hipMidX - hipHalfWidth;
    // Same trick on Y so a one-sided hip drop can't shorten one leg.
    const hipY = (raw.leftHip.y + raw.rightHip.y) * 0.5;
    raw.leftHip.y = hipY;
    raw.rightHip.y = hipY;

    return {
        ...raw,
        bboxMaxY: bbox.max.y,
        bboxMinY: bbox.min.y,
    };
}

/**
 * Scale `child`'s local position so its world position lands at
 * `targetChildWorld` exactly. We don't change rotation — caller is
 * expected to have aimed the parent first so the direction is right;
 * this just adjusts the BONE LENGTH along that direction.
 *
 * Mixamo's stock proportions (long forearm, long thigh, short neck)
 * are wrong for cartoon characters. Aim alone can't fix that — the
 * arm bone overshoots the avatar's elbow, the neck undershoots the
 * head. This function brings each bone segment's length into
 * alignment with the CV-detected joint-to-joint distance.
 */
function scaleBoneToReachTarget(
    bone: THREE.Bone,
    child: THREE.Bone,
    targetChildWorld: THREE.Vector3,
): number {
    bone.updateMatrixWorld(true);
    child.updateMatrixWorld(true);

    const boneWorld = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
    const childWorld = new THREE.Vector3().setFromMatrixPosition(child.matrixWorld);

    const currentDist = boneWorld.distanceTo(childWorld);
    const targetDist = boneWorld.distanceTo(targetChildWorld);
    if (currentDist < 1e-6) return 1;

    const scale = targetDist / currentDist;
    // Clamp tightly to humanoid proportions. Mixamo bone lengths are
    // already close to right after auto-fit; we shouldn't ever need
    // to more than ~1.6× a bone or shrink below 0.6×. The earlier
    // [0.4, 2.5] range let a single noisy CV reading double an arm.
    const clamped = Math.max(0.6, Math.min(1.6, scale));
    if (clamped !== scale) {
        console.debug("[poseFit]   scale clamped", {
            bone: bone.name,
            requested: scale.toFixed(2),
            applied: clamped.toFixed(2),
        });
    }
    child.position.multiplyScalar(clamped);
    child.updateMatrixWorld(true);
    return clamped;
}

/**
 * Rotate `bone` in its parent's local frame so its `child`'s world
 * position lies along `targetWorldDir` (a direction in world space
 * pointing FROM `bone`). The bone's translation is unchanged.
 */
function aimBoneAtDirection(
    bone: THREE.Bone,
    child: THREE.Bone,
    targetWorldDir: THREE.Vector3,
): void {
    bone.updateMatrixWorld(true);
    child.updateMatrixWorld(true);

    const bonePos = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
    const childPos = new THREE.Vector3().setFromMatrixPosition(child.matrixWorld);

    const currentDir = childPos.sub(bonePos);
    if (currentDir.lengthSq() < 1e-8) return;
    currentDir.normalize();

    const goalDir = targetWorldDir.clone();
    if (goalDir.lengthSq() < 1e-8) return;
    goalDir.normalize();
    if (currentDir.dot(goalDir) > 0.9999) return;

    const worldRot = new THREE.Quaternion().setFromUnitVectors(currentDir, goalDir);

    const parentWorldQuat = new THREE.Quaternion();
    if (bone.parent) bone.parent.getWorldQuaternion(parentWorldQuat);
    const parentWorldQuatInv = parentWorldQuat.clone().invert();

    const localRot = parentWorldQuatInv.multiply(worldRot).multiply(parentWorldQuat);
    bone.quaternion.premultiply(localRot);
    bone.updateMatrixWorld(true);
}

const findBone = (bones: THREE.Bone[], suffix: string): THREE.Bone | null => {
    const s = suffix.toLowerCase();
    return bones.find(b => b.name.toLowerCase().endsWith(s)) ?? null;
};

/**
 * Apply pose-derived rotations to the Mixamo skeleton so its limb
 * segments match the detected joint angles.
 */
export function applyPoseToSkeleton(skeleton: THREE.Skeleton, pose: PoseTargets): void {
    const bones = skeleton.bones;

    const midShoulders = pose.leftShoulder.clone().add(pose.rightShoulder).multiplyScalar(0.5);
    // Approximate "neck-base" target: just above the mid-shoulders,
    // matched to the avatar's central frontal plane (Z = midShoulders.z)
    // so a noisy nose-Z reading can't drag the spine forward. The
    // height comes from the nose Y; the X/Z stays put. The earlier
    // version used `midShoulders.lerp(nose, 0.25)` which inherited
    // BlazePose's forward-Z bias and tilted the whole spine.
    const neckBase = new THREE.Vector3(
        midShoulders.x,
        midShoulders.y + (pose.nose.y - midShoulders.y) * 0.25,
        midShoulders.z,
    );
    // Head target: on the same central X / Z axis as the shoulders,
    // at the nose Y. Stops nose-X / nose-Z drift from yanking the
    // head off-axis.
    const headTarget = new THREE.Vector3(midShoulders.x, pose.nose.y, midShoulders.z);

    // Each pair: aim parent so its child world-direction matches
    // `targetDir`, then optionally scale child.position so its world
    // position lands exactly at `childWorldTarget`. Bones without a
    // direct CV target use only aim.
    const pairs: Array<{
        boneSuffix: string;
        childSuffix: string;
        targetDir: THREE.Vector3;
        childWorldTarget?: THREE.Vector3;
    }> = [
        // Neck → Head only. We deliberately SKIP rotating Spine2,
        // because Spine2's children include LeftShoulder and
        // RightShoulder — rotating it cascades into giant compensating
        // rotations on those bones (we saw 152° / 166° on the arms
        // last time). Neck has no arm children, so rotating it can't
        // corrupt the arm chain. The Mixamo auto-fit already keeps
        // the spine vertical, which is the right answer for an
        // upright A-pose anyway.
        {
            boneSuffix: "neck",
            childSuffix: "head",
            targetDir: headTarget.clone().sub(neckBase),
            childWorldTarget: headTarget.clone(),
        },
        // Head → HeadTop_End. BlazePose doesn't return a top-of-head
        // landmark, so we use the avatar mesh bbox max-Y as the
        // target. Without this the Mixamo head-bone dome stops at
        // the nose on big-headed cartoons.
        {
            boneSuffix: "head",
            childSuffix: "headtop_end",
            targetDir: new THREE.Vector3(0, 1, 0),
            childWorldTarget: new THREE.Vector3(
                midShoulders.x,
                pose.bboxMaxY - (pose.bboxMaxY - pose.nose.y) * 0.05,
                midShoulders.z,
            ),
        },
        // Clavicles.
        {
            boneSuffix: "leftshoulder",
            childSuffix: "leftarm",
            targetDir: pose.leftShoulder.clone().sub(midShoulders),
            childWorldTarget: pose.leftShoulder.clone(),
        },
        {
            boneSuffix: "rightshoulder",
            childSuffix: "rightarm",
            targetDir: pose.rightShoulder.clone().sub(midShoulders),
            childWorldTarget: pose.rightShoulder.clone(),
        },
        // Upper arms (shoulder → elbow).
        {
            boneSuffix: "leftarm",
            childSuffix: "leftforearm",
            targetDir: pose.leftElbow.clone().sub(pose.leftShoulder),
            childWorldTarget: pose.leftElbow.clone(),
        },
        {
            boneSuffix: "rightarm",
            childSuffix: "rightforearm",
            targetDir: pose.rightElbow.clone().sub(pose.rightShoulder),
            childWorldTarget: pose.rightElbow.clone(),
        },
        // Forearms (elbow → wrist).
        {
            boneSuffix: "leftforearm",
            childSuffix: "lefthand",
            targetDir: pose.leftWrist.clone().sub(pose.leftElbow),
            childWorldTarget: pose.leftWrist.clone(),
        },
        {
            boneSuffix: "rightforearm",
            childSuffix: "righthand",
            targetDir: pose.rightWrist.clone().sub(pose.rightElbow),
            childWorldTarget: pose.rightWrist.clone(),
        },
        // Upper legs (hip → knee).
        {
            boneSuffix: "leftupleg",
            childSuffix: "leftleg",
            targetDir: pose.leftKnee.clone().sub(pose.leftHip),
            childWorldTarget: pose.leftKnee.clone(),
        },
        {
            boneSuffix: "rightupleg",
            childSuffix: "rightleg",
            targetDir: pose.rightKnee.clone().sub(pose.rightHip),
            childWorldTarget: pose.rightKnee.clone(),
        },
        // Lower legs (knee → ankle).
        {
            boneSuffix: "leftleg",
            childSuffix: "leftfoot",
            targetDir: pose.leftAnkle.clone().sub(pose.leftKnee),
            childWorldTarget: pose.leftAnkle.clone(),
        },
        {
            boneSuffix: "rightleg",
            childSuffix: "rightfoot",
            targetDir: pose.rightAnkle.clone().sub(pose.rightKnee),
            childWorldTarget: pose.rightAnkle.clone(),
        },
    ];

    let applied = 0;
    const skipped: string[] = [];
    for (const {boneSuffix, childSuffix, targetDir, childWorldTarget} of pairs) {
        const bone = findBone(bones, boneSuffix);
        const child = findBone(bones, childSuffix);
        if (!bone || !child) {
            skipped.push(`${boneSuffix}→${childSuffix} (bone:${!!bone} child:${!!child})`);
            continue;
        }

        bone.updateMatrixWorld(true);
        child.updateMatrixWorld(true);
        const beforeBone = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
        const beforeChild = new THREE.Vector3().setFromMatrixPosition(child.matrixWorld);
        const beforeDir = beforeChild.clone().sub(beforeBone).normalize();
        const goalDir = targetDir.clone().normalize();
        const angle = Math.acos(Math.max(-1, Math.min(1, beforeDir.dot(goalDir))));

        aimBoneAtDirection(bone, child, targetDir);
        let scaleApplied = 1;
        if (childWorldTarget) {
            scaleApplied = scaleBoneToReachTarget(bone, child, childWorldTarget);
        }
        applied++;

        if (angle > 0.01 || Math.abs(scaleApplied - 1) > 0.02) {
            console.debug(`[poseFit]   aim+scale ${bone.name}→${child.name}`, {
                fromDir: beforeDir.toArray().map(n => n.toFixed(2)),
                toDir: goalDir.toArray().map(n => n.toFixed(2)),
                angleDeg: (angle * 180 / Math.PI).toFixed(1),
                scale: scaleApplied.toFixed(2),
            });
        }
    }

    skeleton.calculateInverses();
    skeleton.computeBoneTexture?.();

    console.debug("[poseFit] applied pose to skeleton", {
        appliedPairs: applied,
        totalPairs: pairs.length,
        skipped,
    });
}
