package image_generation

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
)

type AddAssetRequest struct {
	Image string `json:"image"`
	Name  string `json:"name"`
}

type AddAssetResponse struct {
	Asset interface{} `json:"asset"`
}

func init() {
	serverContext.Handle(http.MethodPost, "/api/AI/ImageGeneration/Asset/Add", handleAddAsset, constants.User)
}

func handleAddAsset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var req AddAssetRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	client, err := helpers.NewScenarioClient()
	if err != nil {
		http.Error(w, "API client initialization failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	payload := map[string]interface{}{
		"image": req.Image,
		"name":  req.Name,
	}

	resp, err := client.MakeRequest("POST", "/assets", payload)
	if err != nil {
		http.Error(w, "Failed to make request: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("Failed to add model: %s", resp.Status), resp.StatusCode)
		return
	}

	var addAssetResponse AddAssetResponse
	err = json.NewDecoder(resp.Body).Decode(&addAssetResponse)
	if err != nil {
		http.Error(w, "Failed to parse response", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(addAssetResponse)
	if err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}
