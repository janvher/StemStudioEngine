package image_generation

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/helper"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/userlimits"
)

type TextToTextureRequest struct {
	ModelId        string `json:"modelId"`
	Prompt         string `json:"prompt"`
	NegativePrompt string `json:"negativePrompt"`
	Width          string `json:"width"`
	Height         string `json:"height"`
	NumSamples     int    `json:"numSamples"`
}

func init() {
	serverContext.Handle(http.MethodPost, "/api/AI/ImageGeneration/TextToTexture", handleTextToTexture, constants.User)
}

func handleTextToTexture(w http.ResponseWriter, r *http.Request) {
	if err := userlimits.RequireAICredits(r, serverContext.Config.AiCredits.ImageGenCost); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	client, err := helpers.NewScenarioClient()
	if err != nil {
		http.Error(w, "API client initialization failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var req TextToTextureRequest
	err = json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	payload := map[string]interface{}{
		"modelId":           req.ModelId,
		"prompt":            req.Prompt,
		"negativePrompt":    req.NegativePrompt,
		"numInferenceSteps": 30,
		"numSamples":        req.NumSamples,
		"guidance":          3.5,
		"width":             req.Width,
		"height":            req.Height,
	}

	resp, err := client.MakeRequest("POST", "/generate/txt2img-texture", payload)
	if err != nil {
		http.Error(w, "Failed to make request: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, "API request failed with status: "+resp.Status, resp.StatusCode)
		return
	}

	var responseBody map[string]interface{}
	err = json.NewDecoder(resp.Body).Decode(&responseBody)
	if err != nil {
		http.Error(w, "Failed to parse response", http.StatusInternalServerError)
		return
	}

	jobInterface, ok := responseBody["job"].(map[string]interface{})
	if !ok {
		http.Error(w, "Job not found", http.StatusInternalServerError)
		return
	}
	jobId := helper.GetStringFromField(jobInterface, "jobId", "")
	if jobId == "" {
		http.Error(w, "Job ID not found", http.StatusInternalServerError)
		return
	}

	// Use the helper function to wait for job completion
	jobStatus, err := client.WaitForJob(jobId, 5*time.Second, 10*time.Minute)
	if err != nil {
		http.Error(w, "Error waiting for job completion: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if err := userlimits.ConsumeAICredits(r, serverContext.Config.AiCredits.ImageGenCost); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(jobStatus)
}
