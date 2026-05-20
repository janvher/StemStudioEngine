
/**
 * Module: PlayerLoader.js
 * Purpose: Contains logic for player loader.
 */


import PlayerComponent from "./PlayerComponent";
import global from "../../global";
import Converter from "../../serialization/Converter";

class PlayerLoader extends PlayerComponent {
    constructor(app) {
        super(app);
    }

    create(physics, jsons, options) {
        return new Converter(physics)
            .fromJson(jsons, {
                // TODO: global.app.options.server is not a player config
                server: global.app.options.server,
                domWidth: options.domWidth,
                domHeight: options.domHeight,
            })
            .then(obj => {
                this.scene = obj.scene;
                return new Promise(resolve => {
                    resolve(obj);
                });
            });
    }

    dispose() {
        // TODO

        this.scene = null;
    }
}

export default PlayerLoader;
