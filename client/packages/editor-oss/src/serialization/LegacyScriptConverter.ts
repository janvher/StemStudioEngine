// import BehaviorConfigRegistry from "src/editor/behaviors/BehaviorConfigRegistry";

export default class LegacyScriptConverter {

    private static functionBindings: { [key: string]: string } = {
        '// In every script user has access to:  "app", "scene", "camera", "renderer", "THREE", "Ammo", "EventBus", "game"': '// Every behavior script has access to: "THREE", "EventBus", "Ammo"',
        "// Execute before scene render": "// Legacy code, moved to onAdded",
        "// Execute after scene render": "// Called on object added, now this.target is available",
        "// Execute after program stopped": "// Called when object removed, this.target is not available",
        
        "const object = scene.getObjectByProperty('uuid', objectUUID);": "",
        "function start() {": "this.onAdded = function() {\r\n\tobject = this.target;\r\n\tinit();",
        "function stop": "this.onRemoved = function",
        "function update(clock, deltaTime)": "this.update = function(deltaTime)",
        "function reset": "this.onReset = function",
        "function onMouseDown": "this.onMouseDown = function",
        "function onMouseUp": "this.onMouseUp = function",
        "function onMouseMove": "this.onMouseMove = function",
        "function onMouseWheel": "this.onMouseWheel = function",
        "function onKeyDown": "this.onKeyDown = function",
        "function onKeyUp": "this.onKeyUp = function",
        "function onKeyPress": "this.onKeyPress = function",
        "function onResize": "this.onResize = function",
    };

    private static header: string = `
// This script automatically converted to the new behavior system.
// You can use this.attributes to access the attributes from behavior creator/editor

let scene = null;
let game = null;
let app = null;
let camera = null;
let renderer = null;
let object = null;
let ajax = null;

// Called when the script is instantiated, 
// this.target is not available yet because the script is not added to the object
this.init = function(gameManager) {
    game = gameManager;
    scene = game.scene;
    app = game.engine;
    camera = game.camera;
    renderer = game.renderer;
    ajax = game.ajax;
}
`;

    private static escapeRegExp(text: string): string {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
    }

    static convert(script: string): string {
        let convertedScript = this.header + script;

        // console.log("Converting old script: ", script);

        Object.keys(this.functionBindings).forEach((key) => {
            const escapedKey = LegacyScriptConverter.escapeRegExp(key);
            const regex = new RegExp(escapedKey, 'g');

            const matches = script.match(regex) || [];
            if (matches.length > 0) {
                console.log("Replacing: ", key, " with: ", this.functionBindings[key]);
            }
            convertedScript = convertedScript.replace(regex, this.functionBindings[key] ?? key);
        });

        // remove const objectUUID = 'uuid';
        convertedScript = convertedScript.replace(/const\s+objectUUID\s*=\s*'[^']*';?\s*/g, '');

        return convertedScript;
    }

}
