package ai

import (
	"fmt"
	"net/http"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/byok"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
)

func init() {
	serverContext.Handle(http.MethodGet, "/api/AI/Voices", GetVoicesHandler, constants.None)
}

func GetVoicesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	// Initialize the ElevenLabs client with BYOK precedence (env > header > session).
	byokKey, _ := byok.ResolveFromRequest(r, "elevenlabs", "ELEVEN_LABS_API_KEY", "ELEVENLABS_API_KEY")
	client, err := helpers.NewElevenLabsClientWithKey(byokKey)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to initialize ElevenLabs client: %v", err), http.StatusInternalServerError)
		return
	}

	// Set the response headers for JSON
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	// Use the client to get available voices and send them to the client
	if err := client.GetVoices(w); err != nil {
		http.Error(w, fmt.Sprintf("Failed to get voices: %v", err), http.StatusInternalServerError)
		return
	}
}
