package ai

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/helper"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
	prompts "github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/prompts"
)

func init() {
	serverContext.Handle(http.MethodPost, "/api/AI/AnimationGraph/Generate", GenerateAnimationGraphHandler, constants.None)
}

// GenerateAnimationGraphRequest represents the request payload for generating an animation graph
type GenerateAnimationGraphRequest struct {
	Animations []string `json:"animations"`
	ModelType  string   `json:"modelType,omitempty"`
	Style      string   `json:"style,omitempty"`
}

// GenerateAnimationGraphResponse represents the response payload
type GenerateAnimationGraphResponse struct {
	Graph string `json:"graph"` // JSON string of the generated animation graph
}

// GenerateAnimationGraphHandler handles generation of an Animation Graph using OpenAI
func GenerateAnimationGraphHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		helper.WriteJSON(w, serverContext.Result{Code: constants.ErrorCodeBadRequest, Msg: "Invalid request method"})
		return
	}

	var req GenerateAnimationGraphRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		helper.WriteJSON(w, serverContext.Result{Code: constants.ErrorCodeBadRequest, Msg: "Invalid JSON data"})
		return
	}

	if len(req.Animations) == 0 {
		helper.WriteJSON(w, serverContext.Result{Code: constants.ErrorCodeBadRequest, Msg: "animations list cannot be empty"})
		return
	}

	// Build prompts
	systemContent := prompts.AnimationGraphSystemPrompt()
	userMessage := prompts.BuildAnimationGraphUserMessage(req.Animations, req.ModelType, req.Style)

	// Provider selection logic (OpenAI only for now, but future-proofed)
	providerType := helpers.ProviderOpenAI
	// Optionally, allow for future provider selection via request or env
	// (not implemented here, but can be added as in handle_assistant.go)

	// Ensure model parameter is set for OpenAI (fallback to default if missing)
	model := os.Getenv("CHAT_GPT_VERSION")
	if model == "" {
		model = "gpt-5-mini"                 // fallback default
		os.Setenv("CHAT_GPT_VERSION", model) // set for OpenAI client
	}

	resp, err := processLLMRequest(r, providerType, systemContent, userMessage)
	if err != nil {
		helper.WriteJSON(w, serverContext.Result{Code: constants.ErrorCodeInternalError, Msg: fmt.Sprintf("failed to generate animation graph: %v", err)})
		return
	}

	helper.WriteJSON(w, serverContext.Result{
		Code: constants.Success,
		Msg:  "Animation graph generated",
		Data: map[string]string{"graph": resp},
	})
}
