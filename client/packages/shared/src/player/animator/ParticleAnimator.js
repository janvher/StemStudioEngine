
/**
 * Module: ParticleAnimator.js
 * Purpose: Contains logic for particle animator.
 */


import PlayerComponent from "../component/PlayerComponent";

class ParticleAnimator extends PlayerComponent {
    constructor(app) {
        super(app);
    }

    create(scene, camera, renderer) {
         
        this.scene = scene;

        return new Promise(resolve => {
            resolve();
        });
    }

    update(clock, deltaTime, time) {
         
        var elapsed = clock.elapsedTime;

        this.scene.children.forEach(n => {
            if (n.userData.type === "Fire") {
                n.userData.fire.update(elapsed);
            } else if (n.userData.type === "Smoke") {
                n.update(elapsed);
            } else if (n.userData.type === "Water") {
                n.update();
            } else if (n.userData.type === "ParticleEmitter") {
                n.userData.group.tick(deltaTime);
            }
        });
    }

    dispose() {
        this.scene = null;
    }
}

export default ParticleAnimator;
