package ai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/byok"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
	prompts "github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/prompts"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func init() {
	serverContext.Handle(http.MethodPost, "/api/AI/NPC/Conversation", NPCConversationHandler, constants.None)
}

// SelectedAction represents an action selected by AI from AvailableActions
// Kept for backward compatibility with frontend
type SelectedAction = prompts.PlannedAction

// NPCConversationHandler handles text-based conversation with NPC using LLMs and streams the response via SSE
func NPCConversationHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	var requestData struct {
		NPCID       string                `json:"npcID"`    // NPC ObjectID in hex format
		SceneID     string                `json:"sceneID"`  // Scene/Game ID for ReactionData
		Text        string                `json:"text"`     // User message
		UserName    string                `json:"userName"` // Player name
		GameContext *prompts.GameContext  `json:"gameContext,omitempty"` // Optional structured game context
		Provider    string                `json:"provider,omitempty"` // Optional provider selection (openai, claude, gemini)
	}

	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		http.Error(w, "Invalid JSON data", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if requestData.NPCID == "" || requestData.Text == "" || requestData.SceneID == "" {
		http.Error(w, "NPCID, SceneID, and Text are required", http.StatusBadRequest)
		return
	}

	// Convert NPCID to ObjectID
	npcObjectID, err := primitive.ObjectIDFromHex(requestData.NPCID)
	if err != nil {
		http.Error(w, "Invalid NPCID format", http.StatusBadRequest)
		return
	}

	// Fetch NPC data from database
	db, err := serverContext.Mongo()
	if err != nil {
		http.Error(w, "Database connection failed", http.StatusInternalServerError)
		return
	}

	var npcData bson.M
	filter := bson.M{
		"ID":         npcObjectID,
		"IsArchived": bson.M{"$ne": true},
	}

	found, err := db.FindOne(constants.NPCCollectionName, filter, &npcData)
	if err != nil {
		http.Error(w, "Failed to retrieve NPC data", http.StatusInternalServerError)
		return
	}

	if !found {
		http.Error(w, "NPC not found", http.StatusNotFound)
		return
	}

	// Generate system prompt from NPC data
	systemPrompt, err := generateNPCSystemPrompt(npcData, requestData.SceneID, requestData.GameContext)
	if err != nil {
			http.Error(w, "Failed to generate system prompt", http.StatusInternalServerError)
			return
	}

	fmt.Printf("[DEBUG] Generated system prompt for NPC %s: %s\n", requestData.NPCID, systemPrompt)

	// Determine which provider to use
	providerType := helpers.ProviderOpenAI // Default to OpenAI
	if requestData.Provider != "" {
		switch requestData.Provider {
		case "claude":
			providerType = helpers.ProviderClaude
		case "gemini":
			providerType = helpers.ProviderGemini
		}
	} else {
		// Check if there's a default provider set in environment
		defaultProvider := os.Getenv("DEFAULT_LLM_PROVIDER")
		if defaultProvider != "" {
			switch defaultProvider {
			case "claude":
				providerType = helpers.ProviderClaude
			case "gemini":
				providerType = helpers.ProviderGemini
			}
		}
	}

	byokKey, _ := byok.ResolveFromRequest(r, providerNameFor(providerType), byok.ProviderEnvVars(providerNameFor(providerType))...)
	if err := sendNPCResponseStream(r.Context(), providerType, byokKey, requestData.Text, systemPrompt, requestData.UserName, requestData.NPCID, requestData.SceneID, w); err != nil {
		http.Error(w, fmt.Sprintf("Failed to process LLM response: %v", err), http.StatusInternalServerError)
		return
	}
}

// generateNPCSystemPrompt creates a conversation prompt based on NPC data using the prompts package
func generateNPCSystemPrompt(npcData bson.M, sceneID string, gameContext *prompts.GameContext) (string, error) {
	name, _ := npcData["Name"].(string)
	bio, _ := npcData["Bio"].(string)
	personality, _ := npcData["Personality"].(string)
	responseStyle, _ := npcData["ResponseStyle"].(string)

	// Convert careers from bson to prompts.Career slice
	var careers []prompts.Career
	if careersInterface, ok := npcData["Careers"].([]interface{}); ok {
		for _, careerInterface := range careersInterface {
			if careerMap, ok := careerInterface.(map[string]interface{}); ok {
				name, _ := careerMap["Name"].(string)
				rating, _ := careerMap["Rating"].(int32)
				if name != "" {
					careers = append(careers, prompts.Career{
						Name:   name,
						Rating: int(rating),
					})
				}
			}
		}
	}

	// Extract ReactionData for the specific scene using BSON unmarshaling
	var reactionData *prompts.SceneReactionData
	if reactionDataRaw, ok := npcData["ReactionData"]; ok && reactionDataRaw != nil {
		// Marshal to BSON bytes
		reactionDataBytes, err := bson.Marshal(reactionDataRaw)
		if err != nil {
			fmt.Printf("[DEBUG generateNPCSystemPrompt] Failed to marshal ReactionData: %v\n", err)
		} else {
			var reactionDataMap map[string]prompts.SceneReactionData
			if err := bson.Unmarshal(reactionDataBytes, &reactionDataMap); err != nil {
				fmt.Printf("[DEBUG generateNPCSystemPrompt] Failed to unmarshal ReactionData: %v\n", err)
			} else {
				if sceneData, ok := reactionDataMap[sceneID]; ok {
					reactionData = &sceneData
				} else {
					fmt.Printf("[DEBUG generateNPCSystemPrompt] Scene %s not found in ReactionData\n", sceneID)
				}
			}
		}
	} else {
		fmt.Printf("[DEBUG generateNPCSystemPrompt] No ReactionData in NPC data\n")
	}

	// Create NPCData structure
	npc := prompts.NPCData{
		Name:          name,
		Bio:           bio,
		Personality:   personality,
		ResponseStyle: responseStyle,
		Careers:       careers,
		ReactionData:  reactionData,
		GameContext:   gameContext,
	}

	// Use the prompts package to generate the conversation prompt
	return prompts.GenerateNPCConversationPrompt(npc)
}

// Helper function to get scene keys for debugging
func getSceneKeys(m map[string]prompts.SceneReactionData) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

// sendNPCResponseStream sends the user message to LLM and streams the response
func sendNPCResponseStream(ctx context.Context, providerType helpers.ProviderType, byokKey, userText, systemPrompt, userName, npcID, sceneID string, w http.ResponseWriter) error {
	// Initialize the LLM provider with the per-request BYOK fallback.
	llmProvider, err := helpers.NewLLMProviderWithKey(providerType, byokKey)
	if err != nil {
		return err
	}

	// Format user message with player name if provided
	formattedUserText := userText
	if userName != "" {
		formattedUserText = "[" + userName + "]: " + userText
	}

	// Create messages array (no history for now)
	messages := []helpers.Message{
		{
			Role:    helpers.RoleUser,
			Content: formattedUserText,
		},
	}

	// Generate JSON schema for structured output.
	// Built as a plain map[string]any so the openai-go SDK can serialize it
	// directly into the request's ResponseFormat.JSONSchema.Schema field.
	// (Migrated 2026-04-22 from sashabaranov's jsonschema.Definition helper —
	// the shape is the same; only the builder type changed.)
	schema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"inner_thoughts": map[string]any{
				"type":        "string",
				"description": "Step-by-step reasoning. E.g. 'The sphere is far, so I need to walk to it first, then pick it up.'",
			},
			"dialogue": map[string]any{
				"type":        "string",
				"description": "Response to player.",
			},
			"actions": map[string]any{
				"type":        "array",
				"description": "List of ALL actions to execute in sequence. Do not omit steps.",
				"items": map[string]any{
					"type": "object",
					"properties": map[string]any{
						"name": map[string]any{
							"type":        "string",
							"description": "The exact name of the action from the 'Available Actions' list.",
						},
						"parameters": map[string]any{
							"type":                 "object",
							"description":          "Key-value pairs of parameters required for the action (e.g. objectId, x, y, z).",
							"additionalProperties": true,
						},
					},
					"required":             []string{"name"},
					"additionalProperties": false,
				},
			},
		},
		"required":             []string{"inner_thoughts", "dialogue"},
		"additionalProperties": false,
	}

	// Create a streaming completion with schema
	stream, err := llmProvider.CreateCompletionStream(ctx, systemPrompt, messages, schema)
	if err != nil {
		return err
	}
	defer stream.Close()

	var assistantResponse strings.Builder
	var structuredResp prompts.NPCResponse
	flusher, canFlush := w.(http.Flusher)

	// Collect the complete response (OpenAI returns structured JSON in chunks)
	for {
		response, err := stream.Recv()
		if errors.Is(err, io.EOF) {
			break
		}

		if err != nil {
			fmt.Printf("[ERROR] Stream error: %v\n", err)
			return fmt.Errorf("Stream error: %v", err)
		}

		if response.Content != "" {
			assistantResponse.WriteString(response.Content)
			
			// Try to parse partial JSON to extract and stream dialogue
			currentJSON := assistantResponse.String()
			
			// Simple extraction of dialogue field from partial JSON
			// Look for "dialogue":"..." pattern
			if dialogueStart := strings.Index(currentJSON, `"dialogue":"`); dialogueStart != -1 {
				dialogueStart += len(`"dialogue":"`)
				remaining := currentJSON[dialogueStart:]
				
				// Find the end of the dialogue string (looking for unescaped quote)
				dialogueEnd := 0
				escaped := false
				for i, ch := range remaining {
					if escaped {
						escaped = false
						continue
					}
					if ch == '\\' {
						escaped = true
						continue
					}
					if ch == '"' {
						dialogueEnd = i
						break
					}
				}
				
				if dialogueEnd > 0 {
					partialDialogue := remaining[:dialogueEnd]
					
					// Only send if we haven't sent this part yet
					// (Compare with previously sent dialogue length)
					if len(partialDialogue) > len(structuredResp.Dialogue) {
						newChunk := partialDialogue[len(structuredResp.Dialogue):]
						
						// Unescape JSON string
						unescaped := strings.ReplaceAll(newChunk, `\"`, `"`)
						unescaped = strings.ReplaceAll(unescaped, `\\`, `\`)
						unescaped = strings.ReplaceAll(unescaped, `\n`, "\n")
						unescaped = strings.ReplaceAll(unescaped, `\t`, "\t")
						
						if len(unescaped) > 0 {
							fmt.Fprintf(w, "data: %s\n\n", unescaped)
							if canFlush {
								flusher.Flush()
							}
							structuredResp.Dialogue = partialDialogue
						}
					}
				}
			}
		}

		if response.FinishReason != "" {
			fmt.Printf("[DEBUG] Stream finished with reason: %s\n", response.FinishReason)
			break
		}
	}

	// Process the complete response
	fullResponse := assistantResponse.String()
	
	if len(fullResponse) == 0 {
		return fmt.Errorf("empty response from LLM")
	}

	// Parse complete JSON to get actions
	var finalResp prompts.NPCResponse
	if err := json.Unmarshal([]byte(fullResponse), &finalResp); err != nil {
		// If we haven't sent anything yet, send raw response
		if len(structuredResp.Dialogue) == 0 {
			fmt.Fprintf(w, "data: %s\n\n", fullResponse)
			if canFlush {
				flusher.Flush()
			}
		}
	} else {
		// Send any remaining dialogue that wasn't streamed
		if len(finalResp.Dialogue) > len(structuredResp.Dialogue) {
			remainingDialogue := finalResp.Dialogue[len(structuredResp.Dialogue):]
			if len(remainingDialogue) > 0 {
				fmt.Fprintf(w, "data: %s\n\n", remainingDialogue)
				if canFlush {
					flusher.Flush()
				}
			}
		}
		
		// Send actions AFTER dialogue streaming is complete
		if len(finalResp.Actions) > 0 {
			actionsJSON, err := json.Marshal(finalResp.Actions)
			if err == nil {
				fmt.Fprintf(w, "event: actions\ndata: %s\n\n", string(actionsJSON))
				if canFlush {
					flusher.Flush()
				}
			}
		}

		// Log inner thoughts for debugging
		if finalResp.InnerThoughts != "" {
			fmt.Printf("[NPC %s Inner Thoughts]: %s\n", npcID, finalResp.InnerThoughts)
		}
		
		// Update structuredResp for ReactionData update
		structuredResp = finalResp
	}

	// Send end marker
	fmt.Fprintf(w, "event: end\ndata: {\"finished\":true}\n\n")
	if canFlush {
		flusher.Flush()
	}

	// Trigger ReactionData update in background (non-blocking)
	go func() {
		updateCtx := context.Background()
		dialogue := structuredResp.Dialogue
		if dialogue == "" {
			dialogue = fullResponse
		}
		if err := updateReactionDataFromConversation(updateCtx, npcID, sceneID, userName, formattedUserText, dialogue, providerType, byokKey); err != nil {
			// Log error but don't fail the conversation
			fmt.Printf("Error updating ReactionData for NPC %s in scene %s: %v\n", npcID, sceneID, err)
		}
	}()

	return nil
}

// updateReactionDataFromConversation analyzes the conversation and updates NPC's ReactionData
func updateReactionDataFromConversation(ctx context.Context, npcID, sceneID, userName, userMessage, npcResponse string, providerType helpers.ProviderType, byokKey string) error {
	// Convert NPC ID to ObjectID
	npcObjectID, err := primitive.ObjectIDFromHex(npcID)
	if err != nil {
		return fmt.Errorf("invalid NPC ID: %v", err)
	}

	// Get database connection
	db, err := serverContext.Mongo()
	if err != nil {
		return fmt.Errorf("database connection failed: %v", err)
	}

	// Fetch current NPC data
	var npcData bson.M
	filter := bson.M{
		"ID":         npcObjectID,
		"IsArchived": bson.M{"$ne": true},
	}

	found, err := db.FindOne(constants.NPCCollectionName, filter, &npcData)
	if err != nil {
		return fmt.Errorf("failed to fetch NPC: %v", err)
	}
	if !found {
		return fmt.Errorf("NPC not found")
	}

	// Extract current ReactionData for this scene using BSON unmarshaling
	var currentReactionData *prompts.SceneReactionData
	var currentAffinity *prompts.AffinityLevel
	
	// Convert npcData to BSON bytes and back to get proper type conversions
	if reactionDataRaw, ok := npcData["ReactionData"]; ok && reactionDataRaw != nil {
		// Marshal to BSON bytes
		reactionDataBytes, err := bson.Marshal(reactionDataRaw)
		if err != nil {
			fmt.Printf("[DEBUG] Failed to marshal ReactionData: %v\n", err)
		} else {
			// Unmarshal into map[string]SceneReactionData
			var reactionDataMap map[string]prompts.SceneReactionData
			if err := bson.Unmarshal(reactionDataBytes, &reactionDataMap); err != nil {
				fmt.Printf("[DEBUG] Failed to unmarshal ReactionData: %v\n", err)
			} else {
				fmt.Printf("[DEBUG] Successfully unmarshaled ReactionData, scenes: %v\n", getSceneKeys(reactionDataMap))
				
				// Get data for this specific scene
				if sceneData, ok := reactionDataMap[sceneID]; ok {
					currentReactionData = &sceneData
					fmt.Printf("[DEBUG] Found scene data - STM count: %d, LTM count: %d\n", 
						len(currentReactionData.ShortTermMemory), len(currentReactionData.LongTermMemory))
					
					// Find current affinity with this player
					if userName != "" {
						for i := range currentReactionData.AffinityLevels {
							if currentReactionData.AffinityLevels[i].CharacterID == userName {
								currentAffinity = &currentReactionData.AffinityLevels[i]
								break
							}
						}
					}
				} else {
					fmt.Printf("[DEBUG] Scene %s not found in ReactionData\n", sceneID)
				}
			}
		}
	} else {
		fmt.Printf("[DEBUG] No ReactionData in NPC data\n")
	}

	// Initialize if no ReactionData exists for this scene
	if currentReactionData == nil {
		currentReactionData = &prompts.SceneReactionData{
			Objectives:        []prompts.Objective{},
			ShortTermMemory:   []prompts.Memory{},
			LongTermMemory:    []prompts.Memory{},
			GroupAffiliations: []string{},
			AffinityLevels:    []prompts.AffinityLevel{},
		}
	}

	// Get NPC name for prompt
	npcName := npcData["Name"].(string)

	// Build conversation transcript
	conversation := fmt.Sprintf("%s: %s\n%s: %s", userName, userMessage, npcName, npcResponse)

	// Create analysis prompt data
	analysisData := prompts.ConversationAnalysisData{
		NPCName:          npcName,
		PlayerName:       userName,
		Conversation:     conversation,
		CurrentObjectives: currentReactionData.Objectives,
		CurrentMemories:  currentReactionData.ShortTermMemory,
		CurrentAffinity:  currentAffinity,
	}

	// Generate analysis prompt
	analysisPrompt := prompts.GenerateReactionDataAnalysisPrompt(analysisData)

	// Call AI to analyze conversation (BYOK key carried over from the request).
	llmProvider, err := helpers.NewLLMProviderWithKey(providerType, byokKey)
	if err != nil {
		return fmt.Errorf("failed to create LLM provider: %v", err)
	}

	messages := []helpers.Message{
		{
			Role:    helpers.RoleUser,
			Content: analysisPrompt,
		},
	}

	// Pass nil for schema as we don't need structured output for this internal analysis
	stream, err := llmProvider.CreateCompletionStream(ctx, "", messages, nil)
	if err != nil {
		return fmt.Errorf("failed to create completion stream: %v", err)
	}
	defer stream.Close()

	// Collect full response
	var fullResponse string
	for {
		response, err := stream.Recv()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return fmt.Errorf("stream error: %v", err)
		}
		if response.Content != "" {
			fullResponse += response.Content
		}
	}

	// Parse JSON response
	var update prompts.ReactionDataUpdate
	if err := json.Unmarshal([]byte(fullResponse), &update); err != nil {
		return fmt.Errorf("failed to parse AI response: %v (response: %s)", err, fullResponse)
	}

	// Apply updates to ReactionData
	updatedReactionData := applyReactionDataUpdates(currentReactionData, &update, userName)

	// Log the result
	fmt.Printf("[ReactionData Result] ShortTermMemory count: %d, LongTermMemory count: %d\n", 
		len(updatedReactionData.ShortTermMemory), len(updatedReactionData.LongTermMemory))

	// Marshal the updated data to ensure proper BSON types
	updateDataBson, err := bson.Marshal(updatedReactionData)
	if err != nil {
		return fmt.Errorf("failed to marshal updated ReactionData: %v", err)
	}

	var updateDataMap bson.M
	if err := bson.Unmarshal(updateDataBson, &updateDataMap); err != nil {
		return fmt.Errorf("failed to unmarshal updated ReactionData: %v", err)
	}

	// Update MongoDB using proper BSON document
	updateDoc := bson.M{
		"$set": bson.M{
			fmt.Sprintf("ReactionData.%s", sceneID): updateDataMap,
			"UpdatedAt": time.Now(),
		},
	}

	_, err = db.UpdateOne(constants.NPCCollectionName, filter, updateDoc)
	if err != nil {
		return fmt.Errorf("failed to update NPC ReactionData: %v", err)
	}

	return nil
}

// applyReactionDataUpdates applies the AI's suggested updates to ReactionData
func applyReactionDataUpdates(current *prompts.SceneReactionData, update *prompts.ReactionDataUpdate, playerID string) *prompts.SceneReactionData {
	// Create deep copies of all slices to avoid reference issues
	result := &prompts.SceneReactionData{
		Objectives:        make([]prompts.Objective, len(current.Objectives)),
		ShortTermMemory:   make([]prompts.Memory, len(current.ShortTermMemory)),
		LongTermMemory:    make([]prompts.Memory, len(current.LongTermMemory)),
		GroupAffiliations: make([]string, len(current.GroupAffiliations)),
		AffinityLevels:    make([]prompts.AffinityLevel, len(current.AffinityLevels)),
	}
	
	// Copy all data
	copy(result.Objectives, current.Objectives)
	copy(result.ShortTermMemory, current.ShortTermMemory)
	copy(result.LongTermMemory, current.LongTermMemory)
	copy(result.GroupAffiliations, current.GroupAffiliations)
	copy(result.AffinityLevels, current.AffinityLevels)

	// 1. Add new memory if provided and important enough
	if update.NewMemory != nil {
		newMem := *update.NewMemory
		newMem.Timestamp = time.Now()
		
		importance := newMem.Relevance + newMem.Urgency + newMem.Consequence
		
		fmt.Printf("[Memory Add] Current STM count: %d, Importance: %d (threshold: 6)\n", 
			len(result.ShortTermMemory), importance)
		
		// Only add if importance >= 6
		if importance >= 6 {
			fmt.Printf("[Memory Add] Adding new memory: %s\n", newMem.Content)
			result.ShortTermMemory = append(result.ShortTermMemory, newMem)
			
			// Manage short-term memory (keep max 5)
			fmt.Printf("[Memory Add] Before manage: %d memories\n", len(result.ShortTermMemory))
			result.ShortTermMemory = manageShortTermMemory(result.ShortTermMemory, &result.LongTermMemory)
			fmt.Printf("[Memory Add] After manage: %d STM, %d LTM\n", 
				len(result.ShortTermMemory), len(result.LongTermMemory))
		} else {
			fmt.Printf("[Memory Add] Skipping memory - importance too low\n")
		}
	}

	// 2. Update existing objectives
	for _, objUpdate := range update.ObjectiveUpdates {
		for i := range result.Objectives {
			if result.Objectives[i].Description == objUpdate.Description {
				result.Objectives[i].Status = objUpdate.NewStatus
				result.Objectives[i].UpdatedAt = time.Now()
				break
			}
		}
	}

	// 3. Add new objectives
	for _, newObj := range update.NewObjectives {
		newObj.CreatedAt = time.Now()
		newObj.UpdatedAt = time.Now()
		result.Objectives = append(result.Objectives, newObj)
	}

	// 4. Update affinity level
	if playerID != "" {
		affinityUpdated := false
		for i := range result.AffinityLevels {
			if result.AffinityLevels[i].CharacterID == playerID {
				result.AffinityLevels[i].Level += update.AffinityChange
				
				// Clamp to -32 to 32 range
				if result.AffinityLevels[i].Level > 32 {
					result.AffinityLevels[i].Level = 32
				} else if result.AffinityLevels[i].Level < -32 {
					result.AffinityLevels[i].Level = -32
				}
				
				if update.AffinityNote != "" {
					result.AffinityLevels[i].Notes = update.AffinityNote
				}
				
				affinityUpdated = true
				break
			}
		}
		
		// Create new affinity if doesn't exist
		if !affinityUpdated {
			newAffinity := prompts.AffinityLevel{
				CharacterID: playerID,
				Level:       update.AffinityChange,
				Notes:       update.AffinityNote,
			}
			
			// Clamp to range
			if newAffinity.Level > 32 {
				newAffinity.Level = 32
			} else if newAffinity.Level < -32 {
				newAffinity.Level = -32
			}
			
			result.AffinityLevels = append(result.AffinityLevels, newAffinity)
		}
	}

	return result
}

// manageShortTermMemory keeps only 5 most important memories, moves old important ones to long-term
func manageShortTermMemory(shortTerm []prompts.Memory, longTerm *[]prompts.Memory) []prompts.Memory {
	
	if len(shortTerm) <= 5 {
		return shortTerm
	}

	// Sort by importance (descending), then by timestamp (newest first)
	sortedMemories := make([]prompts.Memory, len(shortTerm))
	copy(sortedMemories, shortTerm)

	for i := 0; i < len(sortedMemories)-1; i++ {
		for j := i + 1; j < len(sortedMemories); j++ {
			iImportance := sortedMemories[i].Relevance + sortedMemories[i].Urgency + sortedMemories[i].Consequence
			jImportance := sortedMemories[j].Relevance + sortedMemories[j].Urgency + sortedMemories[j].Consequence
			
			// Sort by importance (descending)
			if jImportance > iImportance {
				sortedMemories[i], sortedMemories[j] = sortedMemories[j], sortedMemories[i]
			} else if jImportance == iImportance {
				// If same importance, prefer newer memories
				if sortedMemories[j].Timestamp.After(sortedMemories[i].Timestamp) {
					sortedMemories[i], sortedMemories[j] = sortedMemories[j], sortedMemories[i]
				}
			}
		}
	}

	// Keep top 5
	result := sortedMemories[:5]

	// Move discarded memories with importance > 8 to long-term
	movedToLTM := 0
	for i := 5; i < len(sortedMemories); i++ {
		importance := sortedMemories[i].Relevance + sortedMemories[i].Urgency + sortedMemories[i].Consequence
		if importance > 8 {
			// Check if not already in long-term memory
			alreadyExists := false
			for _, ltm := range *longTerm {
				if ltm.Content == sortedMemories[i].Content {
					alreadyExists = true
					break
				}
			}
			
			if !alreadyExists {
				*longTerm = append(*longTerm, sortedMemories[i])
				movedToLTM++
			}
		}
	}
	
	return result
}
