import { useEffect } from "react";

import { showToast } from "../showToast";

export const OfflineIndicator = () => {
    useEffect(() => {
        if (!import.meta.env.PROD) {
            return;
        }

        const handleOffline = () => {
            showToast({
                type: "warning",
                title: "You are offline",
                body: "Some features may be unavailable until connectivity is restored.",
                duration: 5000,
            });
        };

        const handleOnline = () => {
            showToast({
                type: "info",
                title: "Back online",
                body: "Connection restored.",
                duration: 2500,
            });
        };

        window.addEventListener("offline", handleOffline);
        window.addEventListener("online", handleOnline);

        return () => {
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("online", handleOnline);
        };
    }, []);

    return null;
};
