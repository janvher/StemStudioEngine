import {t} from "i18next";

import {AddObjectCommand} from "../AddObjectCommand";
import Command from "../Command";
import type {AnnotationBase} from "../../object/annotation/AnnotationBase";
import global from "../../global";

/**
 * AddAnnotationCommand — puts an annotation into the scene tree with full
 * undo/redo. Delegates to AddObjectCommand so the standard add/remove event
 * path fires and collaboration picks up the new object through the scene
 * serializer.
 */
export class AddAnnotationCommand extends Command {
    private annotation: AnnotationBase;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private addCommand: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private removeCommand: any;

    constructor(annotation: AnnotationBase) {
        super();
        this.type = "AddAnnotationCommand";
        this.name = t(`Add ${annotation.annotationType} annotation`);
        (this as any).editor = global?.app?.editor;
        this.annotation = annotation;
        this.addCommand = null;
        this.removeCommand = null;
    }

    async execute() {
        try {
            const editor: any = (this as any).editor ?? global?.app?.editor;
            const parent = editor?.scene ?? null;
            this.addCommand = new AddObjectCommand(this.annotation, parent);
            await this.addCommand.execute();
            return {
                message: `${this.name}`,
                status: "success",
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {message: `${this.name} failed: ${message}`, status: "error"};
        }
    }

    undo() {
        if (this.addCommand) {
            // AddObjectCommand supports undo by removing the added object.
            this.addCommand.undo();
        }
        return {message: `${this.name} undone`, status: "success"};
    }

    toJSON() {
        const output: any = Command.prototype.toJSON.call(this);
        output.annotationUuid = this.annotation.uuid;
        output.annotationType = this.annotation.annotationType;
        return output;
    }

    fromJSON(json: any) {
        Command.prototype.fromJSON.call(this, json);
        // Rehydration requires the annotation to already live in the scene
        // (typical after a scene load). We look it up by uuid.
        const obj = (this as any).editor?.objectByUuid?.(json.annotationUuid);
        if (obj) this.annotation = obj;
    }
}
