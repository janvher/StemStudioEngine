package object_generation

import (
	"encoding/json"
	"net/http"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/byok"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
)

// MeshyAPIBaseURLV1 is the base URL for Meshy API v1 (used for rigging)
const MeshyAPIBaseURLV1 = "https://api.meshy.ai/openapi/v1"

type MeshyRigRequest struct {
	InputTaskID  string  `json:"input_task_id"`
	HeightMeters float64 `json:"height_meters,omitempty"`
}

func init() {
	serverContext.Handle(http.MethodPost, "/api/AI/ObjectGeneration/Meshy/Rig", handleMeshyRig, constants.User)
}

func handleMeshyRig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	byokKey, _ := byok.ResolveFromRequest(r, "meshy", byok.ProviderEnvVars("meshy")...)
	client, err := helpers.NewMeshyClientWithBaseURLAndKey(MeshyAPIBaseURLV1, byokKey)
	if err != nil {
		http.Error(w, "API client initialization failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var req MeshyRigRequest
	err = json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.HeightMeters == 0 {
		req.HeightMeters = 1.7 // Default height for rigging
	}

	resp, err := client.MakeRequest("POST", "/rigging", req)
	if err != nil {
		http.Error(w, "Failed to make request: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != 202 {
		http.Error(w, "API request failed with status: "+resp.Status, resp.StatusCode)
		return
	}

	var responseBody struct {
		Result string `json:"result"`
	}

	err = json.NewDecoder(resp.Body).Decode(&responseBody)
	if err != nil {
		http.Error(w, "Failed to parse response", http.StatusInternalServerError)
		return
	}

	response := struct {
		TaskID string `json:"task_id"`
	}{
		TaskID: responseBody.Result,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
