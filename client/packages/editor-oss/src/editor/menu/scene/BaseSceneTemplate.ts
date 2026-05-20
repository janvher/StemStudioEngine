/**
 * Module: BaseSceneTemplate.ts
 * Purpose: Contains logic for base scene template.
 */

let ID = -1;

class BaseSceneTemplate {
    id: string;
    constructor() {
        this.id = `${this.constructor.name}${ID--}`;
    }

    
    create() {}

    
    clear() {}
}

export default BaseSceneTemplate;
