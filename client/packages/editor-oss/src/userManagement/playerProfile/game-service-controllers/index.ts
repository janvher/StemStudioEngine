/**
 * Barrel exports for game service controllers
 */

export {BaseGameServiceController} from "./BaseGameServiceController";
export type {GameServiceSettings, GameServiceControllerOptions} from "./BaseGameServiceController";

export {DiscordController} from "../game-service-controllers/DiscordController";
export {MobileGameServicesController} from "./MobileGameServicesController";

// Guest controller helper exports
export {
    getGuestPlayer,
    registerAnonymousPlayer,
    checkPlayerExists,
    playerIsRegistered,
    playerIsAnonymous,
} from "./GuestController";
