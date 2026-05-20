//go:build oss

package object_generation

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/byok"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/userlimits"
)

type MeshyGenerateRequest struct {
	Mode            string   `json:"mode,omitempty"`
	Prompt          string   `json:"prompt"`
	TargetPolycount int      `json:"target_polycount,omitempty"`
	NegativePrompt  string   `json:"negative_prompt,omitempty"`
	ArtStyle        string   `json:"art_style,omitempty"`
	ShouldRemesh    bool     `json:"should_remesh,omitempty"`
	ModelType       string   `json:"model_type,omitempty"`
	TargetFormats   []string `json:"target_formats,omitempty"`
	SceneID         string   `json:"sceneId,omitempty"`
	Name            string   `json:"name,omitempty"`
	DoRefine        bool     `json:"doRefine,omitempty"`
	DoRig           bool     `json:"doRig,omitempty"`
}

func init() {
	serverContext.Handle(http.MethodPost, "/api/AI/ObjectGeneration/Meshy/Generate", handleMeshyGenerate, constants.User)
}

func handleMeshyGenerate(w http.ResponseWriter, r *http.Request) {
	if err := userlimits.Require3D(r); err != nil {
		writeObjectGenerationError(w, err.Error(), http.StatusForbidden)
		return
	}
	if r.Method != http.MethodPost {
		writeObjectGenerationError(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	byokKey, _ := byok.ResolveFromRequest(r, "meshy", byok.ProviderEnvVars("meshy")...)
	client, err := helpers.NewMeshyClientWithKey(byokKey)
	if err != nil {
		log.Printf("[Meshy] API client initialization failed: %v", err)
		if strings.Contains(err.Error(), "not set") {
			writeObjectGenerationError(w, "AI model generation service is not configured (MESHY_API_KEY missing)", http.StatusServiceUnavailable)
		} else {
			writeObjectGenerationError(w, "AI model generation service initialization failed: "+err.Error(), http.StatusInternalServerError)
		}
		return
	}

	var req MeshyGenerateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeObjectGenerationError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Mode == "" {
		req.Mode = "preview"
	}
	if req.ModelType == "" {
		req.ModelType = "standard"
	}
	if len(req.TargetFormats) == 0 {
		req.TargetFormats = []string{"glb"}
	}

	resp, err := client.MakeRequest("POST", "/text-to-3d", req)
	if err != nil {
		log.Printf("[Meshy] Request to Meshy API failed: %v", err)
		writeObjectGenerationError(w, "Failed to reach AI model generation service: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted {
		bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		log.Printf("[Meshy] API returned %d: %s", resp.StatusCode, string(bodyBytes))
		writeObjectGenerationError(w, "AI model generation API error ("+resp.Status+"): "+string(bodyBytes), resp.StatusCode)
		return
	}

	var responseBody struct {
		Result string `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&responseBody); err != nil {
		writeObjectGenerationError(w, "Failed to parse generation response", http.StatusInternalServerError)
		return
	}

	if err := userlimits.Consume3D(r, 1); err != nil {
		writeObjectGenerationError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"task_id": responseBody.Result})
}

func writeObjectGenerationError(w http.ResponseWriter, message string, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
