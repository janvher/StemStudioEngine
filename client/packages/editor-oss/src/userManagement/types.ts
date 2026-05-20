export type PlayerNetwork =
    | "steam"
    | "crazygames"
    | "gameCenter"
    | "googlePlay"
    | "discord"
    | "firebase"
    | "anonymous"
    | "email"
    | "guest";

export interface IUser {
    id: string;
    name?: string;
    email: string | null;
    firebaseId?: string | null;
    avatar: string | null;
    avatarUrl?: string | null;
    username: string | null;
    token?: string | null; // Firebase ID token
    isGuest?: boolean;
    platform: PlayerNetwork;
}

// Type alias for game service user
export type GameServiceUser = IUser;

// Steam player type
export interface SteamPlayer {
    steam_id: string;
    persona_name: string;
    auth_ticket?: string;
    avatar_url?: string;
}
