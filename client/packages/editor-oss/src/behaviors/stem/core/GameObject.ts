import { Object3D, Quaternion, Vector3 } from 'three';

import { GameObjectPhysics } from '../physics/GameObjectPhysics';

type GameObjectInternal = {
    three?: Object3D;
};

export interface GameObject {
    readonly uuid: string;

    readonly position: Vector3;
    readonly rotation: Quaternion;
    readonly scale: Vector3;

    visible: boolean;

    readonly physics: GameObjectPhysics;

    _internal: GameObjectInternal;
}
