//go:build oss

package object_generation

import (
	"encoding/json"
	"net/http"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/byok"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/userlimits"
)

type TripoGenerateRequest struct {
	Type           string `json:"type,omitempty"`
	ModelVersion   string `json:"model_version,omitempty"`
	Prompt         string `json:"prompt,omitempty"`
	NegativePrompt string `json:"negative_prompt,omitempty"`
	FileToken      string `json:"file_token,omitempty"`
	URL            string `json:"url,omitempty"`
	ModelSeed      *int   `json:"model_seed,omitempty"`
	FaceLimit      *int   `json:"face_limit,omitempty"`
	Texture        *bool  `json:"texture,omitempty"`
	PBR            *bool  `json:"pbr,omitempty"`
	TextureSeed    *int   `json:"texture_seed,omitempty"`
	TextureQuality string `json:"texture_quality,omitempty"`
	AutoSize       *bool  `json:"auto_size,omitempty"`
	Style          string `json:"style,omitempty"`
	Orientation    string `json:"orientation,omitempty"`
	Quad           *bool  `json:"quad,omitempty"`
	SceneID        string `json:"sceneId,omitempty"`
	Name           string `json:"name,omitempty"`
}

func init() {
	serverContext.Handle(http.MethodPost, "/api/AI/ObjectGeneration/Tripo/Generate", handleTripoGenerate, constants.User)
}

func handleTripoGenerate(w http.ResponseWriter, r *http.Request) {
	if err := userlimits.Require3D(r); err != nil {
		writeObjectGenerationError(w, err.Error(), http.StatusForbidden)
		return
	}
	if r.Method != http.MethodPost {
		writeObjectGenerationError(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	byokKey, _ := byok.ResolveFromRequest(r, "tripo", byok.ProviderEnvVars("tripo")...)
	client, err := helpers.NewTripoClientWithKey(byokKey)
	if err != nil {
		writeObjectGenerationError(w, "API client initialization failed", http.StatusInternalServerError)
		return
	}

	var req TripoGenerateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeObjectGenerationError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Type == "" {
		req.Type = "image_to_model"
	}
	if req.ModelVersion == "" {
		req.ModelVersion = "v2.5-20250123"
	}

	data := map[string]interface{}{
		"type":   req.Type,
		"prompt": req.Prompt,
		"file": map[string]interface{}{
			"type":       "png",
			"file_token": req.FileToken,
		},
		"texture_quality": req.TextureQuality,
		"face_limit":      req.FaceLimit,
		"auto_size":       req.AutoSize,
		"model_version":   req.ModelVersion,
	}

	resp, err := client.MakeRequest("POST", "/task", data)
	if err != nil {
		writeObjectGenerationError(w, "Failed to make request: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		writeObjectGenerationError(w, "API request failed with status: "+resp.Status, resp.StatusCode)
		return
	}

	var responseBody GenerateResponse
	if err := json.NewDecoder(resp.Body).Decode(&responseBody); err != nil {
		writeObjectGenerationError(w, "Failed to parse response", http.StatusInternalServerError)
		return
	}

	if err := userlimits.Consume3D(r, 1); err != nil {
		writeObjectGenerationError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"task_id": responseBody.Data.TaskID})
}
