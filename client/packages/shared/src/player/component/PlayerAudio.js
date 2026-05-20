
/**
 * Module: PlayerAudio.js
 * Purpose: Contains logic for player audio.
 */


import * as THREE from "three";

import PlayerComponent from "./PlayerComponent";
import {backendUrlFromPath} from "../../utils/UrlUtils";

class PlayerAudio extends PlayerComponent {
    constructor(app) {
        super(app);
        this.audios = [];
    }

    create(scene, camera, renderer) {
         
        this.audios.length = 0;

        scene.traverse(n => {
            if (n instanceof THREE.Audio) {
                this.audios.push(n);
            }
        });

        var loader = new THREE.AudioLoader();

        var promises = this.audios.map(n => {
            return new Promise(resolve => {
                // TODO: global.app.options.server is not a player config
                const url = backendUrlFromPath(n.userData.Url);
                loader.load(
                    url,
                    buffer => {
                        n.setBuffer(buffer);

                        if (n.userData.autoplay) {
                            n.autoplay = n.userData.autoplay;
                            n.play();
                        }

                        resolve();
                    },
                    undefined,
                    () => {
                        console.warn(`PlayerLoader: ${n.userData.Url} loaded failed.`);
                        resolve();
                    },
                );
            });
        });

        return Promise.all(promises);
    }

    dispose() {
        this.audios.forEach(n => {
            if (n.isPlaying) {
                n.stop();
            }
        });

        this.audios.length = 0;
    }
}

export default PlayerAudio;
