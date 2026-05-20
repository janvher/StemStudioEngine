package helpers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/byok"
	"github.com/gorilla/websocket"
)

// ElevenLabsClient represents a client for ElevenLabs API
type ElevenLabsClient struct {
	apiKey string
}

// NewElevenLabsClient creates a new ElevenLabs client using only the server
// environment for credentials.
func NewElevenLabsClient() (*ElevenLabsClient, error) {
	return NewElevenLabsClientWithKey("")
}

// NewElevenLabsClientWithKey is the BYOK-aware constructor. Precedence: env
// → byokKey arg → BYOK session store, via byok.LookupKey.
func NewElevenLabsClientWithKey(byokKey string) (*ElevenLabsClient, error) {
	apiKey, _ := byok.LookupKey("elevenlabs", []string{"ELEVEN_LABS_API_KEY", "ELEVENLABS_API_KEY"}, byokKey)
	if apiKey == "" {
		return nil, fmt.Errorf("ElevenLabs API key not set")
	}

	return &ElevenLabsClient{
		apiKey: apiKey,
	}, nil
}

// GenerateTextToSpeech generates speech from text and writes directly to a response writer
func (c *ElevenLabsClient) GenerateTextToSpeech(previousText, text, nextText, voiceId string, w http.ResponseWriter) error {
	payload := map[string]interface{}{
		"text":     text,
		"model_id": "eleven_multilingual_v2",
		"voice_settings": map[string]interface{}{
			"stability":        1,
			"similarity_boost": 1,
		},
	}

	if previousText != "" {
		payload["previous_text"] = previousText
	}
	if nextText != "" {
		payload["next_text"] = nextText
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("error encoding JSON payload for ElevenLabs: %v", err)
	}

	req, err := http.NewRequest("POST", constants.ElevenLabsAPIEndpoint+voiceId, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return fmt.Errorf("error creating request for ElevenLabs: %v", err)
	}

	req.Header.Set("xi-api-key", c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("error sending request to ElevenLabs: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("error response from ElevenLabs: %s", body)
	}

	// Stream the generated audio back to the client
	_, err = io.Copy(w, resp.Body)
	return err
}

// GetVoices retrieves available voices from ElevenLabs and writes directly to a response writer
func (c *ElevenLabsClient) GetVoices(w http.ResponseWriter) error {
	req, err := http.NewRequest("GET", "https://api.elevenlabs.io/v1/voices", nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("xi-api-key", c.apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request to ElevenLabs: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("error response from ElevenLabs: %s", body)
	}

	// Copy the response from ElevenLabs directly to the client
	if _, err := io.Copy(w, resp.Body); err != nil {
		return fmt.Errorf("failed to forward response: %v", err)
	}

	return nil
}

// GenerateSpeech generates speech from text using ElevenLabs API
func GenerateSpeech(previousText, text, nextText, voiceId string) ([]byte, error) {
	payload := map[string]interface{}{
		"text":     text,
		"model_id": "eleven_multilingual_v2",
		"voice_settings": map[string]interface{}{
			"stability":        1,
			"similarity_boost": 1,
		},
	}

	if previousText != "" {
		payload["previous_text"] = previousText
	}
	if nextText != "" {
		payload["next_text"] = nextText
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("error encoding JSON payload for ElevenLabs: %v", err)
	}

	req, err := http.NewRequest("POST", constants.ElevenLabsAPIEndpoint+voiceId, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return nil, fmt.Errorf("error creating request for ElevenLabs: %v", err)
	}

	apiKey, _ := byok.LookupKey("elevenlabs", []string{"ELEVEN_LABS_API_KEY", "ELEVENLABS_API_KEY"}, "")
	if apiKey == "" {
		return nil, fmt.Errorf("ElevenLabs API key not set")
	}

	req.Header.Set("xi-api-key", apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error sending request to ElevenLabs: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("error response from ElevenLabs: %s", body)
	}

	audioData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading audio response from ElevenLabs: %v", err)
	}

	return audioData, nil
}

// GenerateSpeechWS generates speech with WebSocket error handling
func GenerateSpeechWS(previousText, text, nextText, voiceId string, conn *websocket.Conn) ([]byte, error) {
	audioData, err := GenerateSpeech(previousText, text, nextText, voiceId)
	if err != nil {
		SendError(conn, fmt.Sprintf("Error with speech generation: %v", err))
		return nil, err
	}
	return audioData, nil
}

// SendError sends an error message over WebSocket
func SendError(conn *websocket.Conn, message string) {
	errorMsg := struct {
		Error   bool   `json:"error"`
		Message string `json:"message"`
	}{
		Error:   true,
		Message: message,
	}

	msgBytes, err := json.Marshal(errorMsg)
	if err != nil {
		fmt.Println("Error while serializing error message:", err)
		return
	}

	err = conn.WriteMessage(websocket.TextMessage, msgBytes)
	if err != nil {
		fmt.Println("Error sending error message:", err)
	}
}

// CloseConnectionWithReason closes a WebSocket connection with a reason
func CloseConnectionWithReason(conn *websocket.Conn, closeCode int, reason string) {
	conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(closeCode, reason))
	conn.Close()
}
