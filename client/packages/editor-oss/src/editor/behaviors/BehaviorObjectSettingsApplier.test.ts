import { BoxGeometry, BufferGeometry, Group, Mesh, MeshBasicMaterial, SphereGeometry } from "three";
import { describe, expect, it } from "vitest";

import BehaviorObjectSettingsApplier from "./BehaviorObjectSettingsApplier";
import { BodyShapeType } from "../../physics/common/types";

describe("BehaviorObjectSettingsApplier", () => {
    it("uses sphere collider for sphere primitive when behavior requests capsule", () => {
        const object = new Mesh(new SphereGeometry(1), new MeshBasicMaterial());

        BehaviorObjectSettingsApplier.applyObjectSettings(object, {
            physics: { enabled: true, shape: "capsule" },
        });

        expect(object.userData.physics.shape).toBe(BodyShapeType.SPHERE);
    });

    it("uses box collider for box primitive when behavior requests capsule", () => {
        const object = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());

        BehaviorObjectSettingsApplier.applyObjectSettings(object, {
            physics: { enabled: true, shape: "capsule" },
        });

        expect(object.userData.physics.shape).toBe(BodyShapeType.BOX);
    });

    it("keeps capsule collider for non-primitive geometry", () => {
        const object = new Mesh(new BufferGeometry(), new MeshBasicMaterial());

        BehaviorObjectSettingsApplier.applyObjectSettings(object, {
            physics: { enabled: true, shape: "capsule" },
        });

        expect(object.userData.physics.shape).toBe(BodyShapeType.CAPSULE);
    });

    it("detects primitive geometry on child mesh", () => {
        const group = new Group();
        const child = new Mesh(new SphereGeometry(1), new MeshBasicMaterial());
        group.add(child);

        BehaviorObjectSettingsApplier.applyObjectSettings(group, {
            physics: { enabled: true, shape: "capsule" },
        });

        expect(group.userData.physics.shape).toBe(BodyShapeType.SPHERE);
    });
});
