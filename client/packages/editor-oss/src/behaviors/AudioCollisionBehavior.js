/**
 * AudioCollisionBehavior Class
 * This class manages audio collision behavior in the scene.
 * It checks for collisions between objects and triggers audio playback accordingly.
 * userData Properties:
 * - collision_sensitivity: Number - Threshold for collision detection sensitivity.
 * - selected_collision_object: String - Name of the collision object.
 * - soundEnabled: Boolean - Flag indicating whether sound is enabled for the object.
 * - soundUrl: String - URL of the sound file.
 * - soundVolume: Number - Volume level for the sound.
 * - fps_player: global - variable uses control object for player set when FPS controls are enabled
 */
import * as THREE from "three";

class AudioCollisionBehavior {
    /**
     * Constructor for AudioCollisionBehavior class.
     * Initializes properties and starts the animation loop.
     * @param scene
     */
    constructor(scene) {
        // Initialize properties
        this.scene = scene;
        this.objectsWithData = [];
        this.player = null;

        // Bind methods
        this.animate = this.animate.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);

        // Start animation loop
        this.animate();

        // Add event listener for key press
        document.addEventListener("keydown", this.handleKeyPress);
    }

    /**
     * Animation loop function.
     * Checks for objects with data and triggers collision detection.
     */
    animate() {
        requestAnimationFrame(this.animate);
        this.checkForObjectsWithData();
    }

    /**
     * Event handler for key press.
     * Resets collected objects when 'r' key is pressed.
     * @param {object} event - The keydown event object.
     */
    handleKeyPress(event) {
        if (event.key === "r" || event.key === "R") {
            this.resetCollectedObjects();
        }
    }

    /**
     * Checks for objects with data and triggers collision detection.
     */
    checkForObjectsWithData() {
        if (!this.scene || !this.scene.userData) {
            return;
        }

        /**
         *
         * @param obj1
         * @param obj2
         */
        function checkCollision(obj1, obj2) {
            const distance = obj1.position.distanceTo(obj2.position);
            const collisionThreshold = obj2.userData.collision_sensitivity;
            return distance < collisionThreshold;
        }

        if (this.scene && this.scene.userData && this.scene.userData.fps_player) {
            this.player = this.scene.userData.fps_player;
        } else {
            this.player = this.scene.getObjectByName(object.userData.selected_collision_object);
        }

        this.scene.traverse(object => {
            if (object.userData && object.userData.selected_collision_object && object.userData.soundEnabled) {
                if (this.player) {
                    if (checkCollision(this.player, object)) {
                        const soundUrl = object.userData.soundUrl;
                        const soundVolume = object.userData.soundVolume !== undefined ? object.userData.soundVolume : 0;
                        if (soundUrl && object.visible) {
                            const audioListener = new THREE.AudioListener();
                            object.add(audioListener);
                            const audio = new THREE.Audio(audioListener);
                            const audioLoader = new THREE.AudioLoader();
                            audioLoader.load(
                                soundUrl,
                                buffer => {
                                    audio.setBuffer(buffer);
                                    audio.setVolume(soundVolume);
                                    audio.play();
                                    object.visible = false;
                                    object.userData.collected = true;
                                },
                                undefined,
                                error => {
                                    console.error("Failed to load audio file:", error);
                                },
                            );
                        }
                    }
                }
            }
        });
    }

    /**
     * Resets collected objects by making them visible again and removing the audio listener.
     */
    resetCollectedObjects() {
        if (!this.scene || !this.scene.userData) {
            return;
        }
        //this.scene = global.app.editor.scene; enable for Stem Studio usage
        this.scene.traverse(object => {
            if (object.userData && object.userData.collected) {
                object.userData.collected = false;
                object.visible = true;
                const audioListener = object.children.find(child => child instanceof THREE.AudioListener);
                if (audioListener) {
                    object.remove(audioListener);
                }
            }
        });
    }
}

export {AudioCollisionBehavior};
