import { Object3D } from 'three';

import { GameObject } from './GameObject';
import GameManager from '../../../behaviors/game/GameManager';
import { createGameObjectPhysics } from '../physics/createGameObjectPhysics';

export const createGameObject = (object: Object3D, game?: GameManager): GameObject => {
    return {
        uuid: object.uuid,
        position: object.position,
        rotation: object.quaternion,
        scale: object.scale,
        get visible() { return object.visible; },
        set visible(value) { object.visible = value; },
        physics: createGameObjectPhysics(object, game),
        _internal: {
            three: object,
        },
    };
};
