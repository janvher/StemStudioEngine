
/**
 * Module: PlayerComponent.js
 * Purpose: Contains logic for player component.
 */


var ID = -1;

class PlayerComponent {
    constructor(app) {
        this.id = `${this.constructor.name}${ID--}`;
        this.app = app;
    }
}

export default PlayerComponent;
