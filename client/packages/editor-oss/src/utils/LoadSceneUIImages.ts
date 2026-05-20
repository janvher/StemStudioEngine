import * as THREE from "three";

import gamesStemStudioImage from "./images/game-stem-studio.png";
import goodJobImage from "./images/good-job.gif";
import goodLuckImage from "./images/good-luck.png";
import greetingImage from "./images/greeting.png";
import stemStudioCartoonAnimation from "./images/stem-studio-cartoon-animation.gif";
import timeRemainingImage from "./images/time-remaining.png";
import timesUpImage from "./images/times-up.png";
import youWinImage from "./images/you-win.gif";

class QuestUIBinaryImages {
    scene: THREE.Scene;
    imageEntries: {key: string; path: string}[];

    constructor(scene: THREE.Scene) {
        if (!(scene instanceof THREE.Scene)) {
            throw new Error("Expected a THREE.Scene object");
        }

        this.scene = scene;

        this.imageEntries = [
            {key: "greetingImage", path: greetingImage},
            {key: "goodJobImage", path: goodJobImage},
            {key: "goodLuckImage", path: goodLuckImage},
            {key: "timeRemainingImage", path: timeRemainingImage},
            {key: "timesUpImage", path: timesUpImage},
            {key: "youWinImage", path: youWinImage},
            {key: "gamesStemStudioImage", path: gamesStemStudioImage},
            {key: "stemStudioCartoonAnimation", path: stemStudioCartoonAnimation},
        ];

        this.initializeImages();
    }

    async imageToBase64(imagePath: string): Promise<string> {
        const response = await fetch(imagePath);
        const blob = await response.blob();
        const reader = new FileReader();

        return new Promise((resolve, reject) => {
            reader.onloadend = () => {
                const base64 = reader.result as string;
                resolve(base64);
            };
            reader.onerror = reject;

            reader.readAsDataURL(blob);
        });
    }

    async initializeImages() {
        const imagePromises = this.imageEntries.map(async ({path: imagePath}) => {
            await this.imageToBase64(imagePath);
            //this.scene.userData[key] = base64; // DO NOT USE userData
        });

        await Promise.all(imagePromises);
    }
}

export default QuestUIBinaryImages;
