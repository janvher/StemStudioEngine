import {t} from "i18next";
import * as THREE from "three";

import Command from "./Command";
import global from "../global";

interface ChildEntry {
    object: THREE.Object3D;
    oldParent: THREE.Object3D | null;
    oldIndex: number;
}

class GroupObjectsCommand extends Command {
    group: THREE.Group;
    parent: THREE.Object3D;
    childEntries: ChildEntry[];
    indexInParent: number;
    prevSelected: THREE.Object3D[];

    constructor(group: THREE.Group, parent: THREE.Object3D, children: THREE.Object3D[], indexInParent = -1) {
        super();
        this.type = "GroupObjectsCommand";
        this.name = t("Group Objects");

        this.group = group;
        this.parent = parent;
        this.indexInParent = indexInParent;
        this.childEntries = children.map(object => ({
            object,
            oldParent: object.parent,
            oldIndex: object.parent ? object.parent.children.indexOf(object) : -1,
        }));

        const editor = global.app?.editor;
        const currentSelection = editor?.selected;
        this.prevSelected = Array.isArray(currentSelection) ? [...currentSelection] : [];
    }

    execute() {
        const app = global.app;
        const editor = app?.editor;

        this.parent.add(this.group);

        if (this.indexInParent >= 0 && this.indexInParent < this.parent.children.length - 1) {
            const children = this.parent.children;
            const currentIndex = children.indexOf(this.group);
            if (currentIndex !== -1 && currentIndex !== this.indexInParent) {
                children.splice(currentIndex, 1);
                children.splice(this.indexInParent, 0, this.group);
            }
        }

        for (const entry of this.childEntries) {
            this.group.attach(entry.object);
        }

        app?.call("objectAdded", this, this.group);
        app?.call("sceneGraphChanged", this);

        editor?.select?.(this.group);

        return {
            message: `GroupObjectsCommand: Grouped ${this.childEntries.length} objects`,
            status: "success",
        };
    }

    undo() {
        const app = global.app;
        const editor = app?.editor;

        for (let i = this.childEntries.length - 1; i >= 0; i--) {
            const entry = this.childEntries[i]!;
            if (!entry.oldParent) continue;
            entry.oldParent.attach(entry.object);
            const siblings = entry.oldParent.children;
            const currentIndex = siblings.indexOf(entry.object);
            if (currentIndex !== -1 && entry.oldIndex >= 0 && currentIndex !== entry.oldIndex) {
                siblings.splice(currentIndex, 1);
                const insertAt = Math.min(entry.oldIndex, siblings.length);
                siblings.splice(insertAt, 0, entry.object);
            }
        }

        if (this.group.parent) {
            this.group.parent.remove(this.group);
        }

        app?.call("sceneGraphChanged", this);

        if (this.prevSelected.length > 0) {
            editor?.select?.(this.prevSelected);
        } else {
            editor?.deselect?.();
        }

        return {
            message: `GroupObjectsCommand: Ungrouped ${this.childEntries.length} objects`,
            status: "success",
        };
    }

}

export {GroupObjectsCommand};
