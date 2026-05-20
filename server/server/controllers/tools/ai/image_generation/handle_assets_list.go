package image_generation

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
)

type GetAssetListResponse struct {
	Assets              interface{} `json:"assets"`
	NextPaginationToken string      `json:"nextPaginationToken"`
}

func init() {
	serverContext.Handle(http.MethodGet, "/api/AI/ImageGeneration/Asset/List", handleAssetsList, constants.User)
}

func handleAssetsList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	pageSize := r.URL.Query().Get("pageSize")
	types := r.URL.Query().Get("types")
	paginationToken := r.URL.Query().Get("paginationToken")

	client, err := helpers.NewScenarioClient()
	if err != nil {
		http.Error(w, "API client initialization failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	url := fmt.Sprintf("/assets?pageSize=%s&sortDirection=desc", pageSize)
	if paginationToken != "" {
		url += fmt.Sprintf("&paginationToken=%s", paginationToken)
	}
	if types != "" {
		url += fmt.Sprintf("&types=%s", types)
	}

	resp, err := client.MakeRequest("GET", url, nil)
	if err != nil {
		http.Error(w, "Failed to make request: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("Failed to fetch model: %s", resp.Status), resp.StatusCode)
		return
	}

	var getAssetResponse GetAssetListResponse
	err = json.NewDecoder(resp.Body).Decode(&getAssetResponse)
	if err != nil {
		http.Error(w, "Failed to parse response", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(getAssetResponse)
	if err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}
