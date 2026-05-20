package image_generation

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/byok"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
)

type HeroImageRequest struct {
	Screenshot  string `json:"screenshot"`
	Description string `json:"description"`
}

func init() {
	serverContext.Handle(http.MethodPost, "/api/AI/ImageGeneration/HeroImage", handleHeroImage, constants.User)
}

func handleHeroImage(w http.ResponseWriter, r *http.Request) {
	if !serverContext.IsAdmin(r) {
		http.Error(w, "Admin access required", http.StatusForbidden)
		return
	}

	var req HeroImageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Screenshot == "" {
		http.Error(w, "Screenshot is required", http.StatusBadRequest)
		return
	}

	byokKey, _ := byok.ResolveFromRequest(r, "openai", "OPENAI_API_KEY")
	client, err := helpers.NewOpenAIClientWithKey(byokKey)
	if err != nil {
		http.Error(w, "Failed to initialize AI client: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Step 1: Analyze the screenshot with GPT Vision
	imageDataURL := "data:image/jpeg;base64," + req.Screenshot
	analysisPrompt := `Analyze this 3D game scene screenshot and respond with JSON:
{
  "colorPalette": "dominant colors and color scheme",
  "mood": "overall mood and atmosphere",
  "elements": "key visual elements and objects",
  "theme": "overall theme or genre"
}`

	analysis, err := client.RecognizeImage(r.Context(), analysisPrompt, imageDataURL)
	if err != nil {
		http.Error(w, "Failed to analyze screenshot: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Step 2: Generate hero image with landscape dimensions
	heroPrompt := fmt.Sprintf(
		"Create a beautiful game promotional banner image. Scene analysis: %s", analysis)
	if req.Description != "" {
		heroPrompt += fmt.Sprintf("\nGame description: %s", req.Description)
	}
	heroPrompt += "\nStyle: beautiful, fun, cozy, inviting, rich vibrant colors, game promotional banner art, polished and professional."

	b64Image, err := client.GenerateImageWithSize(r.Context(), heroPrompt, "1792x1024")
	if err != nil {
		http.Error(w, "Failed to generate hero image: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"Code": 200,
		"Data": map[string]interface{}{
			"image": b64Image,
		},
	})
}
