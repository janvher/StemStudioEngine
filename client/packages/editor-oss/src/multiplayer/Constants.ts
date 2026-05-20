import {DiscordController} from "../userManagement/playerProfile/game-service-controllers";

export const REACT_APP_MULTIPLAYER_SERVER_URL = DiscordController.isInDiscord()
    ? `wss://${window.location.host}/.proxy/multiplayer`
    : process.env.REACT_APP_MULTIPLAYER_SERVER_URL
      ? process.env.REACT_APP_MULTIPLAYER_SERVER_URL
      : "ws://localhost:2567";
