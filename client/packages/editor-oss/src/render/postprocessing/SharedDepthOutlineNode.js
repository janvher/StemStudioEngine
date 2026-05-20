import OutlineNode from "three/addons/tsl/display/OutlineNode.js";
import {texture, vec4} from "three/tsl";
import {QuadMesh, RendererUtils, Vector2} from "three/webgpu";

const _quadMesh = new QuadMesh();
const _size = new Vector2();
const _blurDirectionX = new Vector2(1.0, 0.0);
const _blurDirectionY = new Vector2(0.0, 1.0);

let _rendererState;

/**
 * Local OutlineNode variant that can reuse an existing scene depth texture.
 * This lets EffectRenderer skip the extra full-scene non-selected depth pass.
 */
class SharedDepthOutlineNode extends OutlineNode {
    constructor(scene, camera, params = {}) {
        const {depthNode = null, depthTexture = null, ...outlineParams} = params;
        super(scene, camera, outlineParams);

        this._externalDepthNode = depthNode;
        this._externalDepthTexture = depthTexture;

        if (depthTexture) {
            this._depthTextureUniform = texture(depthTexture);
        } else if (depthNode) {
            this._depthTextureUniform = depthNode;
        }
    }

    setup(...args) {
        const result = super.setup(...args);

        if (this._externalDepthTexture && this._externalDepthNode) {
            return result.add(vec4(this._externalDepthNode.mul(0.0)));
        }

        return result;
    }

    updateBefore(frame) {
        if (!this._externalDepthNode && !this._externalDepthTexture) {
            return super.updateBefore(frame);
        }

        const {renderer} = frame;
        const {camera, scene} = this;

        _rendererState = RendererUtils.resetRendererAndSceneState(renderer, scene, _rendererState);

        const size = renderer.getDrawingBufferSize(_size);
        this.setSize(size.width, size.height);

        renderer.setClearColor(0xffffff, 1);

        this._updateSelectionCache();

        const currentSceneName = scene.name;

        // The external depth texture already represents scene occluders, so only
        // render the selected-object mask before the edge/blur/composite passes.
        scene.overrideMaterial = this._prepareMaskMaterial;

        renderer.setRenderTarget(this._renderTargetMaskBuffer);
        renderer.setRenderObjectFunction((object, ...params) => {
            if (this._selectionCache.has(object) === true) {
                renderer.renderObject(object, ...params);
            }
        });

        scene.name = "Outline [ Selected Objects Pass ]";
        renderer.render(scene, camera);

        renderer.setRenderObjectFunction(_rendererState.renderObjectFunction);

        this._selectionCache.clear();
        scene.name = currentSceneName;

        _quadMesh.material = this._materialCopy;
        _quadMesh.name = "Outline [ Downsample ]";
        renderer.setRenderTarget(this._renderTargetMaskDownSampleBuffer);
        _quadMesh.render(renderer);

        _quadMesh.material = this._edgeDetectionMaterial;
        _quadMesh.name = "Outline [ Edge Detection ]";
        renderer.setRenderTarget(this._renderTargetEdgeBuffer1);
        _quadMesh.render(renderer);

        this._blurColorTextureUniform.value = this._renderTargetEdgeBuffer1.texture;
        this._blurDirection.value.copy(_blurDirectionX);

        _quadMesh.material = this._separableBlurMaterial;
        _quadMesh.name = "Outline [ Blur Half Resolution ]";
        renderer.setRenderTarget(this._renderTargetBlurBuffer1);
        _quadMesh.render(renderer);

        this._blurColorTextureUniform.value = this._renderTargetBlurBuffer1.texture;
        this._blurDirection.value.copy(_blurDirectionY);

        renderer.setRenderTarget(this._renderTargetEdgeBuffer1);
        _quadMesh.render(renderer);

        this._blurColorTextureUniform.value = this._renderTargetEdgeBuffer1.texture;
        this._blurDirection.value.copy(_blurDirectionX);

        _quadMesh.material = this._separableBlurMaterial2;
        _quadMesh.name = "Outline [ Blur Quarter Resolution ]";
        renderer.setRenderTarget(this._renderTargetBlurBuffer2);
        _quadMesh.render(renderer);

        this._blurColorTextureUniform.value = this._renderTargetBlurBuffer2.texture;
        this._blurDirection.value.copy(_blurDirectionY);

        renderer.setRenderTarget(this._renderTargetEdgeBuffer2);
        _quadMesh.render(renderer);

        _quadMesh.material = this._compositeMaterial;
        _quadMesh.name = "Outline [ Composite ]";
        renderer.setRenderTarget(this._renderTargetComposite);
        _quadMesh.render(renderer);

        RendererUtils.restoreRendererAndSceneState(renderer, scene, _rendererState);
    }
}

export function outline(scene, camera, params = {}) {
    return new SharedDepthOutlineNode(scene, camera, params);
}

export default SharedDepthOutlineNode;