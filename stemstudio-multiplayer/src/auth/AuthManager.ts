import { firebaseService } from "../firebase/firebase.service.js";
import { Scene } from "../models/Scene.js";
import { Types } from "mongoose";
import { Room } from "@colyseus/core";
import { GameRoomState } from "../rooms/schema/GameRoomState.js";

export default class AuthManager {
    public static async verifyUser(
        room: Room<GameRoomState>,
        isAuthRequired: boolean,
        token: string
    ): Promise<boolean> {
        if (!isAuthRequired) return true;
        if (!token) {
            console.error("Authentication token is required.");
            return false;
        }

        try {
            const decodedToken = await firebaseService.verifyIdToken(token);
            if (!decodedToken) {
                console.error("Invalid authentication token.");
                return false;
            }

            const userId = decodedToken.uid;
            const email = decodedToken.email;
            const isAdmin = await this.isUserAdmin(userId);
            if (isAdmin) {
                console.log(`Admin user authenticated: ${decodedToken.email || decodedToken.uid}`);
                return true;
            }
            const scene = await Scene.findOne({
                ID: new Types.ObjectId(room.roomName),
                $or: [{ UserID: userId }, { Collaborators: { $in: [email] } }],
            }).lean();

            if (!scene) {
                console.error(`User ${email} is not a collaborator or owner of scene ${room.roomId}`);
                return false;
            }

            console.log(`User authenticated successfully: ${decodedToken.email || decodedToken.uid}`);
            return true;
        } catch (error) {
            console.error("Authentication error:", error);
            return false;
        }
    }

    /**
     * @param token - Firebase ID token
     * @returns Promise<boolean> - true if user is admin, false otherwise
     */
    public static async isUserAdmin(userId: string): Promise<boolean> {
        if (!userId) {
            console.error("User ID is required to check admin status.");
            return false;
        }

        try {
            // Use the backend API to check admin status
            const { default: GameApi } = await import("../api/GameApi.js");
            const isAdmin = await GameApi.checkAdmin(userId);

            return isAdmin;
        } catch (error) {
            console.error("Error checking admin status:", error);
            return false;
        }
    }
}
