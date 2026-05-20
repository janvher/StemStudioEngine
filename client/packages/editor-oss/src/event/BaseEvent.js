
/**
 * Module: BaseEvent.js
 * Purpose: Contains logic for base event.
 */


var ID = -1;

class BaseEvent {
    constructor() {
        this.id = `${this.constructor.name}${ID--}`;
    }

    start() {}

    stop() {}

    reset() {}
}

export default BaseEvent;
