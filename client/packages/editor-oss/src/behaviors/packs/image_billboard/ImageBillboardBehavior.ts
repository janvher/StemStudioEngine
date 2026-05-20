import * as THREE from "three";
import {Material, Mesh} from "three";

import {isAssetRef} from "@stem/editor-oss/asset-management/AssetRef";
import {showToast} from "@stem/editor-oss/showToast";
import {THREE_GetGifTexture} from "@stem/editor-oss/utils/GifTexture";
import {BehaviorBase, BehaviorOptions} from "../../Behavior";
import ScalingImageMaterial from "../shared/ScalingImageMaterial";

type SourceType = "internal" | "external";
class ImageBillboardBehavior extends BehaviorBase {
    private originalMaterial: Material | Material[] | null = null;
    private originalScale: THREE.Vector3 | null = null;
    private targetMesh?: THREE.Mesh;
    private currentTexture?: THREE.Texture;
    private currentUrl?: string;
    game: any = null;

    constructor(target: THREE.Object3D, id: string, options: BehaviorOptions) {
        super(target, id, options);
    }

    init(gameManager: any) {
        this.game = gameManager;
    }

    onAdded(): void {
        if (!this.target) return;

        let mesh =
            this.target instanceof THREE.Mesh
                ? this.target
                : (this.target.children.find(c => c instanceof THREE.Mesh) as THREE.Mesh);

        if (!mesh) {
            mesh = this.createPlaceholderMesh();
            this.target.add(mesh);
        }

        mesh.userData.isBillboardContent = true;
        mesh.userData.isSelectable = false;
        mesh.userData.isRuntimeOnly = true;

        this.targetMesh = mesh;
        this.originalMaterial = mesh.material;

        this.createMaterial();
    }

    onEditorAttributesUpdated(): void {
        console.log("ImageBillboardBehavior onEditorAttributesUpdated");

        const imageAsset = this.attributes.imageAsset;
        const currentAssetUrl = imageAsset && isAssetRef(imageAsset) ? `asset:${imageAsset.assetId}` : null;
        const {url} = this.getUrl();
        const effectiveUrl = currentAssetUrl || url;
        const needsReload = !this.targetMesh || !this.currentTexture || effectiveUrl !== this.currentUrl;

        if (needsReload) {
            this.dispose();
            this.onAdded();
        } else {
            const rotate = this.attributes["rotate"] || 0;
            // const fit = this.attributes["fit"] || "cover";

            if (this.targetMesh && this.currentTexture) {
                const aspect = this.getAspectRatioFromTexture(this.currentTexture);
                const material = ScalingImageMaterial.createMaterial(
                    this.currentTexture,
                    aspect,
                    rotate * Math.PI / 180,
                );
                this.targetMesh.material = material;
            }
        }
    }

    private getAspectRatioFromTexture(texture: THREE.Texture): number {
        let imgWidth = 1;
        let imgHeight = 1;

        if ((texture as any).gif) {
            imgWidth = (texture as any).gif.width || 1;
            imgHeight = (texture as any).gif.height || 1;
        } else if (texture.image) {
            imgWidth = (texture.image as HTMLImageElement).width || 1;
            imgHeight = (texture.image as HTMLImageElement).height || 1;
        }

        return this.getAspectRatio(imgWidth, imgHeight);
    }

    onEditorAdded() {
        this.dispose();
        this.onAdded();
    }

    onRemoved(): void {
        this.dispose();
    }

    dispose() {
        super.dispose();

        if (this.targetMesh && this.originalMaterial) {
            this.targetMesh.material = this.originalMaterial;
        }

        if (this.targetMesh && this.originalScale) {
            this.targetMesh.scale.copy(this.originalScale);
        }

        this.currentTexture = undefined;
        this.currentUrl = undefined;
    }

    onReset() {}

    private disposeMaterial(material: THREE.Material | THREE.Material[]) {
        if (Array.isArray(material)) {
            material.forEach(mat => {
                if ((mat as any).map) (mat as any).map.dispose();
                mat.dispose();
            });
        } else {
            if ((material as any).map) (material as any).map.dispose();
            material.dispose();
        }
    }

    private async createMaterial(): Promise<void> {
        if (!this.targetMesh) return;

        // Try asset-based image first if one is set
        const imageAsset = this.attributes.imageAsset;
        if (imageAsset && isAssetRef(imageAsset)) {
            try {
                const texture = await this.stem.asset.image.createTexture(imageAsset);
                const rotate = this.attributes["rotate"] || 0;
                const aspect = this.getAspectRatioFromTexture(texture);
                const material = ScalingImageMaterial.createMaterial(texture, aspect, rotate * Math.PI / 180);
                this.targetMesh.material = material;
                this.currentTexture = texture;
                this.currentUrl = `asset:${imageAsset.assetId}`;
                return;
            } catch (err) {
                console.error("Image BB: failed to load asset texture, falling back to URL", err);
            }
        }

        const {url, source} = this.getUrl();
        // const fit = this.attributes["fit"] || "cover";
        const rotate = this.attributes["rotate"] || 0;

        if (!url) return;

        if (url.toLowerCase() === "none") {
            this.disposeMaterial(this.targetMesh.material);
            this.targetMesh.material = new THREE.MeshBasicMaterial({
                color: 0x808080,
                side: THREE.DoubleSide,
            });
            this.currentTexture = undefined;
            this.currentUrl = undefined;
            return;
        }

        try {
            let material: THREE.Material;
            let texture: THREE.Texture;

            if (url.toLowerCase().endsWith(".gif")) {
                const gifTexture = await THREE_GetGifTexture(url);
                texture = gifTexture;
                const aspect = this.getAspectRatio(gifTexture.gif.width ?? 1, gifTexture.gif.height ?? 1);
                material = ScalingImageMaterial.createMaterial(texture, aspect, rotate * Math.PI / 180);
            } else {
                texture = await this.loadTexture(url, source);

                texture.colorSpace = THREE.SRGBColorSpace;
                const aspect = this.getAspectRatio(
                    (texture.image as HTMLImageElement).width,
                    (texture.image as HTMLImageElement).height,
                );
                material = ScalingImageMaterial.createMaterial(texture, aspect, rotate * Math.PI / 180);
            }

            this.targetMesh.material = material;

            this.currentTexture = texture;
            this.currentUrl = url;
        } catch (err) {
            console.error("Image BB: failed to load texture", err);
            this.disposeMaterial(this.targetMesh.material);
            this.targetMesh.material = new THREE.MeshBasicMaterial({
                color: 0x808080,
                side: THREE.DoubleSide,
            });
            this.currentTexture = undefined;
            this.currentUrl = undefined;
        }
    }

    private async loadTexture(url: string, source: SourceType): Promise<THREE.Texture> {
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin("anonymous");

        const tryLoad = (urlToLoad: string): Promise<THREE.Texture> =>
            new Promise((resolve, reject) => {
                loader.load(
                    urlToLoad,
                    texture => resolve(texture),
                    undefined,
                    err => reject(err),
                );
            });

        try {
            return await tryLoad(url);
        } catch (err) {
            if (url.toLowerCase() === "none") return Promise.reject(err);

            const fallbackUrl =
                source === "external" ? this.attributes["internal_url"] : this.attributes["external_url"];

            if (fallbackUrl && fallbackUrl !== url) {
                try {
                    console.warn(`Trying fallback texture from ${fallbackUrl}`);
                    showToast({
                        title: source === "external" ? "Cannot load image from URL" : "Cannot Load local image",
                        type: "error",
                    });
                    showToast({
                        title:
                            source === "external"
                                ? "Trying to use local image as fallback..."
                                : "Trying to use URL as fallback",
                        type: "info",
                    });

                    return await tryLoad(fallbackUrl);
                } catch {
                    return Promise.reject(err);
                }
            }

            return Promise.reject(err);
        }
    }

    private getAspectRatio(imgWidth: number, imgHeight: number): number {
        if (!((this.targetMesh as any) instanceof Mesh)) return 1;
        const mesh = this.targetMesh as Mesh;
        mesh.geometry.computeBoundingBox();
        const size = mesh.geometry.boundingBox!.getSize(new THREE.Vector3());
        const geoAspect = this.attributes["aspect"] || size.x / size.z;
        const imgAspect = imgWidth / imgHeight;
        return this.attributes["fit"] === "cover" ? imgAspect / geoAspect : geoAspect / imgAspect;
    }

    private createPlaceholderMesh(): THREE.Mesh {
        const geometry = new THREE.BoxGeometry(10, 10, 0.001);
        const material = new THREE.MeshBasicMaterial({color: 0x808080, side: THREE.DoubleSide});
        return new THREE.Mesh(geometry, material);
    }

    getUrl(): {url: string; source: SourceType} {
        const useLocal = this.attributes["useLocalFile"];
        const internal = this.attributes["internal_url"];
        const external = this.attributes["external_url"];

        const [url, source] = useLocal
            ? [internal || external, internal ? "internal" : "external"]
            : [external || internal, external ? "external" : "internal"];

        if (url.toLowerCase() === "none") return {url, source: source as SourceType};

        try {
            const parsed = new URL(url);
            if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
                showToast({title: "Incorrect protocol in URL: ", body: "none", type: "error"});
            }
        } catch {
            showToast({title: "Incorrect image URL: ", body: url, type: "error"});
        }
        return {url, source: source as SourceType};
    }
}

export default ImageBillboardBehavior;
