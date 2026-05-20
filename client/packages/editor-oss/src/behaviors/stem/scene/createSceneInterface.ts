import { StemScene } from './StemScene';
import GameManager from '../../game/GameManager';
import { GameObject } from '../core/GameObject';

export const createSceneInterface = (game: GameManager): StemScene => {
    return {
        async addObject(object: GameObject, parent?: GameObject) {
            const threeObject = object._internal.three;
            if (!threeObject) {
                throw new Error('Object does not have a three.js object');
            }

            // Tag runtime-created objects so they are excluded from scene save
            threeObject.userData.isRuntimeOnly = true;

            const parentThree = parent?._internal.three;

            await game.addObject(threeObject, parentThree);
        },
    };
};
