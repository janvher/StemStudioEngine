package object_generation

import (
	"encoding/json"
	"net/http"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/byok"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
)

type TripoRigRequest struct {
	Type                string `json:"type"`
	OriginalModelTaskID string `json:"original_model_task_id"`
	OutFormat           string `json:"out_format,omitempty"`
	Spec                string `json:"spec,omitempty"`
}

type TripoRigResponse struct {
	Code int `json:"code"`
	Data struct {
		TaskID string `json:"task_id"`
	} `json:"data"`
}

func init() {
	serverContext.Handle(http.MethodPost, "/api/AI/ObjectGeneration/Tripo/Rig", handleRig, constants.User)
}

func handleRig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	byokKey, _ := byok.ResolveFromRequest(r, "tripo", byok.ProviderEnvVars("tripo")...)
	client, err := helpers.NewTripoClientWithKey(byokKey)
	if err != nil {
		http.Error(w, "API client initialization failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var req TripoRigRequest
	err = json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.OriginalModelTaskID == "" {
		http.Error(w, "Missing original_model_task_id", http.StatusBadRequest)
		return
	}

	req.Type = "animate_rig"

	resp, err := client.MakeRequest("POST", "/task", req)
	if err != nil {
		http.Error(w, "Failed to make request: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, "Failed to create rig task", resp.StatusCode)
		return
	}

	var responseBody TripoRigResponse
	err = json.NewDecoder(resp.Body).Decode(&responseBody)
	if err != nil {
		http.Error(w, "Failed to parse response", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(responseBody.Data)
}
