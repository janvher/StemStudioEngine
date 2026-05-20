import * as THREE from 'three';

export class PlayerBones {
    characterBoneOptions: string[] = [];

    constructor(private player: THREE.Object3D) { }

    getPlayerBones() {
        this.characterBoneOptions = [];
        let hipsBone: THREE.Object3D | null = null;

        this.player.traverse(object => {
            if (object.type === 'Bone') {
                const boneName = object.name.replace('mixamorig', '');
                this.characterBoneOptions.push(boneName);
                if (boneName.toLowerCase() === 'hips') {
                    hipsBone = object;
                }
            }
        });

        return {
            bones: this.characterBoneOptions,
            hipsBone: hipsBone,
        };
    }
}
