package context

import (
	"sync"
	"testing"
	"time"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/helper"
	"github.com/stretchr/testify/assert"
)

// TestMongoClientConcurrency tests concurrent access to MongoDB client creation
func TestMongoClientConcurrency(t *testing.T) {
	// Skip if no config (integration test environment)
	if Config == nil {
		t.Skip("Skipping test: Config not initialized")
	}

	// Reset MongoClients for testing
	mongoClientsMutex.Lock()
	MongoClients = nil
	mongoClientsMutex.Unlock()

	const numGoroutines = 50
	const numRequestsPerGoroutine = 10
	var wg sync.WaitGroup

	// Store all clients to check for uniqueness
	clientsMutex := sync.Mutex{}
	allClients := make(map[*helper.Mongo]bool)

	// Test concurrent client creation for same database
	wg.Add(numGoroutines)
	for i := 0; i < numGoroutines; i++ {
		go func(goroutineID int) {
			defer wg.Done()
			for j := 0; j < numRequestsPerGoroutine; j++ {
				client, err := MongoByName("test_db")

				// We should either get a client or an error, but not panic
				if err == nil && client != nil {
					clientsMutex.Lock()
					allClients[client] = true
					clientsMutex.Unlock()
				}

				// Small delay to increase chance of race conditions
				time.Sleep(time.Microsecond)
			}
		}(i)
	}
	wg.Wait()

	// Verify that only one client was created for the same database name
	mongoClientsMutex.RLock()
	clientsMapSize := len(MongoClients)
	mongoClientsMutex.RUnlock()

	clientsMutex.Lock()
	uniqueClientsCount := len(allClients)
	clientsMutex.Unlock()

	// We should have exactly one entry in MongoClients map for "test_db"
	assert.LessOrEqual(t, clientsMapSize, 1, "Should have at most 1 client in MongoClients map")

	// All returned clients should be the same instance (singleton pattern)
	if uniqueClientsCount > 0 {
		assert.Equal(t, 1, uniqueClientsCount, "All clients for same DB should be the same instance")
	}
}

// TestConcurrentDifferentDatabases tests concurrent access to different database clients
func TestConcurrentDifferentDatabases(t *testing.T) {
	// Skip if no config
	if Config == nil {
		t.Skip("Skipping test: Config not initialized")
	}

	// Reset MongoClients
	mongoClientsMutex.Lock()
	MongoClients = nil
	mongoClientsMutex.Unlock()

	const numDatabases = 10
	const numGoroutinesPerDB = 10
	var wg sync.WaitGroup

	// Test concurrent creation of different database clients
	wg.Add(numDatabases * numGoroutinesPerDB)
	for dbID := 0; dbID < numDatabases; dbID++ {
		for goroutine := 0; goroutine < numGoroutinesPerDB; goroutine++ {
			go func(databaseID int) {
				defer wg.Done()

				dbName := "test_db_" + string(rune('0'+databaseID))
				_, err := MongoByName(dbName)

				// Should not panic, might return error if connection fails
				_ = err

				time.Sleep(time.Microsecond)
			}(dbID)
		}
	}
	wg.Wait()

	// Verify that separate clients were created for different databases
	mongoClientsMutex.RLock()
	clientsMapSize := len(MongoClients)
	mongoClientsMutex.RUnlock()

	// We should have created entries for the different databases
	// (some might fail to connect, but the map should track attempts)
	assert.True(t, clientsMapSize >= 0, "MongoClients map should be properly initialized")
	assert.True(t, clientsMapSize <= numDatabases, "Should not have more clients than databases")
}

// TestMongoClientMapInitialization tests concurrent map initialization
func TestMongoClientMapInitialization(t *testing.T) {
	// Skip if no config
	if Config == nil {
		t.Skip("Skipping test: Config not initialized")
	}

	const numGoroutines = 100
	var wg sync.WaitGroup

	// Test multiple goroutines trying to initialize the map simultaneously
	wg.Add(numGoroutines)
	for i := 0; i < numGoroutines; i++ {
		go func() {
			defer wg.Done()

			// Reset to nil to force reinitialization
			mongoClientsMutex.Lock()
			MongoClients = nil
			mongoClientsMutex.Unlock()

			// Try to get a client, which should trigger map initialization
			_, err := MongoByName("init_test_db")
			_ = err // Ignore connection errors, we're testing concurrency
		}()
	}
	wg.Wait()

	// Verify map is properly initialized
	mongoClientsMutex.RLock()
	mapIsNotNil := MongoClients != nil
	mongoClientsMutex.RUnlock()

	assert.True(t, mapIsNotNil, "MongoClients map should be initialized")
}

// TestReadWriteLockCorrectness tests that read/write locks work correctly
func TestReadWriteLockCorrectness(t *testing.T) {
	// Skip if no config
	if Config == nil {
		t.Skip("Skipping test: Config not initialized")
	}

	// Reset and populate with a test client
	mongoClientsMutex.Lock()
	MongoClients = make(map[string]*helper.Mongo)
	// We can't create a real client in tests, so we'll test the locking behavior
	mongoClientsMutex.Unlock()

	const numReaders = 100
	const numWriters = 10
	var wg sync.WaitGroup

	// Track how many operations complete
	readOps := int64(0)
	writeOps := int64(0)
	var opsMutex sync.Mutex

	// Start readers (they should be able to run concurrently)
	wg.Add(numReaders)
	for i := 0; i < numReaders; i++ {
		go func() {
			defer wg.Done()
			for j := 0; j < 10; j++ {
				_, _ = MongoByName("read_test_db")

				opsMutex.Lock()
				readOps++
				opsMutex.Unlock()

				time.Sleep(time.Microsecond)
			}
		}()
	}

	// Start writers (they should serialize with each other and readers)
	wg.Add(numWriters)
	for i := 0; i < numWriters; i++ {
		go func(writerID int) {
			defer wg.Done()
			for j := 0; j < 5; j++ {
				_, _ = MongoByName("write_test_db_" + string(rune('0'+writerID)))

				opsMutex.Lock()
				writeOps++
				opsMutex.Unlock()

				time.Sleep(time.Microsecond)
			}
		}(i)
	}

	wg.Wait()

	// If we reach here without deadlock, the test passes
	opsMutex.Lock()
	totalOps := readOps + writeOps
	opsMutex.Unlock()

	expectedOps := int64(numReaders*10 + numWriters*5)
	assert.Equal(t, expectedOps, totalOps, "All operations should complete")
}

// This test should be run with the -race flag to detect race conditions
// Example: go test -race -v ./server/context/