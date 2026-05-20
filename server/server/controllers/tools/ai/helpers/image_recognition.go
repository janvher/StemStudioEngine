package helpers

import (
	"fmt"
	"encoding/json"
	"net/http"
	"strings"
)

// ImageRecognitionResponse represents the structured response from the image recognition
type ImageRecognitionResponse struct {
	Tags        []string     `json:"tags"`
	DefaultSize *DefaultSize `json:"defaultSize"`
}

// DefaultSize represents the recommended size for the model in meters
type DefaultSize struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
}

// CreateImageRecognitionPrompt generates a system prompt for image recognition
func CreateImageRecognitionPrompt(imageName string) string {

	return fmt.Sprintf(`
You are an AI image recognition expert. Analyze the provided image and generate:

1. A list of descriptive tags that accurately describe what you see in the image. Include:
	 - General terms for the object's category or type
	 - Specific adjectives for appearance, mood, or style
	 - Contextual terms for setting or theme
	 - At least 5 relevant, lowercase tags

2. A recommended default size (x, y, z dimensions in meters) for the model to make it look natural in a scene with a reference character of size:
   - Height (Y): 1.8323 meters
   - Width (X): 1.0629 meters
   - Depth (Z): 0.381 meters

The default size should represent the real-world dimensions of the object in meters.
Estimate based on what you see in the image:
- A small object like a cup: {"x": 0.1, "y": 0.15, "z": 0.1}
- A medium object like a chair: {"x": 0.5, "y": 1.0, "z": 0.5}
- A large object like a tree: {"x": 3.0, "y": 10.0, "z": 3.0}
- A car: {"x": 2.0, "y": 1.5, "z": 4.5}
- Buildings: {"x": 10.0, "y": 15.0, "z": 10.0} or larger

Your response must be valid JSON with only the following fields:
- tags: array of string tags
- defaultSize: object with x, y, z numeric values representing dimensions in meters

Example response format:
{
	"tags": ["tree", "forest", "nature", "majestic", "old", "big", "leafy"],
	"defaultSize": {"x": 3.0, "y": 10.0, "z": 3.0}
}

Important: Do not include any other text or explanations. Just provide the JSON response. Do not include any additional text like "JSON".

ADDITIONAL INFORMATION ABOUT THE IMAGE:
This image name is %s.
Analyze it and generate the tags and default size accordingly.
`, imageName)
}

// RecognizeImage performs image recognition on the provided image URL
// It returns a structured response with tags and related information
func RecognizeImage(imageURL string, imageName string, r *http.Request) (*ImageRecognitionResponse, error) {
	// Create the system prompt for image recognition
	systemPrompt := CreateImageRecognitionPrompt(imageName)

	llmProvider, err := NewLLMProvider(ProviderOpenAI)
	if err != nil {
		return nil, fmt.Errorf("failed to create LLM provider: %v", err)
	}

	scheme := "http"
    if r.TLS != nil {
        scheme = "https"
    }
	fullURL := fmt.Sprintf("%s://%s", scheme, r.Host)

	// Create a user message that includes both text and image
	if !strings.HasPrefix(imageURL, "http://") && !strings.HasPrefix(imageURL, "https://") {
		imageURL = fullURL + imageURL
	}

	// Get the response from the LLM
	response, err := llmProvider.RecognizeImage(
		r.Context(), 
		systemPrompt,
		imageURL,
	)
	if err != nil {
		return nil, fmt.Errorf("image recognition failed: %v", err)
	}

	// Parse the JSON response
	var result ImageRecognitionResponse
	if err := json.Unmarshal([]byte(response), &result); err != nil {
		return nil, fmt.Errorf("failed to parse recognition response: %v", err)
	}

	// Ensure we got at least some tags
	if len(result.Tags) == 0 {
		return nil, fmt.Errorf("no tags were generated from the image")
	}

	// Ensure we got a default size, provide fallback if not
	if result.DefaultSize == nil {
		result.DefaultSize = &DefaultSize{X: 1.0, Y: 1.0, Z: 1.0}
	}

	return &result, nil
}
