// Simple test script to verify chat functionality
// This demonstrates how the client would send chat messages

const Client = require('colyseus.js');

async function testChat() {
    const client = new Client.Client('ws://localhost:2567');

    try {
        const room = await client.joinOrCreate('my_room', {
            user: {
                name: "TestUser",
                email: "test@example.com",
                username: "testuser",
                avatar: "avatar_url",
                id: "test123"
            },
            simple: true,
            isCollaborative: false,
            isAuthRequired: false,
            gravity: -9.81,
            maxClients: 4
        });

        console.log('Connected to room:', room.id);

        // Listen for chat messages
        room.onMessage('chat:message', (message) => {
            console.log('Received chat message:', {
                id: message.id,
                senderId: message.senderId,
                message: message.message,
                timestamp: new Date(message.timestamp).toISOString()
            });
        });

        // Wait a moment for connection to stabilize
        setTimeout(() => {
            // Send a chat message using full format
            console.log('Sending chat message (full format)...');
            room.send('simple:chat:message', {
                message: 'Hello, this is a test message using full format!'
            });
        }, 1000);

        setTimeout(() => {
            // Send a chat message using short format
            console.log('Sending chat message (short format)...');
            room.send('s:c:m', {
                message: 'Hello, this is a test message using short format!'
            });
        }, 2000);

        // Keep connection alive for testing
        setTimeout(() => {
            console.log('Disconnecting...');
            room.leave();
        }, 6000);

    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test only if server is available
testChat();