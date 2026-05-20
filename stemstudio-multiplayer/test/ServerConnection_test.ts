import assert from "assert";
import { ColyseusTestServer, boot } from "@colyseus/testing";
import { Client } from "@colyseus/core";

// Import test configuration
import testConfig from "./test.config";
import { GameRoomState } from "../src/rooms/schema/GameRoomState";
import { GameRoom } from "../src/rooms/GameRoom";

describe("Colyseus Server Connection and Room Registration Tests", () => {
  let colyseus: ColyseusTestServer;

  before(async () => {
    console.log("Starting Colyseus test server...");
    colyseus = await boot(testConfig);
    console.log("Colyseus test server started successfully");
  });

  after(async () => {
    console.log("Shutting down Colyseus test server...");
    await colyseus.shutdown();
    console.log("Colyseus test server shut down");
  });

  beforeEach(async () => {
    await colyseus.cleanup();
  });

  describe("Server Connection", () => {
    it("should successfully boot the Colyseus server", async () => {
      assert.ok(colyseus, "Colyseus server should be initialized");
      assert.ok(colyseus.server, "Server instance should exist");
    });

    it("should have the correct server configuration", async () => {
      assert.ok(colyseus.server.transport, "Server should have transport configured");
    });
  });

  describe("Room Registration and Connection", () => {
    it("should register and connect to a dummy GameRoom", async () => {
      // Test room options
      const roomOptions = {
        name: "test-room",
        simple: true,
        maxClients: 4,
        user: {
          name: "Test User",
          email: "test@example.com",
          username: "testuser",
          avatar: "default",
          id: "test-user-id"
        },
        token: "test-token",
        isCollaborative: false,
        isAuthRequired: false, // Disable auth for testing
        gravity: -9.81
      };

      // Create room on the server
      console.log("Creating test room...");
      const room = await colyseus.createRoom<GameRoomState>("dummy_room", roomOptions);

      assert.ok(room, "Room should be created successfully");
      assert.strictEqual(room.roomName, "dummy_room", "Room should have correct name");
      assert.ok(room.state, "Room should have state initialized");
      assert.strictEqual(room.state.ready, true, "Room state should be ready");

      console.log(`Room created with ID: ${room.roomId}`);
    });

    it("should connect a client to the room and verify session", async () => {
      const roomOptions = {
        name: "test-room-client",
        simple: true,
        maxClients: 4,
        user: {
          name: "Test Client",
          email: "testclient@example.com",
          username: "testclient",
          avatar: "default",
          id: "test-client-id"
        },
        token: "test-token",
        isCollaborative: false,
        isAuthRequired: false,
        gravity: -9.81
      };

      // Create room
      const room = await colyseus.createRoom<GameRoomState>("client_test_room", roomOptions);

      // Connect client to the room
      console.log("Connecting client to room...");
      const client = await colyseus.connectTo(room, {
        user: roomOptions.user,
        token: "test-token",
        isAuthRequired: false
      });

      // Verify client connection
      assert.ok(client, "Client should connect successfully");
      assert.ok(client.sessionId, "Client should have a session ID");
      assert.strictEqual(client.sessionId, room.clients[0].sessionId, "Client session should match room client");

      // Wait for state synchronization
      await room.waitForNextPatch();

      // Verify client appears in room state
      const playerData = room.state.players.get(client.sessionId);
      assert.ok(playerData, "Player should exist in room state");
      assert.strictEqual(playerData.name, "Test Client", "Player should have correct name");
      assert.strictEqual(playerData.user.email, "testclient@example.com", "Player should have correct email");

      console.log(`Client connected with session ID: ${client.sessionId}`);
      console.log(`Player in room state: ${playerData.name}`);
    });

    it("should handle multiple clients connecting to the same room", async () => {
      const roomOptions = {
        name: "multi-client-room",
        simple: true,
        maxClients: 4,
        user: {
          name: "Host User",
          email: "host@example.com",
          username: "host",
          avatar: "default",
          id: "host-id"
        },
        token: "test-token",
        isCollaborative: false,
        isAuthRequired: false
      };

      // Create room
      const room = await colyseus.createRoom<GameRoomState>("multi_client_room", roomOptions);

      // Connect first client
      const client1 = await colyseus.connectTo(room, {
        user: { name: "Client 1", email: "client1@example.com", username: "client1", avatar: "default", id: "client1-id" },
        token: "test-token",
        isAuthRequired: false
      });

      // Connect second client
      const client2 = await colyseus.connectTo(room, {
        user: { name: "Client 2", email: "client2@example.com", username: "client2", avatar: "default", id: "client2-id" },
        token: "test-token",
        isAuthRequired: false
      });

      // Wait for state sync
      await room.waitForNextPatch();

      // Verify both clients are connected
      assert.strictEqual(room.clients.length, 2, "Room should have 2 clients");
      assert.strictEqual(room.state.players.size, 2, "Room state should have 2 players");

      // Verify individual client data
      const player1 = room.state.players.get(client1.sessionId);
      const player2 = room.state.players.get(client2.sessionId);

      assert.ok(player1, "Player 1 should exist in room state");
      assert.ok(player2, "Player 2 should exist in room state");
      assert.strictEqual(player1.name, "Client 1", "Player 1 should have correct name");
      assert.strictEqual(player2.name, "Client 2", "Player 2 should have correct name");

      console.log(`Multi-client test: ${room.clients.length} clients connected`);
    });

    it("should properly clean up when client disconnects", async () => {
      const roomOptions = {
        name: "disconnect-test-room",
        simple: true,
        maxClients: 4,
        user: {
          name: "Disconnect Test User",
          email: "disconnect@example.com",
          username: "disconnectuser",
          avatar: "default",
          id: "disconnect-user-id"
        },
        token: "test-token",
        isCollaborative: false,
        isAuthRequired: false
      };

      // Create room and connect client
      const room = await colyseus.createRoom<GameRoomState>("disconnect_test_room", roomOptions);
      const client = await colyseus.connectTo(room, {
        user: roomOptions.user,
        token: "test-token",
        isAuthRequired: false
      });

      await room.waitForNextPatch();

      // Verify client is connected
      assert.strictEqual(room.clients.length, 1, "Room should have 1 client");
      assert.strictEqual(room.state.players.size, 1, "Room state should have 1 player");

      // Disconnect client
      await client.leave();

      // Wait a bit for cleanup to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify cleanup
      assert.strictEqual(room.clients.length, 0, "Room should have 0 clients after disconnect");
      assert.strictEqual(room.state.players.size, 0, "Room state should have 0 players after disconnect");

      console.log("Client disconnect and cleanup verified");
    });
  });

  describe("Room State Management", () => {
    it("should properly initialize room state", async () => {
      const roomOptions = {
        name: "state-test-room",
        simple: true,
        maxClients: 2,
        user: {
          name: "State Test User",
          email: "state@example.com",
          username: "stateuser",
          avatar: "default",
          id: "state-user-id"
        },
        token: "test-token",
        isCollaborative: false,
        isAuthRequired: false
      };

      const room = await colyseus.createRoom<GameRoomState>("state_test_room", roomOptions);

      // Check initial state
      assert.ok(room.state, "Room should have state");
      assert.strictEqual(room.state.ready, true, "Room should be ready");
      assert.ok(room.state.players, "Room should have players collection");
      assert.strictEqual(room.state.players.size, 0, "Players collection should be empty initially");

      console.log("Room state properly initialized");
    });

    it("should update state when players join", async () => {
      const roomOptions = {
        name: "join-state-room",
        simple: true,
        maxClients: 4,
        user: {
          name: "Join Test User",
          email: "join@example.com",
          username: "joinuser",
          avatar: "default",
          id: "join-user-id"
        },
        token: "test-token",
        isCollaborative: false,
        isAuthRequired: false
      };

      const room = await colyseus.createRoom<GameRoomState>("join_state_room", roomOptions);

      // Initial state check
      assert.strictEqual(room.state.players.size, 0, "Should start with no players");

      // Connect client
      const client = await colyseus.connectTo(room, {
        user: roomOptions.user,
        token: "test-token",
        isAuthRequired: false
      });

      await room.waitForNextPatch();

      // Verify state update
      assert.strictEqual(room.state.players.size, 1, "Should have 1 player after join");
      const player = room.state.players.get(client.sessionId);
      assert.ok(player, "Player should exist in state");
      assert.strictEqual(player.name, "Join Test User", "Player should have correct name");

      console.log("Player join state update verified");
    });
  });
});