package image_generation

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/helper"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
)

type UpscaleRequest struct {
	Image          string `json:"assetId"`
	Prompt         string `json:"prompt"`
	NegativePrompt string `json:"negativePrompt"`
	ScalingFactor  int    `json:"scalingFactor"`
	Style          string `json:"style"`
	ImageType      string `json:"imageType"`
}

func init() {
	serverContext.Handle(http.MethodPost, "/api/AI/ImageGeneration/Upscale", handleUpscale, constants.User)
}

func handleUpscale(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var req UpscaleRequest
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
		"image":          req.Image,
		"prompt":         req.Prompt,
		"negativePrompt": req.NegativePrompt,
		"scalingFactor":  req.ScalingFactor,
		"numSamples":     1,
		"style":          req.Style,
		"imageType":      req.ImageType,
	}

	resp, err := client.MakeRequest("POST", "/generate/upscale", payload)
	if err != nil {
		http.Error(w, "Failed to make request: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, "Failed to create job", resp.StatusCode)
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

	// Use the client.WaitForJob method to poll for job completion
	jobStatus, err := client.WaitForJob(jobId, 5*time.Second, 5*time.Minute)
	if err != nil {
		http.Error(w, "Error waiting for job: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(jobStatus)
}
