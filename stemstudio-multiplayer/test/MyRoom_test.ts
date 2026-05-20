import assert from "assert";
import { ColyseusTestServer, boot } from "@colyseus/testing";

// import test configuration
import testConfig from "./test.config";
import { GameRoomState } from "../src/rooms/schema/GameRoomState";

describe("testing your Colyseus app", () => {
  let colyseus: ColyseusTestServer;

  before(async () => colyseus = await boot(testConfig));
  after(async () => colyseus.shutdown());

  beforeEach(async () => await colyseus.cleanup());

  it("connecting into a room", async () => {
    // Room options for testing
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
      isAuthRequired: false
    };

    // `room` is the server-side Room instance reference.
    const room = await colyseus.createRoom<GameRoomState>("my_room", roomOptions);

    // `client1` is the client-side `Room` instance reference (same as JavaScript SDK)
    const client1 = await colyseus.connectTo(room, {
      user: roomOptions.user,
      token: "test-token",
      isAuthRequired: false
    });

    // make your assertions
    assert.strictEqual(client1.sessionId, room.clients[0].sessionId);

    // wait for state sync
    await room.waitForNextPatch();

    // Test the actual structure of GameRoomState
    const state = client1.state.toJSON();
    assert.ok(state.ready, "Room should be ready");
    assert.ok(state.players, "Room should have players collection");
    assert.strictEqual(typeof state.gameState, "object", "Room should have gameState");
    assert.strictEqual(state.gameState.ended, false, "Game should not be ended");
    assert.strictEqual(state.gameState.score, 0, "Initial score should be 0");
  });
});
