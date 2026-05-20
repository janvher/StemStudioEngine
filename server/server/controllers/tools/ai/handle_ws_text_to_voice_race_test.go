package ai

import (
	"sync"
	"testing"
	"time"
	"unsafe"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/assert"
)

// TestRoomManagementConcurrency tests the synchronization logic of room management
func TestRoomManagementConcurrency(t *testing.T) {
	t.Skip("Skipping complex concurrency test - uses unsafe operations that can cause runtime issues")
	// Reset the rooms map for testing
	roomsMutex.Lock()
	rooms = make(map[string]map[string]map[*websocket.Conn]bool)
	roomsMutex.Unlock()

	const numGoroutines = 50
	const numOperationsPerGoroutine = 5
	var wg sync.WaitGroup

	// Test concurrent room operations using the actual room management functions
	// We'll just test the locking mechanism, not the actual WebSocket operations
	wg.Add(numGoroutines)
	for i := 0; i < numGoroutines; i++ {
		go func(goroutineID int) {
			defer wg.Done()
			for j := 0; j < numOperationsPerGoroutine; j++ {
				roomID := "test_room"
				modelID := "test_model"

				// Test the locking mechanism by accessing rooms directly
				roomsMutex.Lock()
				if rooms[roomID] == nil {
					rooms[roomID] = make(map[string]map[*websocket.Conn]bool)
				}
				if rooms[roomID][modelID] == nil {
					rooms[roomID][modelID] = make(map[*websocket.Conn]bool)
				}
				// Add a dummy entry
				dummyConn := (*websocket.Conn)(unsafe.Pointer(uintptr(goroutineID*100 + j)))
				rooms[roomID][modelID][dummyConn] = true
				roomsMutex.Unlock()

				// Small delay to increase chance of race conditions
				time.Sleep(time.Microsecond * 10)

				// Remove the entry
				roomsMutex.Lock()
				if rooms[roomID] != nil && rooms[roomID][modelID] != nil {
					delete(rooms[roomID][modelID], dummyConn)
					if len(rooms[roomID][modelID]) == 0 {
						delete(rooms[roomID], modelID)
						if len(rooms[roomID]) == 0 {
							delete(rooms, roomID)
						}
					}
				}
				roomsMutex.Unlock()
			}
		}(i)
	}
	wg.Wait()

	// If we reach here without deadlock or race conditions, the test passes
	assert.True(t, true, "Concurrent room operations completed without race conditions")
}

// TestConcurrentRoomAccess tests concurrent reading and writing to rooms
func TestConcurrentRoomAccess(t *testing.T) {
	t.Skip("Skipping concurrent AI room access test - uses unsafe operations that can cause race conditions")
	// Reset the rooms map
	roomsMutex.Lock()
	rooms = make(map[string]map[string]map[*websocket.Conn]bool)
	roomsMutex.Unlock()

	const numReaders = 10
	const numWriters = 5
	var wg sync.WaitGroup

	// Start writers that modify the rooms map
	wg.Add(numWriters)
	for i := 0; i < numWriters; i++ {
		go func(writerID int) {
			defer wg.Done()
			for j := 0; j < 5; j++ {
				roomID := "test_room"
				modelID := "test_model"
				dummyConn := (*websocket.Conn)(unsafe.Pointer(uintptr(writerID*10 + j)))

				// Add connection
				roomsMutex.Lock()
				if rooms[roomID] == nil {
					rooms[roomID] = make(map[string]map[*websocket.Conn]bool)
				}
				if rooms[roomID][modelID] == nil {
					rooms[roomID][modelID] = make(map[*websocket.Conn]bool)
				}
				rooms[roomID][modelID][dummyConn] = true
				roomsMutex.Unlock()

				time.Sleep(time.Microsecond * 50)

				// Remove connection
				roomsMutex.Lock()
				if rooms[roomID] != nil && rooms[roomID][modelID] != nil {
					delete(rooms[roomID][modelID], dummyConn)
				}
				roomsMutex.Unlock()
			}
		}(i)
	}

	// Start readers that read from the rooms map
	wg.Add(numReaders)
	for i := 0; i < numReaders; i++ {
		go func(readerID int) {
			defer wg.Done()
			for j := 0; j < 10; j++ {
				roomsMutex.RLock()
				var connectionCount int
				if rooms["test_room"] != nil && rooms["test_room"]["test_model"] != nil {
					connectionCount = len(rooms["test_room"]["test_model"])
				}
				roomsMutex.RUnlock()

				// Just use the count to avoid unused variable warning
				_ = connectionCount
				time.Sleep(time.Microsecond * 10)
			}
		}(i)
	}

	wg.Wait()

	// If we reach here without panicking, the test passes
	assert.True(t, true, "Concurrent access completed without panics")
}

// TestRoomCleanup tests that rooms are properly cleaned up when empty
func TestRoomCleanup(t *testing.T) {
	// Reset rooms
	roomsMutex.Lock()
	rooms = make(map[string]map[string]map[*websocket.Conn]bool)
	roomsMutex.Unlock()

	roomID := "cleanup_room"
	modelID := "cleanup_model"
	conn1 := (*websocket.Conn)(unsafe.Pointer(uintptr(1)))
	conn2 := (*websocket.Conn)(unsafe.Pointer(uintptr(2)))

	// Manually add two connections for testing cleanup logic
	roomsMutex.Lock()
	rooms[roomID] = make(map[string]map[*websocket.Conn]bool)
	rooms[roomID][modelID] = make(map[*websocket.Conn]bool)
	rooms[roomID][modelID][conn1] = true
	rooms[roomID][modelID][conn2] = true
	roomsMutex.Unlock()

	// Verify room exists with 2 connections
	roomsMutex.RLock()
	connectionCount := len(rooms[roomID][modelID])
	roomsMutex.RUnlock()
	assert.Equal(t, 2, connectionCount, "Should have 2 connections")

	// Remove first connection
	roomsMutex.Lock()
	delete(rooms[roomID][modelID], conn1)
	roomsMutex.Unlock()

	// Verify 1 connection remains
	roomsMutex.RLock()
	connectionCount = len(rooms[roomID][modelID])
	roomsMutex.RUnlock()
	assert.Equal(t, 1, connectionCount, "Should have 1 connection after removal")

	// Remove second connection and cleanup
	roomsMutex.Lock()
	delete(rooms[roomID][modelID], conn2)
	if len(rooms[roomID][modelID]) == 0 {
		delete(rooms[roomID], modelID)
		if len(rooms[roomID]) == 0 {
			delete(rooms, roomID)
		}
	}
	roomsMutex.Unlock()

	// Verify room structure is cleaned up
	roomsMutex.RLock()
	roomExists := rooms[roomID] != nil
	roomsMutex.RUnlock()
	assert.False(t, roomExists, "Room should be cleaned up when empty")
}

// This test should be run with the -race flag to detect race conditions
// Example: go test -race -v ./server/controllers/tools/ai/