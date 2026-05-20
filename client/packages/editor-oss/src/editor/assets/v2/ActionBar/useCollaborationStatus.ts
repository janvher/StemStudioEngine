import {useEffect, useRef, useState} from "react";

import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import global from "@stem/editor-oss/global";

export type CollaborationStatus = "connected" | "connecting" | "disconnected" | null;

export function useCollaborationStatus(): CollaborationStatus {
    const app = global.app as EngineRuntime;
    const disconnectTokenRef = useRef<string | null>(null);

    const [status, setStatus] = useState<CollaborationStatus>(() => {
        if (!app.editor?.isCollaborative) return null;
        if (app.multiplayerClient?.workerReady) return "connected";
        if (app.multiplayerClient?.workerError) return "disconnected";
        return "connecting";
    });

    useEffect(() => {
        const syncFromClient = () => {
            if (!app.editor?.isCollaborative) {
                setStatus(null);
                return;
            }
            const client = app.multiplayerClient;
            if (client?.workerReady) {
                setStatus("connected");
            } else if (client?.workerError) {
                setStatus("disconnected");
            } else {
                setStatus("connecting");
            }
        };

        syncFromClient();

        app.on("multiplayerConnected.CollaborationStatus", () => {
            setStatus("connected");
            subscribeDisconnect();
        });

        app.on("multiplayerHostStarted.CollaborationStatus", () => {
            setStatus("connected");
        });

        app.on("sceneLoaded.CollaborationStatus", () => {
            if (app.editor?.isCollaborative) {
                setStatus("connecting");
            } else {
                setStatus(null);
            }
        });

        const subscribeDisconnect = () => {
            unsubscribeDisconnect();
            const client = app.multiplayerClient;
            if (client) {
                disconnectTokenRef.current = client.addOnClientDisconnectedListener(() => {
                    setStatus("disconnected");
                });
            }
        };

        const unsubscribeDisconnect = () => {
            if (disconnectTokenRef.current && app.multiplayerClient) {
                app.multiplayerClient.removeOnClientDisconnectedListener(disconnectTokenRef.current);
                disconnectTokenRef.current = null;
            }
        };

        subscribeDisconnect();

        return () => {
            app.on("multiplayerConnected.CollaborationStatus", null);
            app.on("multiplayerHostStarted.CollaborationStatus", null);
            app.on("sceneLoaded.CollaborationStatus", null);
            unsubscribeDisconnect();
        };
    }, [app]);

    return status;
}
