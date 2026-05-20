// Initialize custom logger early in application startup
import {initializeLogger} from "@web-shared/utils/Logger";
import "@web-shared/polyfills";
// Side-effect import: registers FirebaseAuthProvider / Analytics /
// Firestore-backed RemoteDocStore / RemoteProjectStore / AIBackend / copilot
// in the editor-oss factories. Without this the AuthorizationContext
// provider that EngineRuntime.init() mounts inside the Player tree throws
// at first render — getAuthProvider() refuses to silently fall back to
// NullAuthProvider in integrated mode. In OSS builds the same import is a
// no-op via the vite alias to client/oss-stubs/auth-firebase.ts.
import "@web-shared/bootstrap/integrated";
import EngineRuntime from "@web-shared/EngineRuntime";
import {AppEntrypoint, setAppEntrypoint} from "@web-shared/entrypoint";
import {DiscordController} from "@web-shared/userManagement/playerProfile/game-service-controllers/DiscordController";
import {getQueryString} from "@web-shared/utils/QueryStringUtils";
import {createBackendAdapter} from "@stem/network";

setAppEntrypoint(AppEntrypoint.PLAY);

// Unregister service workers when ?nosw=1 is set (e.g. Discord embeds that block SW).
if (getQueryString("nosw") && "serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const reg of registrations) {
            reg.unregister();
        }
    }).catch(() => {});
}

const startPlayer = (_sceneID: string) => {
    const container = document.getElementById("container")!;
    const backendAdapter = createBackendAdapter("play");
    const app = new EngineRuntime(container, {
        server: backendAdapter.server,
        enableCache: true,
        isPlayModeOnly: true,
    });
    void app.init();
};

const start = async () => {
    const pathnameSegments = window.location.pathname.split("/").filter(Boolean);
    const rawPathProjectId = pathnameSegments[0] === "play" ? pathnameSegments[pathnameSegments.length - 1] : null;
    const pathSceneId = rawPathProjectId?.startsWith("id-")
        ? (rawPathProjectId.match(/^id-([^-]+)/)?.[1] ?? rawPathProjectId)
        : rawPathProjectId;

    let sceneID = pathSceneId || getQueryString("sceneID");
    if (DiscordController.isInDiscord()) {
        try {
            const discordAppId = location.host.split(".")[0];
            const mappingResponse = await fetch(`/.proxy/resolveSceneId/${discordAppId}`);
            const mappingData = await mappingResponse.json();
            console.info(`Discord -> Stem Studio Mapping ${JSON.stringify(mappingData)}`);
            sceneID = mappingData["game_id"];
        } catch (error) {
            alert("Error while loading the project: " + error);
            console.error("Error while loading the project: " + error);
        }
    }

    if (sceneID) {
        startPlayer(sceneID);
    }
};

initializeLogger(); // Uses environment-based defaults

void start();
