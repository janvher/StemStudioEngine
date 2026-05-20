package helper

import (
	"testing"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func TestIndexModel(t *testing.T) {
	// Test creating an IndexModel
	model := IndexModel{
		Keys: bson.D{
			{Key: "UserID", Value: 1},
			{Key: "IsArchived", Value: 1},
		},
		Options: options.Index().SetName("test_index").SetUnique(false),
	}

	if model.Keys == nil {
		t.Error("IndexModel Keys should not be nil")
	}

	if model.Options == nil {
		t.Error("IndexModel Options should not be nil")
	}

	// Verify the keys are correctly set
	if len(model.Keys) != 2 {
		t.Errorf("Expected 2 keys, got %d", len(model.Keys))
	}
}

func TestCompoundIndexModel(t *testing.T) {
	// Test creating a compound index with multiple fields
	model := IndexModel{
		Keys: bson.D{
			{Key: "UserID", Value: 1},
			{Key: "IsArchived", Value: 1},
			{Key: "UpdateTime", Value: -1}, // Descending sort
		},
		Options: options.Index().SetName("compound_test").SetSparse(true),
	}

	if len(model.Keys) != 3 {
		t.Errorf("Expected 3 keys for compound index, got %d", len(model.Keys))
	}

	// Verify ascending and descending order
	if model.Keys[0].Value != 1 {
		t.Error("First key should be ascending (1)")
	}

	if model.Keys[2].Value != -1 {
		t.Error("Third key should be descending (-1)")
	}
}
