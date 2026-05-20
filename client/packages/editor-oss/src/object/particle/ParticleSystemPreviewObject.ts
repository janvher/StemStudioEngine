import {
    BufferGeometry,
    BoxGeometry,
    CircleGeometry,
    CylinderGeometry,
    LineBasicMaterial,
    LineSegments,
    PlaneGeometry,
    SphereGeometry,
    TorusGeometry,
    WireframeGeometry,
} from "three";
import {ConeEmitter, DonutEmitter, ParticleSystem, SphereEmitter} from "three.quarks";

import {getPhysics} from "@stem/editor-oss/physics/common/getPhysics";
import global from "@stem/editor-oss/global";

type ParticleSystemLike = Pick<ParticleSystem, "emitterShape">;

/**
 * Generates a wireframe geometry that represents the emitter shape
 * This preview should match the actual particle emission volume/surface
 * @param particleSystem - The particle system to generate geometry for
 * @returns BufferGeometry representing the emitter shape
 */
export function generateEmitterGeometry(particleSystem: ParticleSystemLike) {
    let geo: BufferGeometry;
    const shape = particleSystem.emitterShape;
    switch (shape.type) {
        case "point":
            // Point emitter - small sphere to indicate position
            geo = new SphereGeometry(1, 8, 6);
            break;

        case "circle": {
            // Circle emitter - flat disc
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const circle = shape as any;
            const radius = circle.radius || 1;
            const thickness = circle.thickness || 2;
            const useThickness = thickness >= 2 || thickness <= 0;
            let finalRadius = useThickness ? radius * thickness - radius : radius;
            if (Math.abs(thickness) < 1 && Math.abs(thickness) >= 0) {
                finalRadius = radius + radius * thickness;
            }

            geo = new CircleGeometry(finalRadius, 32);
            geo.rotateX(Math.PI / 2); // Make it horizontal
            break;
        }

        case "cone": {
            // Cone emitter - conical frustum showing emission direction and spread
            // Particles emit upward (+Y), so narrow end should be at bottom
            const cone = shape as ConeEmitter;
            const radius = cone.radius || 1;
            //const thickness = cone.thickness || 2;
            const angle = cone.angle || 0;

            // Apply thickness logic similar to circle
            //const useThickness = thickness >= 2 || thickness <= 0;
            //let finalRadius = useThickness ? radius * thickness - radius : radius;
            let finalRadius = radius;
            //if (Math.abs(thickness) < 1 && Math.abs(thickness) >= 0) {
            //finalRadius = radius + radius * thickness;
            //}

            const height = cone.arc;
            const topRadius = finalRadius * (1 + Math.tan(angle));
            // Create cone with narrow end at bottom and wide end at top
            geo = new CylinderGeometry(finalRadius, topRadius, height, 16, 1, true);
            geo.translate(0, -height / 2, 0);
            break;
        }

        case "donut": {
            // Donut/torus emitter - ring shape
            const donut = shape as DonutEmitter;
            const radius = donut.radius || 1;
            const donutRadius = donut.donutRadius || 0.1;
            const thickness = donut.thickness || 2;

            // Apply thickness logic to donut radius (tube thickness)
            const useThickness = thickness >= 2 || thickness <= 0;
            let finalDonutRadius = useThickness ? donutRadius * thickness - donutRadius : donutRadius;
            if (Math.abs(thickness) < 1 && Math.abs(thickness) >= 0) {
                finalDonutRadius = donutRadius + donutRadius * thickness;
            }

            geo = new TorusGeometry(radius, finalDonutRadius, 16, 32, donut.arc || Math.PI * 2);
            geo.rotateX(Math.PI / 2);
            break;
        }

        case "sphere": {
            // Sphere emitter - particles emit from sphere surface or volume
            const sphere = shape as SphereEmitter & {thickness?: number};
            const radius = sphere.radius || 1;
            const thickness = sphere.thickness || 2;

            // Apply thickness logic
            const useThickness = thickness >= 2 || thickness <= 0;
            let finalRadius = useThickness ? radius * thickness - radius : radius;
            if (Math.abs(thickness) < 1 && Math.abs(thickness) >= 0) {
                finalRadius = radius + radius * thickness;
            }

            geo = new SphereGeometry(finalRadius, 16, 12);
            break;
        }

        case "hemisphere": {
            // Hemisphere - half sphere
            // Particles emit upward, so hemisphere should face up (show bottom half)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const hemisphere = shape as any;
            const radius = hemisphere.radius || 1;
            const thickness = hemisphere.thickness || 2;

            // Apply thickness logic
            const useThickness = thickness >= 2 || thickness <= 0;
            let finalRadius = useThickness ? radius * thickness - radius : radius;
            if (Math.abs(thickness) < 1 && Math.abs(thickness) >= 0) {
                finalRadius = radius + radius * thickness;
            }

            // phiStart = Math.PI/2 (start from equator), phiLength = Math.PI/2 (cover bottom half)
            geo = new SphereGeometry(finalRadius, 16, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
            break;
        }

        case "grid": {
            // Grid emitter - regular grid of emission points
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const grid = shape as any;
            const width = grid.width || 1;
            const height = grid.height || 1;
            const thickness = grid.thickness || 2;

            // Apply thickness logic to width and height
            const useThickness = thickness >= 2 || thickness <= 0;
            let finalWidth = useThickness ? width * thickness - width : width;
            let finalHeight = useThickness ? height * thickness - height : height;
            if (Math.abs(thickness) < 1 && Math.abs(thickness) >= 0) {
                finalWidth = width + width * thickness;
                finalHeight = height + height * thickness;
            }

            geo = new PlaneGeometry(finalWidth, finalHeight, 8, 8);
            geo.rotateX(Math.PI / 2);
            break;
        }

        case "rectangle": {
            // Rectangle emitter - flat rectangular area
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rect = shape as any;
            const width = rect.width || 1;
            const height = rect.height || 1;
            const thickness = rect.thickness || 2;

            // Apply thickness logic to width and height
            const useThickness = thickness >= 2 || thickness <= 0;
            let finalWidth = useThickness ? width * thickness - width : width;
            let finalHeight = useThickness ? height * thickness - height : height;
            if (Math.abs(thickness) < 1 && Math.abs(thickness) >= 0) {
                finalWidth = width + width * thickness;
                finalHeight = height + height * thickness;
            }

            geo = new PlaneGeometry(finalWidth, finalHeight);
            geo.rotateX(Math.PI / 2);
            break;
        }

        case "mesh_surface": {
            // Mesh surface emitter - uses mesh geometry
            // Show a bounding box as placeholder since we don't have the mesh here
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const meshSurface = shape as any;
            const size = meshSurface.geometry ? 1 : 0.5;
            geo = new BoxGeometry(size, size, size);
            break;
        }

        default:
            // Fallback for unknown types
            console.warn(`Unknown emitter shape type: ${shape.type}`);
            geo = new SphereGeometry(1, 8, 6);
            break;
    }

    return geo;
}

export class ParticleSystemPreviewObject extends LineSegments<BufferGeometry, LineBasicMaterial> {
    particleSystem: ParticleSystem;

    constructor(particleSystem?: ParticleSystem) {
        super(new WireframeGeometry(particleSystem ? generateEmitterGeometry(particleSystem) : undefined));
        this.particleSystem = particleSystem!;
        (this as {type: string}).type = "ParticleSystemPreview";
        //this.material.depthTest = false;
        this.material.opacity = 0.25;
        this.material.transparent = true;
        this.material.color.setRGB(0.0, 1.0, 0.0);
        this.rotation.x = -Math.PI / 2;
        this.userData.isRuntimeOnly = true;
        this.userData.isSelectable = false;
        this.userData.physics = getPhysics({enabled: false});
        this.castShadow = false;
        this.receiveShadow = false;
        this.userData.shadow = {
            castShadow: false,
            receiveShadow: false,
        };

        this.listenForGameStarted();
    }

    copy(source: this, recursive?: boolean) {
        super.copy(source, recursive);
        this.particleSystem = source.particleSystem;
        this.geometry = new WireframeGeometry(generateEmitterGeometry(source.particleSystem));

        return this;
    }

    set selected(value: boolean) {
        if (value) {
            this.material.color.setRGB(1.0, 1.0, 1.0);
        } else {
            this.material.color.setRGB(0.0, 1.0, 0.0);
        }
    }

    hide() {
        this.material.visible = false;
    }

    show() {
        this.material.visible = true;
    }

    update() {
        if (this.geometry) this.geometry.dispose();
        this.geometry = new WireframeGeometry(generateEmitterGeometry(this.particleSystem));
    }

    private listenForGameStarted() {
        const app = global.app;
        if (app?.isPlaying) {
            this.hide();
        }

        app?.on(`playerInit.ParticleSystemPreviewObject${this.uuid}`, () => {
            this.hide();
            //this.removeFromParent();
        });
    }
}
