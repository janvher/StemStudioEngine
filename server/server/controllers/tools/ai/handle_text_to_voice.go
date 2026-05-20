package ai

import (
	"crypto/md5"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/byok"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
)

func init() {
	serverContext.Handle(http.MethodPost, "/api/AI/TextToVoice", TextToVoiceHandler, constants.None)
}

func TextToVoiceHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var requestData struct {
		PreviousText string `json:"previousText"`
		Text         string `json:"text"`
		NextText     string `json:"nextText"`
		VoiceId      string `json:"voiceId"`
	}

	// Parse the JSON request body
	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		http.Error(w, "Invalid JSON data", http.StatusBadRequest)
		return
	}

	if requestData.Text == "" {
		http.Error(w, "Text is required", http.StatusBadRequest)
		return
	}

	// Initialize the ElevenLabs client with BYOK precedence.
	byokKey, _ := byok.ResolveFromRequest(r, "elevenlabs", "ELEVEN_LABS_API_KEY", "ELEVENLABS_API_KEY")
	client, err := helpers.NewElevenLabsClientWithKey(byokKey)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to initialize ElevenLabs client: %v", err), http.StatusInternalServerError)
		return
	}

	// Generate ETag based on text content and voice ID for caching
	etagData := fmt.Sprintf("%s-%s-%s-%s", requestData.PreviousText, requestData.Text, requestData.NextText, requestData.VoiceId)
	hash := md5.Sum([]byte(etagData))
	etag := fmt.Sprintf("\"%x\"", hash)

	// Set cache headers for generated audio (cache for 1 day since text-to-speech is expensive)
	w.Header().Set("Content-Type", "audio/mpeg")
	w.Header().Set("ETag", etag)
	w.Header().Set("Cache-Control", "public, max-age=86400, must-revalidate")
	w.WriteHeader(http.StatusOK)

	// Generate speech using the provided text with the ElevenLabs client
	if err := client.GenerateTextToSpeech(
		requestData.PreviousText,
		requestData.Text,
		requestData.NextText,
		requestData.VoiceId,
		w,
	); err != nil {
		http.Error(w, fmt.Sprintf("Failed to generate speech: %v", err), http.StatusInternalServerError)
		return
	}
}
