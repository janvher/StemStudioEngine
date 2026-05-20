
/**
 * Module: BaseHelper.js
 * Purpose: Contains logic for base helper.
 */


var ID = -1;

class BaseHelper {
    constructor() {
        this.id = `${this.constructor.name}${ID--}`;
    }

    
    start() {}

    
    stop() {}
}

export default BaseHelper;
