import * as THREE from "three";

/**
 * Group Object
 * @class
 * @extends THREE.Group
 * @description A container for grouping objects together
 */
class Group extends THREE.Group {
    /**
     * Create a new Group object
     */
    constructor() {
        super();
        this.name = _t("Group");
    }
}

export default Group;
