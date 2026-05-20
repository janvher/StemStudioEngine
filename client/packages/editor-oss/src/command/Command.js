/**
 * Module: Command.js
 * Purpose: Contains logic for command.
 */

/**
 *
 * @author dforrer / https://github.com/dforrer
 * Developed as part of a project at University of Applied Sciences and Arts Northwestern Switzerland (www.fhnw.ch)
 * @param {*} editorRef pointer to main editor object used to initialize each command object with a reference to the editor
 * @constructor
 */
class Command {
    constructor(editorRef) {
        this.id = -1;
        this.inMemory = false;
        this.updatable = false;
        this.type = "";
        this.name = "";

        if (editorRef !== undefined) {
            Command.editor = editorRef;
        }
        this.editor = Command.editor;
    }

    undo() {}

    redo() {}

    toJSON() {
        var output = {};
        output.type = this.type;
        output.id = this.id;
        output.name = this.name;
        return output;
    }

    fromJSON(json) {
        this.inMemory = true;
        this.type = json.type;
        this.id = json.id;
        this.name = json.name;
    }
}

export default Command;
