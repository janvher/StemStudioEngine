package image_generation

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/helper"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
)

type DeleteAssetRequest struct {
	AssetIDs []string `json:"assetIds"`
}

func init() {
	serverContext.Handle(http.MethodDelete, "/api/AI/ImageGeneration/Asset/Delete", handleDeleteAsset, constants.User)
}

func handleDeleteAsset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	params := r.Context().Value("auth_params").(map[string]interface{})
	isAdmin := helper.ConvertToBool(params["isAdmin"], false)

	if !isAdmin {
		helper.WriteJSON(w, serverContext.Result{
			Code: constants.ErrorCodeForbidden,
			Msg:  "Only administrators can delete assets",
		})
		return
	}

	var req DeleteAssetRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if len(req.AssetIDs) == 0 {
		http.Error(w, "No asset IDs provided", http.StatusBadRequest)
		return
	}

	client, err := helpers.NewScenarioClient()
	if err != nil {
		http.Error(w, "API client initialization failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	payload := map[string]interface{}{
		"assetIds": req.AssetIDs,
	}

	resp, err := client.MakeRequest("DELETE", "/assets", payload)
	if err != nil {
		http.Error(w, "Failed to make request: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("Failed to delete models: %s", resp.Status), resp.StatusCode)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message":"Assets deleted successfully"}`))
}
