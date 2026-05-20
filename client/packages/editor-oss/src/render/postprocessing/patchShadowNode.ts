import { ShadowNode } from "three/webgpu";

/**
 * Patches ShadowNode.prototype.updateBefore to guard against a null shadowMap.
 *
 * Three.js (as of r183) does not check whether `this.shadowMap` has been
 * created before accessing `this.shadowMap.depthTexture` inside
 * `updateShadow()`.  The shadow map can legitimately be null when:
 *   - The ShadowNode was just constructed but `setup()` has not run yet.
 *   - `_reset()` was called (shadow-type change, CSM toggle) and the node
 *     has not been rebuilt on the current frame.
 *
 * Without this guard the renderer throws:
 *   TypeError: Cannot read properties of null (reading 'depthTexture')
 *
 * The patch is intentionally minimal: skip the update when there is no
 * shadow map and let the normal setup/rebuild path create one on the next
 * frame.
 */
export function patchShadowNode(): void {
	const proto = ShadowNode.prototype as ShadowNode & { shadowMap: unknown };
	const origUpdateBefore = proto.updateBefore;

	proto.updateBefore = function ( frame ) {
		if ( !(this).shadowMap ) return;
		return origUpdateBefore.call( this, frame );
	};
}
