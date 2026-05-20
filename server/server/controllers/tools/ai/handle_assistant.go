package ai

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/byok"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
	prompts "github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/prompts"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/userlimits"
)

// providerNameFor maps a helpers.ProviderType to the canonical name used by
// the byok package's registry. Kept private to this file (also referenced
// from handle_npc_conversation.go which lives in the same package).
func providerNameFor(t helpers.ProviderType) string {
	switch t {
	case helpers.ProviderOpenAI:
		return "openai"
	case helpers.ProviderClaude:
		return "anthropic"
	case helpers.ProviderGemini:
		return "gemini"
	case helpers.ProviderScenario:
		return "scenario"
	default:
		return "openai"
	}
}

// Operation types for different AI assistant functions
const (
	OperationCommandsPrompt      = "commands_prompt"
	OperationEnhanceModelPrompt  = "enhance_model_prompt"
	OperationEnhanceImagePrompt  = "enhance_image_prompt"
	OperationGenerateStepsPrompt = "generate_steps_prompt"
	OperationSearchTagsPrompt    = "search_tags_prompt"
	OperationEditCodePrompt      = "edit_code_prompt"
	OperationDecisionPrompt      = "decision_prompt"
)

type AssistantRequestData struct {
	Operation          string `json:"operation"`
	UserMessage        string `json:"userMessage"`
	SystemContent      string `json:"systemContent,omitempty"`
	SceneData          string `json:"sceneData,omitempty"`
	PlayerData         string `json:"playerData,omitempty"`
	LookAtPointData    string `json:"lookAtPointData,omitempty"`
	SelectedObjectData string `json:"selectedObjectData,omitempty"`
	BehaviorConfig     string `json:"behaviorConfig,omitempty"`
	PlayerWidth        string `json:"playerWidth,omitempty"`
	PlayerHeight       string `json:"playerHeight,omitempty"`
	Docs               string `json:"docs,omitempty"`
	StarterCode        string `json:"starterCode,omitempty"`
	SearchResults      string `json:"searchResults,omitempty"` // For generate commands prompt
	Provider           string `json:"provider,omitempty"`      // Optional provider selection
}

func init() {
	serverContext.Handle(http.MethodPost, "/api/AI/Assistant", AssistantHandler, constants.User)
}

func AssistantHandler(w http.ResponseWriter, r *http.Request) {
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

	// Updated request data structure to include all possible parameters
	var requestData AssistantRequestData

	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		respondWithJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Invalid JSON data",
		})
		return
	}

	// Generate system content based on operation
	systemContent, err := generateSystemContent(requestData)
	if err != nil {
		respondWithJSON(w, http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Failed to generate system content: %v", err),
		})
		return
	}

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

	response, err := processLLMRequest(r, providerType, systemContent, requestData.UserMessage)
	if err != nil {
		respondWithJSON(w, http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Failed to process LLM response: %v", err),
		})
		return
	}

	if err := userlimits.ConsumeCopilot(r, 1); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{
		"assistantResponse": response,
	})
}

// generateSystemContent selects the appropriate prompt generation function based on operation
func generateSystemContent(data AssistantRequestData) (string, error) {
	switch data.Operation {
	case OperationCommandsPrompt:
		return prompts.CreateCommandsPrompt(data.SceneData, data.SelectedObjectData, data.PlayerData, data.LookAtPointData, data.BehaviorConfig, data.SearchResults), nil

	case OperationEnhanceModelPrompt:
		return prompts.GetEnhanceModelPromptSystemMessage(data.PlayerWidth, data.PlayerHeight), nil

	case OperationEnhanceImagePrompt:
		return prompts.GetEnhanceImagePromptSystemMessage(data.PlayerWidth, data.PlayerHeight), nil

	case OperationGenerateStepsPrompt:
		return prompts.CreateGenerateStepsPrompt(data.BehaviorConfig, data.Docs), nil

	case OperationSearchTagsPrompt:
		return prompts.SearchTagsPrompt(data.PlayerWidth, data.PlayerHeight), nil

	case OperationEditCodePrompt:
		return prompts.EditCodePrompt(data.BehaviorConfig, data.StarterCode), nil
	case OperationDecisionPrompt:
		return prompts.DecisionPrompt(), nil

	case "":
		// If no operation is specified, use the provided system content
		if data.SystemContent == "" {
			return "", fmt.Errorf("no operation specified and no system content provided")
		}
		return data.SystemContent, nil

	default:
		return "", fmt.Errorf("unsupported operation: %s", data.Operation)
	}
}

func processLLMRequest(r *http.Request, providerType helpers.ProviderType, systemContent, userMessage string) (string, error) {
	byokKey, _ := byok.ResolveFromRequest(r, providerNameFor(providerType), byok.ProviderEnvVars(providerNameFor(providerType))...)
	llmProvider, err := helpers.NewLLMProviderWithKey(providerType, byokKey)
	if err != nil {
		return "", err
	}

	return llmProvider.CreateCompletion(r.Context(), systemContent, userMessage)
}

func respondWithJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		http.Error(w, "Failed to encode JSON response", http.StatusInternalServerError)
	}
}
