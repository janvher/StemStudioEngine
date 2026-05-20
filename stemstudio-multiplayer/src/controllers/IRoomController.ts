import type { Client } from "@colyseus/core";
import type { Player } from "../rooms/schema/GameRoomState.js";

export default interface IRoomController {
    start(): void;
    dispose(): void;
    onBaseMessage(client: Client, type: string, message: unknown): void;
    onMessage(client: Client, messageType: string, message: unknown): void;
    onPlayerJoined(player: Player): void;
    onPlayerLeft(player: Player): void;
    mergePhysicsDataToSnapshot?(includeRotation?: boolean): void;
    clearClientSelection?(userId: string): void;
    clearAllSelections?(): void;
    updateSceneCollection?(): void;
} // eslint-disable-line semi
