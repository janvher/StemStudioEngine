import Ajax from "../utils/Ajax.js";
import Config from "../utils/Config.js";
import axios from "axios";

export interface GameItem {
    ID: string; //'66ad964174ae54cebad10e85',
    Name: string; //'Multiplayer',
    CollectionName: string; //'Scene20240803023025',
    Version: number; //3,
    CreateTime: string; //'2024-08-02 19:30:25',
    UpdateTime: string; //'2024-08-02 19:57:40',
    Thumbnail: string; //'/Upload/File/20240803025740/20240802195740.jpg',
    IsPublic: boolean; //true,
    UserID: string; //'vNBRqDFd56QmJwFpo2sin6QBTn53',
    LockedItems: string; //''
}

export interface LoadGameResult {
    data: unknown[];
    metadata: Record<string, unknown> | null;
}

export default class GameApi {
    static listGames() {
        return new Promise<GameItem[]>((resolve, reject) => {
            const baseUrl = Config.getApiBaseUrl();
            const url = `${baseUrl}/api/Server/Scene/List`;
            // console.log(`Requesting URL: ${url}`);
            Ajax.get({ url: url, needAuthorization: false, timeout: 10000 })
                .then((response) => {
                    const json = response?.data as { Code: number; Data: GameItem[] };
                    // console.log(`Response:`, response);
                    if (json.Code === 200) {
                        resolve(json.Data);
                    } else {
                        console.error("list failed", json);
                        reject("Failed to list games");
                    }
                })
                .catch((e: Error) => {
                    console.error(`Error message: ${e.message}`);
                    reject(e);
                });
        });
    }

    static loadGame(gameId: string): Promise<LoadGameResult> {
        return new Promise<LoadGameResult>((resolve, reject) => {
            const baseUrl = Config.getApiBaseUrl();
            const url = `${baseUrl}/api/Server/Scene/Load?ID=${gameId}`;
            Ajax.get({ url: url, needAuthorization: false, timeout: 10000 })
                .then((response) => {
                    const json = response?.data as { Code: number; Data: unknown[]; Metadata?: Record<string, unknown> };
                    if (json.Code === 200) {
                        resolve({ data: json.Data, metadata: json.Metadata ?? null });
                    } else {
                        console.error("loadGameData failed", json);
                        reject("Failed to fetch game data");
                    }
                })
                .catch((e) => {
                    console.error(`Error: ${e}`);
                    reject(e);
                });
        });
    }

    static async createUpload(token: string): Promise<{ uploadId: string; uploadUrl: string }> {
        const baseUrl = Config.getApiBaseUrl();
        const response = await axios.post(
            `${baseUrl}/api/asset/upload`,
            { contentType: "application/json" },
            { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, timeout: 10000 },
        );
        if (response.status !== 201) {
            throw new Error(`Failed to create upload: ${response.status}`);
        }
        return { uploadId: response.data.upload.id, uploadUrl: response.data.uploadUrl };
    }

    static async uploadData(uploadUrl: string, data: string): Promise<void> {
        const response = await axios.put(uploadUrl, data, {
            headers: { "Content-Type": "application/json" },
            timeout: 30000,
        });
        if (response.status !== 200) {
            throw new Error(`Failed to upload data: ${response.status}`);
        }
    }

    static async createRevision(token: string, sceneId: string, uploadId: string): Promise<void> {
        const baseUrl = Config.getApiBaseUrl();
        const response = await axios.post(
            `${baseUrl}/api/scene/${sceneId}/revision`,
            { uploadId },
            { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, timeout: 10000 },
        );
        if (response.status !== 201) {
            throw new Error(`Failed to create revision: ${response.status}`);
        }
    }

    static checkAdmin(userId: string): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            const baseUrl = Config.getApiBaseUrl();
            const url = `${baseUrl}/api/User/CheckAdmin?userId=${userId}`;
            Ajax.get({ url: url, needAuthorization: false, timeout: 10000 })
                .then((response) => {
                    const json = response?.data as { Code: number; Data: { userId: string; isAdmin: boolean } };
                    if (json.Code === 200) {
                        resolve(json.Data.isAdmin);
                    } else {
                        console.error("checkAdmin failed", json);
                        resolve(false);
                    }
                })
                .catch((e) => {
                    console.error(`Error checking admin status: ${e}`);
                    resolve(false);
                });
        });
    }
}
