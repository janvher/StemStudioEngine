import Editor from "@stem/editor-oss/editor/Editor";
import { BehaviorBase } from "../../Behavior";
import GameManager from "../../game/GameManager";

class TestBehavior extends BehaviorBase {

    game: GameManager | null = null;

    init(game: GameManager): void {
        this.game = game;
        console.log("[TestBehavior] init", this.id, this.uuid);
    }

    update(deltaTime: number): void {
        if (this.attributes.disableRuntimeUpdate) {
            return;
        }
        console.log("[TestBehavior] update", this.id, this.uuid, deltaTime);
    }

    onStart(): void {
        console.log("[TestBehavior] onStart");
    }

    onStop(): void {
        console.log("[TestBehavior] onStop");
    }

    onReset(): void {
        console.log("[TestBehavior] onReset");
    }

    onAttributesUpdated(): void {
        console.log("[TestBehavior] onAttributesUpdated", this.attributes);
    }

    onEditorAdded(editor: Editor): void {
        console.log("[TestBehavior] onEditorAdded", editor.sceneName);
    }

    onEditorRemoved(): void {
        console.log("[TestBehavior] onEditorRemoved");
    }

    onEditorUpdate(): void {
        if (this.attributes.disableEditorUpdate) {
            return;
        }
        console.log("[TestBehavior] onEditorUpdate");
    }

    onEditorPanelShown(): void {
        console.log("[TestBehavior] onEditorPanelShown");
    }

    onEditorPanelHidden(): void {
        console.log("[TestBehavior] onEditorPanelHidden");
    }

    onEditorAttributesUpdated(): void {
        console.log("[TestBehavior] onEditorAttributesUpdated");
    }
    
    onEditorEvent(msg: string, data: any): void {
        console.log(`[TestBehavior] onEditorEvent: ${msg}`, data);
    }

}

export default TestBehavior;
