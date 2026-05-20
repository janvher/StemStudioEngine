package homepage

import (
	"time"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	globalStatsKey           = "global"
	initialGamesCreatedCount = int64(562)
)

type Suggestion struct {
	ID     string `bson:"id,omitempty" json:"id,omitempty"`
	Label  string `bson:"label" json:"label"`
	Prompt string `bson:"prompt" json:"prompt"`
	Order  int    `bson:"order,omitempty" json:"-"`
}

type Content struct {
	GamesCreated int64        `json:"gamesCreated"`
	Suggestions  []Suggestion `json:"suggestions"`
}

type statsDocument struct {
	Key          string    `bson:"key"`
	GamesCreated int64     `bson:"gamesCreated"`
	UpdatedAt    time.Time `bson:"updatedAt"`
}

var defaultSuggestions = []Suggestion{
	{
		ID:     "island-survival",
		Label:  "Island Survival",
		Prompt: "A cozy island survival game with trading NPCs and co-op quests.",
		Order:  10,
	},
	{
		ID:     "dungeon-crawler",
		Label:  "Dungeon Crawler",
		Prompt: "A dungeon crawler with traps, keys, treasure rooms, and a boss encounter.",
		Order:  20,
	},
	{
		ID:     "robot-factory",
		Label:  "Robot Factory",
		Prompt: "A robot factory automation game with conveyor belts, upgrades, and hazards.",
		Order:  30,
	},
	{
		ID:     "mystery-adventure",
		Label:  "Mystery Adventure",
		Prompt: "A mystery adventure in a foggy town with clues, puzzles, and branching dialogue.",
		Order:  40,
	},
}

func GetContent() (Content, error) {
	db, err := serverContext.Mongo()
	if err != nil {
		return Content{Suggestions: defaultSuggestions}, err
	}

	content := Content{
		GamesCreated: initialGamesCreatedCount,
		Suggestions:  defaultSuggestions,
	}

	var stats statsDocument
	found, err := db.FindOne(constants.HomepageStatsCollectionName, bson.M{"key": globalStatsKey}, &stats)
	if err != nil {
		return content, err
	}
	if found {
		content.GamesCreated = stats.GamesCreated
	}

	var suggestions []Suggestion
	filter := bson.M{
		"$or": bson.A{
			bson.M{"enabled": bson.M{"$exists": false}},
			bson.M{"enabled": true},
		},
	}
	opts := options.Find().SetSort(bson.D{{Key: "order", Value: 1}, {Key: "label", Value: 1}}).SetLimit(8)
	if err := db.FindMany(constants.HomepageSuggestionsCollectionName, filter, &suggestions, opts); err != nil {
		return content, err
	}
	if len(suggestions) > 0 {
		content.Suggestions = suggestions
	}

	return content, nil
}

func IncrementGamesCreated() error {
	db, err := serverContext.Mongo()
	if err != nil {
		return err
	}

	now := time.Now().UTC()
	filter := bson.M{"key": globalStatsKey}
	bootstrapUpdate := bson.M{
		"$setOnInsert": bson.M{
			"key":          globalStatsKey,
			"gamesCreated": initialGamesCreatedCount,
			"createdAt":    now,
			"updatedAt":    now,
		},
	}
	if _, err := db.UpdateOne(constants.HomepageStatsCollectionName, filter, bootstrapUpdate, options.Update().SetUpsert(true)); err != nil {
		return err
	}

	incrementUpdate := bson.M{
		"$inc": bson.M{
			"gamesCreated": 1,
		},
		"$set": bson.M{
			"updatedAt": now,
		},
	}
	_, err = db.UpdateOne(constants.HomepageStatsCollectionName, filter, incrementUpdate)
	return err
}
