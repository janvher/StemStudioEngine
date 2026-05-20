import EventBus from "@stem/editor-oss/behaviors/event/EventBus";
import { LambdaBase } from "../../LambdaBase";

type PlaySoundData = {
    soundId?: string;
    action?: "play" | "stop";
};

export default class PlaySoundLambda extends LambdaBase {
    update(deltaTime: number = 0.016): void {
        this.processObjects(deltaTime, (_object, data) => {
            const cfg = data as PlaySoundData;
            const soundId = String(cfg.soundId || "").trim();
            if (!soundId) {
                return;
            }

            if (cfg.action === "stop") {
                EventBus.instance.send("game.stop_sound", soundId);
                return;
            }

            EventBus.instance.send("game.playSound", soundId);
        });
    }
}
