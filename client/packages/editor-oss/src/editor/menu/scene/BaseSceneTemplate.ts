/**
 * Module: BaseSceneTemplate.ts
 * Purpose: Contains logic for base scene template.
 */

import I18n from "i18next";
import * as THREE from "three";

import global from "@stem/editor-oss/global";
import Editor from "../../Editor";

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
