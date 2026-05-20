package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/userlimits"
)

type AgentRequestData struct {
	UserMessage        string `json:"userMessage"`
	ThreadID           string `json:"threadId,omitempty"` // Optional thread ID for context
	SceneData          string `json:"sceneData,omitempty"`
	PlayerData         string `json:"playerData,omitempty"`
	LookAtPointData    string `json:"lookAtPointData,omitempty"`
	SelectedObjectData string `json:"selectedObjectData,omitempty"`
	BehaviorConfig     string `json:"behaviorConfig,omitempty"`
	SearchResults      string `json:"searchResults,omitempty"` // For generate commands prompt
	AgentMode          string `json:"agentMode,omitempty"`     // "editor" or "sandbox_generation"
}

type AgentResponse struct {
	AgentResponse string `json:"agentResponse"`
	ThreadID      string `json:"threadId"`
}

func init() {
	serverContext.Handle(http.MethodPost, "/api/AI/Agent", AgentHandler, constants.User)
}

func AgentHandler(w http.ResponseWriter, r *http.Request) {
	if err := userlimits.RequireCopilot(r); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	if r.Method != http.MethodPost {
		respondWithJSON(w, http.StatusMethodNotAllowed, map[string]string{
			"error": "Invalid request method",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")

	var requestData AgentRequestData

	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		respondWithJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Invalid JSON data",
		})
		return
	}

	// Validate required fields
	if requestData.UserMessage == "" {
		respondWithJSON(w, http.StatusBadRequest, map[string]string{
			"error": "userMessage is required",
		})
		return
	}

	// Get environment variables for OpenAI Assistant
	apiKey := os.Getenv("OPENAI_API_KEY")
	assistantID := os.Getenv("OPENAI_ASSISTANT_ID")

	if requestData.AgentMode == "sandbox_generation" {
		assistantID = os.Getenv("OPENAI_ASSISTANT_ID_SANDBOX_GENERATION")
	}

	if apiKey == "" {
		respondWithJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "OpenAI API key not configured",
		})
		return
	}

	if assistantID == "" {
		respondWithJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "OpenAI Assistant ID not configured",
		})
		return
	}

	// Create OpenAI Assistant client
	assistantClient := helpers.NewAssistantClient(apiKey, assistantID)

	// Build context message with available data
	contextMessage := buildContextMessage(requestData)

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	var response *helpers.ConversationResponse
	var err error

	if requestData.ThreadID != "" {
		// Continue existing conversation
		response, err = assistantClient.ContinueConversation(ctx, requestData.ThreadID, contextMessage)
	} else {
		// Start new conversation
		response, err = assistantClient.SubmitPrompt(ctx, contextMessage)
	}

	if err != nil {
		respondWithJSON(w, http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Failed to process agent request: %v", err),
		})
		return
	}

	// Decrement user's copilot limit
	if err := userlimits.ConsumeCopilot(r, 1); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Return response
	agentResponse := AgentResponse{
		AgentResponse: response.Response,
		ThreadID:      response.ThreadID,
	}

	respondWithJSON(w, http.StatusOK, agentResponse)
}

// buildContextMessage constructs a comprehensive message for the assistant
func buildContextMessage(data AgentRequestData) string {
	message := data.UserMessage

	// Add context information if available
	if data.SceneData != "" {
		message += "\n\nScene context: " + data.SceneData
	}

	if data.PlayerData != "" {
		message += "\n\nPlayer data: " + data.PlayerData
	}

	if data.SelectedObjectData != "" {
		message += "\n\nSelected object: " + data.SelectedObjectData
	}

	if data.LookAtPointData != "" {
		message += "\n\nLook at point: " + data.LookAtPointData
	}

	if data.BehaviorConfig != "" {
		message += "\n\nBehavior configuration: " + data.BehaviorConfig
	}

	if data.SearchResults != "" {
		message += "\n\nSearch results: " + data.SearchResults
	}

	return message
}
