package image_generation

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
)

type GetBulkAssetsRequest struct {
	AssetIDs []string `json:"assetIds"`
}

type GetBulkAssetsResponse struct {
	Assets []interface{} `json:"assets"`
}

func init() {
	serverContext.Handle(http.MethodPost, "/api/AI/ImageGeneration/Asset/GetBulk", handleGetBulkAssets, constants.User)
}

func handleGetBulkAssets(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	// Parse the incoming request body
	var bulkRequest GetBulkAssetsRequest
	err := json.NewDecoder(r.Body).Decode(&bulkRequest)
	if err != nil {
		http.Error(w, "Failed to parse request body", http.StatusBadRequest)
		return
	}

	if len(bulkRequest.AssetIDs) == 0 {
		http.Error(w, "Missing assetIds in request body", http.StatusBadRequest)
		return
	}

	client, err := helpers.NewScenarioClient()
	if err != nil {
		http.Error(w, "API client initialization failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Send the request to the API
	resp, err := client.MakeRequest("POST", "/assets/get-bulk", bulkRequest)
	if err != nil {
		http.Error(w, "Failed to make request: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		responseBody, _ := io.ReadAll(resp.Body) // Read response body for debugging purposes
		http.Error(w, fmt.Sprintf("Failed to fetch assets: %s. %s", resp.Status, string(responseBody)), resp.StatusCode)
		return
	}

	// Parse the response from the external API
	var getBulkResponse GetBulkAssetsResponse
	err = json.NewDecoder(resp.Body).Decode(&getBulkResponse)
	if err != nil {
		http.Error(w, "Failed to parse response", http.StatusInternalServerError)
		return
	}

	// Write the response back to the client
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(getBulkResponse)
	if err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}
