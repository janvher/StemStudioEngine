package image_generation

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
)

type ModelsResponse struct {
	Models              []interface{} `json:"models"`
	NextPaginationToken string        `json:"nextPaginationToken"`
}

func init() {
	serverContext.Handle(http.MethodGet, "/api/AI/ImageGeneration/Models", handleGetModels, constants.User)
}

func handleGetModels(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	client, err := helpers.NewScenarioClient()
	if err != nil {
		http.Error(w, "API client initialization failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	pageSize := r.URL.Query().Get("pageSize")
	paginationToken := r.URL.Query().Get("paginationToken")

	url := fmt.Sprintf("/models?pageSize=%s&privacy=public&status=trained", pageSize)
	if paginationToken != "" {
		url += fmt.Sprintf("&paginationToken=%s", paginationToken)
	}

	resp, err := client.MakeRequest("GET", url, nil)
	if err != nil {
		http.Error(w, "Failed to make request: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("Failed to fetch models: %s", resp.Status), resp.StatusCode)
		return
	}

	var modelsResponse ModelsResponse
	err = json.NewDecoder(resp.Body).Decode(&modelsResponse)
	if err != nil {
		http.Error(w, "Failed to parse response", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(modelsResponse)
	if err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}
