import PlayerComponent from "./PlayerComponent";
import AIWorldController from "../../controls/AiWorldController/AiWorldController";

class AiWorldControl extends PlayerComponent {
    constructor(app) {
        super(app);
        this.control = null;
    }

    create(scene, camera, renderer, sceneId, player) {
        return this._createControl(scene, camera, renderer, sceneId, player);
    }

    _createControl(scene, camera, renderer, sceneId, player) {
        return new Promise(resolve => {
            this.control = AIWorldController.getInstance(player);
            resolve();
        });
    }

    update(clock, deltaTime) {
        if (this.control && this.control.update) {
            this.control.update(deltaTime);
        }
    }

    dispose() {
        if (this.control) {
            this.control.dispose();
            this.control = null;
        }
    }
}

export default AiWorldControl;
