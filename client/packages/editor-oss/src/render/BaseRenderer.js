
/**
 * Module: BaseRenderer.js
 * Purpose: Contains logic for base renderer.
 */


var ID = -1;

class BaseRenderer {
    constructor() {
        this.id = `${this.constructor.name}${ID--}`;
    }

    create(scenes, camera, renderer, selected) {
        return new Promise(resolve => {
            resolve();
        });
    }

    render() {}

    dispose() {}
}

export default BaseRenderer;
