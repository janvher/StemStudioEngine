import type {Object3D} from "three";
import type {PassNode} from "three/webgpu";

type PassNodeFrame = Parameters<PassNode["updateBefore"]>[0];
type PassRenderer = NonNullable<PassNodeFrame["renderer"]>;
type RenderObjectFunction = NonNullable<ReturnType<PassRenderer["getRenderObjectFunction"]>>;

interface PatchPassNodeOptions {
	shouldHideObject?: (object: Object3D) => boolean;
}

/**
 * Patches a PassNode by adding or overriding its updateBefore method. THREE.js v180
 * @param {PassNode} passNode - The PassNode to patch.
 * @param {boolean} [transparent=true] - Whether to render transparent objects.
 * @param {boolean} [opaque=true] - Whether to render opaque objects.
 * @param {boolean} [depthMaterial=false] - Whether to use depth override material.
 * @param {boolean} [forceClear=false] - Whether to force clear the render target.
 * @param {boolean} [renderBackground=true] - Whether to render scene background/backgroundNode in this pass.
 * @param {PatchPassNodeOptions} [options={}] - Extra patch hooks for pass rendering.
 */
export function patchPassNode(
	passNode: PassNode,
	transparent = true,
	opaque = true,
	depthMaterial = false,
	forceClear = false,
	renderBackground = true,
	options: PatchPassNodeOptions = {},
) {
	void depthMaterial;
	void forceClear;
	void renderBackground;

	passNode.opaque = opaque;
	passNode.transparent = transparent;

	const shouldHideObject = options.shouldHideObject;

	if (!shouldHideObject) return;

	const originalUpdateBefore = passNode.updateBefore.bind(passNode);
	let activeRenderer: PassRenderer | null = null;
	let delegateRenderObjectFunction: RenderObjectFunction | null = null;

	const filteredRenderObject: RenderObjectFunction = (
		...args
	) => {
		const [object, scene, camera, geometry, material, group, lightsNode, clippingContext, passId] = args;

		if (shouldHideObject(object)) return;

		if (delegateRenderObjectFunction !== null) {
			delegateRenderObjectFunction(...args);
			return;
		}

		activeRenderer?.renderObject(object, scene, camera, geometry, material, group, lightsNode, clippingContext, passId);
	};

	passNode.updateBefore = function (frame) {
		if (frame == null || frame.renderer === null) {
			return originalUpdateBefore(frame);
		}

		const renderer = frame.renderer;

		delegateRenderObjectFunction = renderer.getRenderObjectFunction();
		activeRenderer = renderer;

		renderer.setRenderObjectFunction(filteredRenderObject);

		try {
			return originalUpdateBefore(frame);
		} finally {
			renderer.setRenderObjectFunction(delegateRenderObjectFunction);
			delegateRenderObjectFunction = null;
			activeRenderer = null;
		}
	};
}
