import {Scene} from "three";

import {CollaborationClient} from "./CollaborationClient";
import {MULTIPLAYER_EVENTS} from "./MultiplayerEvents";
import MultiplayerWorker from "./MultiplayerWorker.ts?worker";
import SimpleMultiplayerClient from "./SimpleMultiplayerClient";
import global from "@stem/editor-oss/global";
import {ASSET_EVENTS, BEHAVIOR_EVENTS, LAMBDA_EVENTS, SNAPSHOT_EVENTS} from "@stem/editor-oss/physics/common/events";
import {IDispatcher, IPhysics} from "@stem/editor-oss/physics/common/types";
import {showToast} from "@stem/editor-oss/showToast";
import {backendUrlFromPath} from "@stem/editor-oss/utils/UrlUtils";
import {REACT_APP_MULTIPLAYER_SERVER_URL} from "../Constants";

export default class SimpleMultiplayerCollaborativeClient extends SimpleMultiplayerClient {
    isPlayMode: boolean = false;
    collaborationClient: CollaborationClient | null = null;

    constructor(
        userId: string,
        maxClient: number,
        sceneId: string,
        scene: Scene,
        physics: IPhysics | null,
        dispatcher: IDispatcher | null,
        isPlayMode: boolean,
    ) {
        super(userId, maxClient, sceneId, scene, physics, dispatcher);
        this.isPlayMode = isPlayMode;
    }

    public async start(inviteCode?: string): Promise<void> {
        this.workerHandler = new MultiplayerWorker();
        if (this.workerHandler) {
            this.workerHandler.onmessage = this.onCollaborativeMessage;
            this.workerHandler.onerror = error => {
                console.error("Multiplayer collaborative worker error:", error);
                this.workerError = true;
                this.workerReady = false;
            };
            this.workerHandler.onmessageerror = error => {
                console.error("Multiplayer collaborative worker message error:", error);
            };
        }
        this.collaborationClient = new CollaborationClient(this.workerHandler);

        const isCollaborative = !!global.app?.editor?.isCollaborative;
        const isSandbox = !!global.app?.editor?.isSandbox;
        const apiUrl = backendUrlFromPath("/api/", true);

        const user = global.app?.authManager?.getUserData();

        if (!user) {
            showToast({type: "error", body: "User data is not available. Please log in again."});
            throw new Error("User data is not available after multiple attempts.");
        }

        await new Promise<void>((resolve, reject) => {
            this.workerHandler!.postMessage({
                event: MULTIPLAYER_EVENTS.START,
                url: REACT_APP_MULTIPLAYER_SERVER_URL,
                maxClients: this.maxClientsPerRoom,
                sceneId: this.sceneId,
                user: user,
                isAuthRequired: !this.isPlayMode,
                authToken: global.app?.authManager.authToken,
                isCollaborative: (this.isPlayMode && isSandbox) || (!this.isPlayMode && isCollaborative),
                inviteCode: inviteCode,
                apiUrl: apiUrl?.replace("/api/", ""),
                ownerId: global.app?.editor?.projectUserId,
            });
            this.waitWorkerIsReady(resolve, reject, 15000);
        });
    }

    public async terminate(): Promise<void> {
        this.collaborationClient?.terminate();
        this.collaborationClient = null;
        await super.terminate();
    }
    private onCollaborativeMessage = (event: MessageEvent) => {
        const {data} = event;

        // Handle collaboration-specific events first
        switch (data.event) {
            case SNAPSHOT_EVENTS.ADD.OBJECT: {
                const {object} = data;
                this.collaborationClient?.onSnapshotObjectAdd(object);
                return;
            }
            case SNAPSHOT_EVENTS.REMOVE.OBJECT: {
                const {object} = data;
                this.collaborationClient?.onSnapshotObjectRemove(object);
                return;
            }
            case SNAPSHOT_EVENTS.UPDATE.OBJECT: {
                const {object} = data;
                this.collaborationClient?.onSnapshotObjectUpdate(object);
                return;
            }
            case ASSET_EVENTS.ADD: {
                this.collaborationClient?.onAssetAdd();
                return;
            }
            case ASSET_EVENTS.REMOVE: {
                const {assetId} = data;
                this.collaborationClient?.onAssetRemove(assetId as string);
                return;
            }
            case ASSET_EVENTS.UPDATE: {
                const {assetId} = data;
                this.collaborationClient?.onAssetUpdate(assetId as string);
                return;
            }
            case BEHAVIOR_EVENTS.REGISTER.BEHAVIOR: {
                const {behavior} = data;
                this.collaborationClient?.onBehaviorRegistered(behavior);
                return;
            }
            case BEHAVIOR_EVENTS.UNREGISTER.BEHAVIOR: {
                const {behavior} = data;
                this.collaborationClient?.onBehaviorUnregistered(behavior);
                return;
            }
            case BEHAVIOR_EVENTS.UPDATE.BEHAVIOR: {
                const {behavior} = data;
                this.collaborationClient?.onBehaviorUpdated(behavior);
                return;
            }
            case BEHAVIOR_EVENTS.REGISTER.SCRIPT: {
                const {script} = data;
                this.collaborationClient?.onScriptRegistered(script);
                return;
            }
            case BEHAVIOR_EVENTS.UNREGISTER.SCRIPT: {
                const {script} = data;
                this.collaborationClient?.onScriptUnregistered(script);
                return;
            }
            case BEHAVIOR_EVENTS.UPDATE.SCRIPT: {
                const {script} = data;
                this.collaborationClient?.onScriptUpdated(script);
                return;
            }
            case LAMBDA_EVENTS.REGISTER: {
                const {lambda} = data;
                this.collaborationClient?.onLambdaRegistered(lambda);
                return;
            }
            case LAMBDA_EVENTS.UNREGISTER: {
                const {lambda} = data;
                this.collaborationClient?.onLambdaUnregistered(lambda);
                return;
            }
            case LAMBDA_EVENTS.UPDATE: {
                const {lambda} = data;
                this.collaborationClient?.onLambdaUpdated(lambda);
                return;
            }
            case SNAPSHOT_EVENTS.SYNC.CHECK_RESPONSE: {
                const {objectsData} = data;
                this.collaborationClient?.handleSyncCheckResponse(objectsData);
                return;
            }
        }

        // For all other events, delegate to the parent message handler
        // Since the parent's onMessage is private, we need to handle all events here
        this.onMessage(event);
    };
}
