package ai

import (
	"encoding/json"
	"net/http"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/byok"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
)

func init() {
	serverContext.Handle(http.MethodPost, "/api/AI/VoiceToText", VoiceToTextHandler, constants.None)
}

// VoiceToTextHandler handles audio transcription using the selected provider
func VoiceToTextHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	file, _, err := r.FormFile("audio")
	if err != nil {
		http.Error(w, "Failed to parse audio file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	byokKey, _ := byok.ResolveFromRequest(r, "openai", "OPENAI_API_KEY")
	transcription, err := helpers.TranscribeAudioWithKey(file, byokKey)
	if err != nil {
		http.Error(w, "Failed to transcribe audio", http.StatusInternalServerError)
		return
	}

	// Send transcription as JSON response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"transcription": transcription})
}
