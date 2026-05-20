package context

import (
	"context"
	"fmt"
	"sync"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	"go.mongodb.org/mongo-driver/bson"
)

// ProxyMappingEntry holds a target URL and optional credentials for a proxy mapping
type ProxyMappingEntry struct {
	TargetURL      string
	CredentialType string
	BasicUsername  string
	BasicPassword  string
	ApiKeyHeader   string
	ApiKeyValue    string
}

var (
	// proxyMappings holds the in-memory cache of API mappings
	proxyMappings = make(map[string]ProxyMappingEntry)
	// proxyMutex provides thread-safe access to proxyMappings
	proxyMutex sync.RWMutex
)

// ApiMapping represents the structure of API mapping documents in MongoDB
type ApiMapping struct {
	Key            string `bson:"key" json:"key"`
	TargetURL      string `bson:"target_url" json:"target_url"`
	Active         bool   `bson:"active" json:"active"`
	CredentialType string `bson:"credential_type" json:"credential_type"`
	BasicUsername  string `bson:"basic_username" json:"basic_username"`
	BasicPassword  string `bson:"basic_password" json:"basic_password"`
	ApiKeyHeader   string `bson:"apikey_header" json:"apikey_header"`
	ApiKeyValue    string `bson:"apikey_value" json:"apikey_value"`
}

func InitializeApiMappings() {
	fmt.Printf("🗺️  [API] Initializing API mappings...\n")
	Logger.Info("Initializing API mappings")
	if err := LoadApiMappingsFromDB(); err != nil {
		fmt.Printf("⚠️  [API] Failed to load from database: %v\n", err)
		Logger.Errorf("Failed to load initial API mappings: %v", err)
		// Fallback to config file if database load fails
		fallbackToConfigFile()
	}
}

func fallbackToConfigFile() {
	Logger.Info("Falling back to config file for API mappings")

	// Load mappings from the existing config
	if Config != nil && Config.Proxy.PathToUrlMap != nil {
		SetMappings(Config.Proxy.PathToUrlMap)
		Logger.Info("Loaded API mappings from config file")
	} else {
		Logger.Error("No proxy config available for fallback")
	}
}

// LoadApiMappingsFromDB loads all active API mappings from MongoDB into the in-memory cache
func LoadApiMappingsFromDB() error {
	db, err := Mongo()
	if err != nil {
		Logger.Errorf("Failed to connect to MongoDB: %v", err)
		return err
	}

	// Query for all active mappings
	filter := bson.M{"active": true}
	cursor, err := db.Find(constants.ApiMappingCollectionName, filter)
	if err != nil {
		Logger.Errorf("Failed to query API mappings: %v", err)
		return err
	}

	var mappings []ApiMapping
	if err = cursor.All(context.Background(), &mappings); err != nil {
		Logger.Errorf("Failed to decode API mappings: %v", err)
		return err
	}

	// Build new mappings map
	newMappings := make(map[string]ProxyMappingEntry)
	for _, mapping := range mappings {
		newMappings[mapping.Key] = ProxyMappingEntry{
			TargetURL:      mapping.TargetURL,
			CredentialType: mapping.CredentialType,
			BasicUsername:  mapping.BasicUsername,
			BasicPassword:  mapping.BasicPassword,
			ApiKeyHeader:   mapping.ApiKeyHeader,
			ApiKeyValue:    mapping.ApiKeyValue,
		}
	}

	// Thread-safe update of the cache
	proxyMutex.Lock()
	proxyMappings = newMappings
	proxyMutex.Unlock()

	fmt.Printf("✅ [API] Loaded %d API mappings into cache\n", len(newMappings))
	Logger.Infof("Loaded %d API mappings into cache", len(newMappings))
	return nil
}

// GetMapping retrieves a mapping from the in-memory cache in a thread-safe manner
func GetMapping(key string) (ProxyMappingEntry, bool) {
	proxyMutex.RLock()
	defer proxyMutex.RUnlock()
	value, exists := proxyMappings[key]
	return value, exists
}

// RefreshApiMappingsCache refreshes the in-memory cache from MongoDB
func RefreshApiMappingsCache() error {
	return LoadApiMappingsFromDB()
}

// SetMappings sets the entire cache from a provided map (for fallback scenarios)
func SetMappings(mappings map[string]string) {
	proxyMutex.Lock()
	defer proxyMutex.Unlock()

	// Clear existing cache
	proxyMappings = make(map[string]ProxyMappingEntry)

	// Set new mappings
	for key, value := range mappings {
		proxyMappings[key] = ProxyMappingEntry{
			TargetURL:      value,
			CredentialType: "none",
		}
	}
}
