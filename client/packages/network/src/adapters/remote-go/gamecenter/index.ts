import Ajax from "@web-shared/utils/Ajax";
import {backendUrlFromPath} from "@web-shared/utils/UrlUtils";

// Request payload for Game Center authentication
export interface GameCenterAuthRequest {
    player_id: string;
    bundle_id: string;
    public_key_url: string;
    signature: string; // Base64 encoded
    salt: string; // Base64 encoded
    timestamp: number;
    display_name: string;
    avatar_url?: string;
    scene_id?: string;
}

// User information from Game Center auth response
export interface GameCenterUser {
    user_id: string;
    email: string;
    username: string;
    name: string;
    avatar?: string;
    is_new: boolean;
}

// Response from Game Center authentication
export interface GameCenterAuthResponse {
    custom_token: string;
    id_token: string;
    expires_in: number;
    user: GameCenterUser;
}

/**
 * Authenticates a user with Apple Game Center
 * @param request Game Center authentication request data
 * @returns Promise with authentication tokens and user info
 */
export const authenticateWithGameCenter = async (
    request: GameCenterAuthRequest,
): Promise<GameCenterAuthResponse | null> => {
    try {
        const response = await Ajax.post({
            url: backendUrlFromPath("/api/User/HandleGameCenterAuth"),
            data: JSON.stringify(request),
            msgBodyType: "json",
            needAuthorization: false,
        });

        if (response?.data.Code === 200) {
            return response.data.Data as GameCenterAuthResponse;
        } else {
            console.error("Game Center authentication failed:", response?.data.Msg);
            return null;
        }
    } catch (error) {
        console.error("Error during Game Center authentication:", error);
        return null;
    }
};