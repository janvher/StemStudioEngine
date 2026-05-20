
/**
 * Module: MMDAnimator.js
 * Purpose: Contains logic for mmdanimator.
 */


import * as THREE from "three";

import PlayerComponent from "../component/PlayerComponent";

class MMDAnimator extends PlayerComponent {
    constructor(app) {
        super(app);
        this.time = 0.0;
        this.delayTime = 160 * 1 / 30;
    }

    create(scene, camera) {
        var mmds = [];

        scene.traverse(mesh => {
            if (mesh.userData.Type === "pmd" || mesh.userData.Type === "pmx") {
                mmds.push(mesh);
            }
        });

        if (mmds.length === 0) {
            return;
        }

        if (this.helper === undefined) {
            this.helper = new THREE.MMDAnimationHelper();
        }

        var helper = this.helper;

        mmds.forEach(mesh => {
            let animation = mesh._animation;
            let cameraAnimation = mesh._cameraAnimation;
            let audio = mesh._audio;

            if (animation) {
                helper.add(mesh, {
                    animation: animation,
                    physics: true,
                });
            } else {
                helper.add(mesh, {
                    physics: true,
                });
            }

            if (cameraAnimation) {
                helper.add(camera, {
                    animation: cameraAnimation,
                });
            }

            if (audio) {
                var audioParams = {
                    delayTime: this.delayTime,
                };
                helper.add(audio, audioParams);
            }
        });

        this.time = 0.0;

        return new Promise(resolve => {
            resolve();
        });
    }

    update(clock, deltaTime) {
        if (!this.helper) {
            return;
        }

        //     var currentTime = this.helper.audio.context.currentTime - this.helper.audio.startTime;
        //     if (currentTime < this.delayTime) {
        //         this.time += deltaTime;
        //     } else {
        //         var time = this.delayTime + currentTime;
        //         deltaTime = time - this.time;
        //         this.time = time;
        //     }
        // }

        this.helper.update(deltaTime);
    }

    dispose() {
        if (!this.helper) {
            return;
        }

        var helper = this.helper;

        helper.meshes.forEach(n => {
            helper.remove(n);
        });

        if (helper.camera) {
            helper.remove(helper.camera);
        }

        if (helper.audio) {
            if (helper.audio.isPlaying) {
                helper.audio.stop();
            }
            helper.remove(helper.audio);
        }

        delete this.helper;
    }
}

export default MMDAnimator;
