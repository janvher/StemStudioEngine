export interface Feature {
    icon: string;
    title: string;
    body: string;
    href?: string;
}

export const FEATURES: Feature[] = [
    {
        icon: "◇",
        title: "Behavior system",
        body: "Attach reusable, lifecycle-managed behaviors to any object. The engine handles update, dispose, event wiring, and config persistence.",
        href: "/docs/architecture",
    },
    {
        icon: "⌗",
        title: "Lambdas (ECS)",
        body: "Archetype-driven systems on top of behaviors. Dependency-scheduled, batched work for crowds, particles, AI, and procedural content.",
        href: "/docs/architecture",
    },
    {
        icon: "◎",
        title: "Physics",
        body: "Ammo.js and Rapier behind one adapter surface. Drop-in collision shapes, materials, joints, and ray queries without engine-specific code.",
        href: "/docs/architecture",
    },
    {
        icon: "✦",
        title: "AI copilot (BYOK)",
        body: "Pluggable AI provider interface. Bring your own Anthropic, OpenAI, Meshy, or ElevenLabs key — the local Go proxy fronts the calls.",
        href: "/docs/byok",
    },
    {
        icon: "◉",
        title: "Multiplayer",
        body: "Colyseus-based room server runs as a local sidecar. Shared schema, room presence, and authoritative state out of the box.",
        href: "/docs/multiplayer",
    },
    {
        icon: "▤",
        title: "Local-first persistence",
        body: "IndexedDB by default, or a real folder via the File System Access API. Projects round-trip as JSON and stay entirely on your machine.",
        href: "/docs/architecture",
    },
    {
        icon: "▥",
        title: "Server-side storage & version control",
        body: "Storage is an interface, not a backend. Implement ProjectStore and AssetSource to run StemStudio against your own server — with full scene and asset revision history and published-release pinning.",
        href: "/docs/server-side-storage",
    },
    {
        icon: "❖",
        title: "Visually guide the AI",
        body: "Point, select, and frame objects in the viewport, then ask the copilot to author custom behaviors against exactly what you see — scene context comes for free.",
        href: "/docs/byok",
    },
    {
        icon: "▣",
        title: "Pre-built behaviors",
        body: "A library of lifecycle-managed behaviors — character controllers, physics glue, HUD/UIKit, audio, VFX — ready to attach and configure before you write a line.",
        href: "/docs/architecture",
    },
    {
        icon: "◈",
        title: "Multiple model formats",
        body: "Import GLTF/GLB, FBX, OBJ, and more through one loader surface, with Draco and KTX2 compression handled automatically.",
        href: "/docs/architecture",
    },
    {
        icon: "▽",
        title: "LOD support",
        body: "Author level-of-detail tiers per object so distant geometry swaps to lighter meshes — the scheduler picks the tier each frame to hold framerate.",
        href: "/docs/architecture",
    },
    {
        icon: "⁂",
        title: "Gaussian splats",
        body: "Render photoreal captured scenes as 3D Gaussian splats alongside meshes — drop a splat in like any other object.",
        href: "/docs/architecture",
    },
    {
        icon: "⇲",
        title: "Imports & file system",
        body: "Bring in stemscript folders, models, and assets straight from disk via the File System Access API — the dashboard stages a folder and materializes a full project.",
        href: "/docs/architecture",
    },
];

export const HERO_CODE = `// A behavior in StemStudio
import {Behavior} from "@stem/editor-oss";

export class SpinBehavior extends Behavior {
    speed = 1.4;

    update(dt: number) {
        this.gameObject.rotation.y += dt * this.speed;
    }

    onCollide(other) {
        this.erth.audio.play("hit");
        this.erth.fx.spawn("sparks", this.gameObject.position);
    }
}`;
