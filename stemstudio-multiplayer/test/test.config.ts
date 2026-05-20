import { Server } from "@colyseus/core";
import express from "express";
import cors from "cors";
import { GameRoom } from "../src/rooms/GameRoom";
import ServerConfig from "../src/ServerConfig";

// Initialize the server for testing
const initializeGameServer = async () => {
  const app = express();

  // Add CORS middleware
  app.use(cors());
  app.use(express.json());

  // Get transport and server configuration (without Redis for testing)
  const transport = ServerConfig.getTransport(app);
  const gameServerOptions = ServerConfig.getServerConfig(transport);

  // Create the Colyseus server
  const gameServer = new Server(gameServerOptions);

  // Register the GameRoom for testing
  gameServer.define("my_room", GameRoom);
  gameServer.define("dummy_room", GameRoom);
  gameServer.define("client_test_room", GameRoom);
  gameServer.define("multi_client_room", GameRoom);
  gameServer.define("disconnect_test_room", GameRoom);
  gameServer.define("state_test_room", GameRoom);
  gameServer.define("join_state_room", GameRoom);

  return gameServer;
};

export default { initializeGameServer };