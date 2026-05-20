package context

import (
	"fmt"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/helper"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// initializeIndexes creates all necessary database indexes on server startup
func initializeIndexes() error {
	db, err := Mongo()
	if err != nil {
		return fmt.Errorf("failed to connect to database for index initialization: %w", err)
	}

	Logger.Info("🔍 [Indexes] Initializing database indexes...")

	// Track total indexes created
	totalIndexes := 0

	// Scene Collection Indexes - Most critical
	sceneIndexes := []helper.IndexModel{
		// Compound index for user scene list queries (UserID + IsArchived + sorted by UpdateTime)
		{
			Keys: bson.D{
				{Key: "UserID", Value: 1},
				{Key: "IsArchived", Value: 1},
				{Key: "UpdateTime", Value: -1},
			},
			Options: options.Index().SetName("idx_user_archived_updatetime"),
		},
		// Compound index for public scene queries
		{
			Keys: bson.D{
				{Key: "IsPublic", Value: 1},
				{Key: "IsArchived", Value: 1},
				{Key: "UpdateTime", Value: -1},
			},
			Options: options.Index().SetName("idx_public_archived_updatetime"),
		},
		// Compound index for collaborative scene queries
		{
			Keys: bson.D{
				{Key: "Collaborators", Value: 1},
				{Key: "IsArchived", Value: 1},
				{Key: "UpdateTime", Value: -1},
			},
			Options: options.Index().SetName("idx_collaborators_archived_updatetime"),
		},
		// Unique index for scene ID lookups
		{
			Keys: bson.D{
				{Key: "ID", Value: 1},
			},
			Options: options.Index().SetName("idx_scene_id").SetUnique(true),
		},
		// Index for IsArchived filtering (used in almost all queries)
		{
			Keys: bson.D{
				{Key: "IsArchived", Value: 1},
			},
			Options: options.Index().SetName("idx_archived"),
		},
		// Index for alias lookups (GetUniqueSceneAlias loops up to 10k FindMany calls)
		{
			Keys: bson.D{
				{Key: "Alias", Value: 1},
			},
			Options: options.Index().SetName("idx_scene_alias"),
		},
		// Compound index for multiplayer server list filtering
		{
			Keys: bson.D{
				{Key: "IsMultiplayer", Value: 1},
				{Key: "IsArchived", Value: 1},
			},
			Options: options.Index().SetName("idx_scene_multiplayer_archived"),
		},
	}

	count, err := db.EnsureIndexes(constants.SceneCollectionName, sceneIndexes)
	if err != nil {
		Logger.Errorf("Failed to create scene indexes: %v", err)
		return err
	}
	totalIndexes += count
	Logger.Infof("✅ [Indexes] Scene collection: %d indexes ensured", count)

	// Behavior Collection Indexes
	behaviorIndexes := []helper.IndexModel{
		// Index for scene-based behavior queries (array field)
		{
			Keys: bson.D{
				{Key: "SceneIDs", Value: 1},
			},
			Options: options.Index().SetName("idx_behavior_sceneids"),
		},
		// Compound index for user + scene queries
		{
			Keys: bson.D{
				{Key: "UserID", Value: 1},
				{Key: "SceneIDs", Value: 1},
			},
			Options: options.Index().SetName("idx_behavior_user_sceneids"),
		},
		// Unique index for behavior ID point lookups (7+ handlers)
		{
			Keys: bson.D{
				{Key: "ID", Value: 1},
			},
			Options: options.Index().SetName("idx_behavior_id").SetUnique(true),
		},
	}

	count, err = db.EnsureIndexes(constants.BehaviorCollectionName, behaviorIndexes)
	if err != nil {
		Logger.Errorf("Failed to create behavior indexes: %v", err)
		return err
	}
	totalIndexes += count
	Logger.Infof("✅ [Indexes] Behavior collection: %d indexes ensured", count)

	// Asset Collection Indexes
	assetIndexes := []helper.IndexModel{
		// Compound index for user asset queries with type filtering
		{
			Keys: bson.D{
				{Key: "userId", Value: 1},
				{Key: "type", Value: 1},
			},
			Options: options.Index().SetName("idx_asset_user_type"),
		},
		// Index for scene asset queries
		{
			Keys: bson.D{
				{Key: "sceneId", Value: 1},
				{Key: "type", Value: 1},
			},
			Options: options.Index().SetName("idx_asset_scene_type"),
		},
		// Index for tag filtering (multikey index for array field)
		{
			Keys: bson.D{
				{Key: "tags", Value: 1},
			},
			Options: options.Index().SetName("idx_asset_tags"),
		},
		// Compound index for paginated user asset queries with status filter + sort
		{
			Keys: bson.D{
				{Key: "userId", Value: 1},
				{Key: "status", Value: 1},
				{Key: "updateTime", Value: -1},
			},
			Options: options.Index().SetName("idx_asset_user_status_updatetime"),
		},
		// Index for status filtering in aggregation pipelines
		{
			Keys: bson.D{
				{Key: "status", Value: 1},
			},
			Options: options.Index().SetName("idx_asset_status"),
		},
	}

	count, err = db.EnsureIndexes(constants.AssetCollectionName, assetIndexes)
	if err != nil {
		Logger.Errorf("Failed to create asset indexes: %v", err)
		return err
	}
	totalIndexes += count
	Logger.Infof("✅ [Indexes] Asset collection: %d indexes ensured", count)

	// Asset Dependency Collection Indexes
	assetDependencyIndexes := []helper.IndexModel{
		// AssetId + RevisionId pairs must be unique
		{
			Keys: bson.D{
				{Key: "assetId", Value: 1},
				{Key: "revisionId", Value: 1},
			},
			Options: options.Index().SetUnique(true).SetName("idx_assetdependency_asset_revision_unique"),
		},
	}

	count, err = db.EnsureIndexes(constants.AssetDependencyCollectionName, assetDependencyIndexes)
	if err != nil {
		Logger.Errorf("Failed to create asset dependency indexes: %v", err)
		return err
	}
	totalIndexes += count
	Logger.Infof("✅ [Indexes] Asset dependency collection: %d indexes ensured", count)

	// Asset Derivative Collection Indexes
	assetDerivativeIndexes := []helper.IndexModel{
		// Compound index for derivative lookups by asset + revision (used in $or queries)
		{
			Keys: bson.D{
				{Key: "assetId", Value: 1},
				{Key: "revisionId", Value: 1},
			},
			Options: options.Index().SetName("idx_assetderivative_asset_revision"),
		},
		// Compound index for GetLatestByAssetAndType queries sorted by createTime
		{
			Keys: bson.D{
				{Key: "assetId", Value: 1},
				{Key: "type", Value: 1},
				{Key: "createTime", Value: -1},
			},
			Options: options.Index().SetName("idx_assetderivative_asset_type_createtime"),
		},
	}

	count, err = db.EnsureIndexes(constants.AssetDerivativeCollectionName, assetDerivativeIndexes)
	if err != nil {
		Logger.Errorf("Failed to create asset derivative indexes: %v", err)
		return err
	}
	totalIndexes += count
	Logger.Infof("✅ [Indexes] Asset derivative collection: %d indexes ensured", count)

	// Asset Release Collection Indexes
	assetReleaseIndexes := []helper.IndexModel{
		// AssetId + RevisionId pairs must be unique
		{
			Keys: bson.D{
				{Key: "assetId", Value: 1},
				{Key: "revisionId", Value: 1},
			},
			Options: options.Index().SetUnique(true).SetName("idx_assetrelease_asset_revision_unique"),
		},
		// Version major.minor.patch must be unique
		{
			Keys: bson.D{
				{Key: "assetId", Value: 1},
				{Key: "versionMajor", Value: 1},
				{Key: "versionMinor", Value: 1},
				{Key: "versionPatch", Value: 1},
			},
			Options: options.Index().SetUnique(true).SetName("idx_assetrelease_version_unique"),
		},
	}

	count, err = db.EnsureIndexes(constants.AssetReleaseCollectionName, assetReleaseIndexes)
	if err != nil {
		Logger.Errorf("Failed to create asset release indexes: %v", err)
		return err
	}
	totalIndexes += count
	Logger.Infof("✅ [Indexes] Asset release collection: %d indexes ensured", count)

	// NPC Collection Indexes
	npcIndexes := []helper.IndexModel{
		// Compound index for NPC lookups (used in AI conversations)
		{
			Keys: bson.D{
				{Key: "ID", Value: 1},
				{Key: "IsArchived", Value: 1},
			},
			Options: options.Index().SetName("idx_npc_id_archived"),
		},
	}

	count, err = db.EnsureIndexes(constants.NPCCollectionName, npcIndexes)
	if err != nil {
		Logger.Errorf("Failed to create NPC indexes: %v", err)
		return err
	}
	totalIndexes += count
	Logger.Infof("✅ [Indexes] NPC collection: %d indexes ensured", count)

	// Game Mapping Collection Indexes - Critical for URL routing
	gameMappingIndexes := []helper.IndexModel{
		// Unique index for slug (URL routing)
		{
			Keys: bson.D{
				{Key: "Slug", Value: 1},
			},
			Options: options.Index().SetName("idx_gamemapping_slug").SetUnique(true).SetSparse(true),
		},
		// Unique index for GameID lookups
		{
			Keys: bson.D{
				{Key: "GameID", Value: 1},
			},
			Options: options.Index().SetName("idx_gamemapping_gameid").SetUnique(true),
		},
	}

	count, err = db.EnsureIndexes(constants.GameMappingCollectionName, gameMappingIndexes)
	if err != nil {
		Logger.Errorf("Failed to create game mapping indexes: %v", err)
		return err
	}
	totalIndexes += count
	Logger.Infof("✅ [Indexes] Game mapping collection: %d indexes ensured", count)

	// User Collection Indexes
	userIndexes := []helper.IndexModel{
		// Unique index for user ID lookups
		{
			Keys: bson.D{
				{Key: "ID", Value: 1},
			},
			Options: options.Index().SetName("idx_user_id").SetUnique(true),
		},
		// Index for email-based user lookups and admin checks
		{
			Keys: bson.D{
				{Key: "Email", Value: 1},
			},
			Options: options.Index().SetName("idx_user_email"),
		},
	}

	count, err = db.EnsureIndexes(constants.UserCollectionName, userIndexes)
	if err != nil {
		Logger.Errorf("Failed to create user indexes: %v", err)
		return err
	}
	totalIndexes += count
	Logger.Infof("✅ [Indexes] User collection: %d indexes ensured", count)

	// Whitelist Collection Indexes
	whitelistIndexes := []helper.IndexModel{
		// Index for email-based whitelist checks
		{
			Keys: bson.D{
				{Key: "email", Value: 1},
			},
			Options: options.Index().SetName("idx_whitelist_email"),
		},
	}

	count, err = db.EnsureIndexes(constants.WhitelistCollectionName, whitelistIndexes)
	if err != nil {
		Logger.Errorf("Failed to create whitelist indexes: %v", err)
		return err
	}
	totalIndexes += count
	Logger.Infof("✅ [Indexes] Whitelist collection: %d indexes ensured", count)

	// Prefab Collection Indexes
	prefabIndexes := []helper.IndexModel{
		// Index for user prefab queries
		{
			Keys: bson.D{
				{Key: "UserID", Value: 1},
			},
			Options: options.Index().SetName("idx_prefab_user"),
		},
		// Index for ID lookups
		{
			Keys: bson.D{
				{Key: "ID", Value: 1},
			},
			Options: options.Index().SetName("idx_prefab_id"),
		},
	}

	count, err = db.EnsureIndexes(constants.PrefabCollectionName, prefabIndexes)
	if err != nil {
		Logger.Errorf("Failed to create prefab indexes: %v", err)
		return err
	}
	totalIndexes += count
	Logger.Infof("✅ [Indexes] Prefab collection: %d indexes ensured", count)

	// Mesh Collection Indexes
	meshIndexes := []helper.IndexModel{
		// Index for user mesh queries
		{
			Keys: bson.D{
				{Key: "UserID", Value: 1},
			},
			Options: options.Index().SetName("idx_mesh_user"),
		},
		// Multikey index for AI asset search by tags
		{
			Keys: bson.D{
				{Key: "Tags", Value: 1},
			},
			Options: options.Index().SetName("idx_mesh_tags"),
		},
	}

	count, err = db.EnsureIndexes(constants.MeshCollectionName, meshIndexes)
	if err != nil {
		Logger.Errorf("Failed to create mesh indexes: %v", err)
		return err
	}
	totalIndexes += count
	Logger.Infof("✅ [Indexes] Mesh collection: %d indexes ensured", count)

	// Copilot History Collection Indexes
	copilotHistoryIndexes := []helper.IndexModel{
		// Compound index for paginated user history queries sorted by time
		{
			Keys: bson.D{
				{Key: "UserID", Value: 1},
				{Key: "SceneID", Value: 1},
				{Key: "UpdateTime", Value: -1},
			},
			Options: options.Index().SetName("idx_copilothistory_user_scene_updatetime"),
		},
	}

	count, err = db.EnsureIndexes(constants.CopilotHistoryCollectionName, copilotHistoryIndexes)
	if err != nil {
		Logger.Errorf("Failed to create copilot history indexes: %v", err)
		return err
	}
	totalIndexes += count
	Logger.Infof("✅ [Indexes] Copilot history collection: %d indexes ensured", count)

	// Copilot Task Collection Indexes
	copilotTaskIndexes := []helper.IndexModel{
		{
			Keys: bson.D{
				{Key: "SceneID", Value: 1},
				{Key: "SessionID", Value: 1},
				{Key: "Order", Value: 1},
			},
			Options: options.Index().SetName("idx_copilottask_scene_session_order"),
		},
		{
			Keys: bson.D{
				{Key: "SceneID", Value: 1},
				{Key: "Status", Value: 1},
			},
			Options: options.Index().SetName("idx_copilottask_scene_status"),
		},
		{
			Keys: bson.D{
				{Key: "UserID", Value: 1},
				{Key: "UpdateTime", Value: -1},
			},
			Options: options.Index().SetName("idx_copilottask_user_updatetime"),
		},
	}

	count, err = db.EnsureIndexes(constants.CopilotTaskCollectionName, copilotTaskIndexes)
	if err != nil {
		Logger.Errorf("Failed to create copilot task indexes: %v", err)
		return err
	}
	totalIndexes += count
	Logger.Infof("✅ [Indexes] Copilot task collection: %d indexes ensured", count)

	// Scene Revision Capture Collection Indexes
	sceneRevisionCaptureIndexes := []helper.IndexModel{
		{
			Keys: bson.D{
				{Key: "sceneId", Value: 1},
				{Key: "revisionId", Value: 1},
			},
			Options: options.Index().SetName("idx_scenerevisioncapture_scene_revision_unique").SetUnique(true),
		},
		{
			Keys: bson.D{
				{Key: "sceneId", Value: 1},
				{Key: "createTime", Value: -1},
			},
			Options: options.Index().SetName("idx_scenerevisioncapture_scene_createtime"),
		},
	}

	count, err = db.EnsureIndexes(constants.SceneRevisionCaptureCollectionName, sceneRevisionCaptureIndexes)
	if err != nil {
		Logger.Errorf("Failed to create scene revision capture indexes: %v", err)
		return err
	}
	totalIndexes += count
	Logger.Infof("✅ [Indexes] Scene revision capture collection: %d indexes ensured", count)

	// Audio Collection Indexes
	audioIndexes := []helper.IndexModel{
		// Index for scene-based audio queries (scene clone)
		{
			Keys: bson.D{
				{Key: "SceneID", Value: 1},
			},
			Options: options.Index().SetName("idx_audio_sceneid"),
		},
	}

	count, err = db.EnsureIndexes(constants.AudioCollectionName, audioIndexes)
	if err != nil {
		Logger.Errorf("Failed to create audio indexes: %v", err)
		return err
	}
	totalIndexes += count
	Logger.Infof("✅ [Indexes] Audio collection: %d indexes ensured", count)

	homepageStatsIndexes := []helper.IndexModel{
		{
			Keys:    bson.D{{Key: "key", Value: 1}},
			Options: options.Index().SetName("idx_homepage_stats_key").SetUnique(true),
		},
	}

	count, err = db.EnsureIndexes(constants.HomepageStatsCollectionName, homepageStatsIndexes)
	if err != nil {
		Logger.Errorf("Failed to create homepage stats indexes: %v", err)
		return err
	}
	totalIndexes += count
	Logger.Infof("✅ [Indexes] Homepage stats collection: %d indexes ensured", count)

	homepageSuggestionIndexes := []helper.IndexModel{
		{
			Keys: bson.D{
				{Key: "enabled", Value: 1},
				{Key: "order", Value: 1},
				{Key: "label", Value: 1},
			},
			Options: options.Index().SetName("idx_homepage_suggestions_enabled_order_label"),
		},
	}

	count, err = db.EnsureIndexes(constants.HomepageSuggestionsCollectionName, homepageSuggestionIndexes)
	if err != nil {
		Logger.Errorf("Failed to create homepage suggestion indexes: %v", err)
		return err
	}
	totalIndexes += count
	Logger.Infof("✅ [Indexes] Homepage suggestions collection: %d indexes ensured", count)

	rewardEventIndexes := []helper.IndexModel{
		{
			Keys:    bson.D{{Key: "ID", Value: 1}},
			Options: options.Index().SetName("idx_rewardevent_id").SetUnique(true),
		},
		{
			Keys:    bson.D{{Key: "IdempotencyKey", Value: 1}},
			Options: options.Index().SetName("idx_rewardevent_idempotency").SetUnique(true).SetSparse(true),
		},
		{
			Keys:    bson.D{{Key: "ShareCode", Value: 1}},
			Options: options.Index().SetName("idx_rewardevent_sharecode").SetUnique(true).SetSparse(true),
		},
		{
			Keys:    bson.D{{Key: "ProjectionStatus", Value: 1}, {Key: "CreatedAt", Value: 1}},
			Options: options.Index().SetName("idx_rewardevent_projectionstatus_createdat"),
		},
	}

	count, err = db.EnsureIndexes(constants.RewardEventsCollectionName, rewardEventIndexes)
	if err != nil {
		Logger.Errorf("Failed to create reward event indexes: %v", err)
		return err
	}
	totalIndexes += count
	Logger.Infof("✅ [Indexes] Reward event collection: %d indexes ensured", count)

	rewardGrantIndexes := []helper.IndexModel{
		{
			Keys:    bson.D{{Key: "GrantKey", Value: 1}},
			Options: options.Index().SetName("idx_rewardgrant_grantkey").SetUnique(true),
		},
		{
			Keys:    bson.D{{Key: "RecipientUserID", Value: 1}, {Key: "CreatedAt", Value: -1}},
			Options: options.Index().SetName("idx_rewardgrant_recipient_createdat"),
		},
		{
			Keys:    bson.D{{Key: "EventID", Value: 1}},
			Options: options.Index().SetName("idx_rewardgrant_eventid"),
		},
	}

	count, err = db.EnsureIndexes(constants.RewardGrantsCollectionName, rewardGrantIndexes)
	if err != nil {
		Logger.Errorf("Failed to create reward grant indexes: %v", err)
		return err
	}
	totalIndexes += count
	Logger.Infof("✅ [Indexes] Reward grant collection: %d indexes ensured", count)

	rewardBalanceIndexes := []helper.IndexModel{
		{
			Keys:    bson.D{{Key: "UserID", Value: 1}},
			Options: options.Index().SetName("idx_rewardbalance_userid").SetUnique(true),
		},
	}

	count, err = db.EnsureIndexes(constants.RewardBalancesCollectionName, rewardBalanceIndexes)
	if err != nil {
		Logger.Errorf("Failed to create reward balance indexes: %v", err)
		return err
	}
	totalIndexes += count
	Logger.Infof("✅ [Indexes] Reward balance collection: %d indexes ensured", count)

	Logger.Infof("🎉 [Indexes] Successfully ensured %d total indexes across all collections", totalIndexes)
	return nil
}
