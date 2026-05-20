import { Server } from "@colyseus/core";
import { Scene } from "./models/Scene.js";
import { Types } from "mongoose";
import { GameRoom } from "./rooms/GameRoom.js";

const GAME_CHECK_PACE_MS = 5000;

export default class GameRegistration {
    constructor(
        private gameServerInstance: Server,
        private definedGames: Set<string> = new Set<string>()) {
    }

    public startPeriodicCheck() {
        // Load all scenes that are either multiplayer or collaborative on startup
        setInterval(() => {
            const ids = Array.from(this.definedGames);
            Scene.find({
                $or: [{ IsMultiplayer: true }, { IsCollaborative: true }],
                ID: { $nin: ids.map((id) => new Types.ObjectId(id)) },
            })
                .lean()
                .then((scenes) => {
                    scenes.forEach((scene) => {
                        const sceneId = scene.ID.toString();
                        if (!this.definedGames.has(sceneId)) {
                            console.log("Startup: Registering multiplayer/collaborative scene: " + sceneId);
                            this.gameServerInstance.define(sceneId, GameRoom);
                            this.definedGames.add(sceneId);
                        }
                    });
                })
                .catch((e) => {
                    console.error("ERROR: Failed to load multiplayer/collaborative scenes on startup", e);
                });
        }, GAME_CHECK_PACE_MS);
    }

    /**
     * Check if a scene exists and has IsMultiplayer flag
     */
    public async isValidMultiplayerScene(sceneId: string): Promise<boolean> {
        try {
            // Check if scene exists and has IsMultiplayer flag
            const scene = await Scene.findOne({ ID: new Types.ObjectId(sceneId) }).lean();

            if (!scene) {
                console.warn(`Scene not found: ${sceneId}`);
                return false;
            }

            if (!scene.IsMultiplayer && !scene.IsCollaborative) {
                console.warn(`Scene ${sceneId} is not marked as multiplayer`);
                return false;
            }

            return true;
        } catch (error) {
            console.error(`Error checking scene ${sceneId}:`, error);
            return false;
        }
    }

    /**
     * Dynamically register a scene if it's valid for multiplayer
     */
    public async dynamicRegisterScene(sceneId: string): Promise<boolean> {
        if (this.gameServerInstance) {
            console.error("Game server not initialized yet");
            return false;
        }

        return await this.checkAndRegisterScene(this.gameServerInstance, sceneId);
    }

    /**
     * Dynamically check and register a scene as a multiplayer room if needed
     */
    public async checkAndRegisterScene(gameServer: any, sceneId: string): Promise<boolean> {
        try {
            // Check if already registered
            if (this.definedGames.has(sceneId)) {
                return true;
            }

            // Check if scene is valid for multiplayer
            const isValid = await this.isValidMultiplayerScene(sceneId);
            if (!isValid) {
                return false;
            }

            // Register the room
            console.log(`Dynamically registering multiplayer scene: ${sceneId}`);
            gameServer.define(sceneId, GameRoom);
            this.definedGames.add(sceneId);

            return true;
        } catch (error) {
            console.error(`Error checking scene ${sceneId}:`, error);
            return false;
        }
    }


}