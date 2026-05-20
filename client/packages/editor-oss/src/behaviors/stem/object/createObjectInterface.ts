import { Object3D } from 'three';

import { StemObject } from './StemObject';
import GameManager from '../../../behaviors/game/GameManager';
import { createGameObject } from '../core/createGameObject';

export const createObjectInterface = (game: GameManager): StemObject => {
    return {
        createFromThreeObject: (object: Object3D) => {
            return createGameObject(object, game);
        },
    };
};
