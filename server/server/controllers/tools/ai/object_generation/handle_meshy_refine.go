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

type MeshyRefineRequest struct {
	Mode          string   `json:"mode,omitempty"`
	PreviewTaskID string   `json:"preview_task_id"`
	TargetFormats []string `json:"target_formats,omitempty"`
}

func init() {
	serverContext.Handle(http.MethodPost, "/api/AI/ObjectGeneration/Meshy/Refine", handleRefine, constants.User)
}

func handleRefine(w http.ResponseWriter, r *http.Request) {
	if err := userlimits.Require3D(r); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	byokKey, _ := byok.ResolveFromRequest(r, "meshy", byok.ProviderEnvVars("meshy")...)
	client, err := helpers.NewMeshyClientWithKey(byokKey)
	if err != nil {
		http.Error(w, "API client initialization failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var req MeshyRefineRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	refineReq := &MeshyRefineRequest{
		Mode:          "refine",
		PreviewTaskID: req.PreviewTaskID,
		TargetFormats: []string{"glb"},
	}

	resp, err := client.MakeRequest("POST", "/text-to-3d", refineReq)
	if err != nil {
		http.Error(w, "Failed to make request: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
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

	if err := userlimits.Consume3D(r, 1); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
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
