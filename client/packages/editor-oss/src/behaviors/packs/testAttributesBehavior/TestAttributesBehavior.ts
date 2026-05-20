import Editor from "@stem/editor-oss/editor/Editor";
import { BehaviorBase } from "../../Behavior";
import GameManager from "../../game/GameManager";

class TestAttributesBehavior extends BehaviorBase {

    game: GameManager | null = null;

    init(game: GameManager): void {
        this.game = game;
        console.log("TestAttributesBehavior attributes", this.attributes);
    }

}

export default TestAttributesBehavior;
