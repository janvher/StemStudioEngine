package image_generation

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
)

type GetAssetResponse struct {
	Asset interface{} `json:"asset"`
}

func init() {
	serverContext.Handle(http.MethodGet, "/api/AI/ImageGeneration/Asset/Get", handleGetAsset, constants.User)
}

func handleGetAsset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	assetID := r.URL.Query().Get("assetId")
	if assetID == "" {
		http.Error(w, "Missing assetId query parameter", http.StatusBadRequest)
		return
	}

	client, err := helpers.NewScenarioClient()
	if err != nil {
		http.Error(w, "API client initialization failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	resp, err := client.MakeRequest("GET", fmt.Sprintf("/assets/%s", assetID), nil)
	if err != nil {
		http.Error(w, "Failed to make request: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("Failed to fetch model: %s", resp.Status), resp.StatusCode)
		return
	}

	var getAssetResponse GetAssetResponse
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
