import {Object3D, BoxGeometry, MeshBasicMaterial, Mesh} from "three";

import SpawnPointMarker from "./SpawnPointMarker";
import Editor from "@stem/editor-oss/editor/Editor";
import { BehaviorBase } from "../../Behavior";
import GameManager from "../../game/GameManager";

// no need to do anything here, player should check for spawn points
// TODO: add some structure to the spawn points, like a list of spawn points that can be used in the game
class SpawnPointBehavior extends BehaviorBase {

    private editorSelectObject?: Mesh;
    private editorPreviewObject?: Object3D;
    private editor?: Editor;

    init(game: GameManager) {
        this.game = game;
    }

    update(deltaTime: number) {}

    onAdded(): void {}

    onRemoved(): void {}

    onReset() {}

    onEditorAdded(editor: Editor): void {
        this.target.userData.isSpawnPoint = true;

        const target = this.target;
        this.editor = editor;

        this.editorPreviewObject = new SpawnPointMarker(target.position.clone(), target.rotation.clone());
        
        const geometry = new BoxGeometry(1, 1, 1);
        const material = new MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false });
        this.editorSelectObject = new Mesh(geometry, material);

        target.add(this.editorSelectObject);
        editor.sceneHelpers.add(this.editorPreviewObject);
    }

    onEditorRemoved(): void {
        delete this.target.userData.isSpawnPoint;
        this.cleanupEditorObjects();
    }

    onEditorUpdate(): void {
        // TODO: optimize this, it should not be called every frame
        this.editorPreviewObject?.position.copy(this.target.position);
        this.editorPreviewObject?.rotation.copy(this.target.rotation);
    }

    onEditorDispose(): void {
        this.cleanupEditorObjects();
    }

    private cleanupEditorObjects(): void {
        if (this.editorSelectObject) {
            this.target.remove(this.editorSelectObject);
            this.editorSelectObject.geometry.dispose();
            this.editorSelectObject = undefined;
        }

        if (this.editorPreviewObject) {
            this.editor!.sceneHelpers.remove(this.editorPreviewObject);
            this.editorPreviewObject = undefined;
        }
    }

}

export default SpawnPointBehavior;
