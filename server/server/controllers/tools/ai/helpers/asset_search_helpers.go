package helpers

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

const PROMPT = `
You are an AI assistant designed to help users find assets for their 3D scenes. Your task is to determine if search is required based on user query. If you will decide that search is required then create search params.
The assets can be from four sources: PolyHaven, Sketchfab, Local, and Meshy.

When searching for assets, consider the following:
1. PolyHaven
	- For objects/models: asset_type="models"
	- For materials/textures: asset_type="textures"
	- For environment lighting: asset_type="hdris"
2. Sketchfab
	Sketchfab is good at Realistic models, and has a wider variety of models than PolyHaven.
	- For objects/models: generate a search query based on the user input
	- Sketchfab has a wider variety of models than PolyHaven, especially for specific subjects
3. Local
	Local assets are already available in the system
	- For objects/models: asset_type="models"
	- To find local objects/model generate descriptive tags based on the user input. Target at least 5 descriptive tags.
	- Instructions for generating tags:
		- Include general terms that describe the object's category or type.
		- Add specific adjectives that highlight the object's appearance, mood, or style.
		- Include related terms that evoke the object's context, setting, or theme.
		- Aim for at least 5 relevant tags that capture the essence of the prompt.
		- Tags should be always lowercase.
4. Meshy
	- For generating custom 3D models from a text prompt
	- Use Meshy if the asset is unique or not found in local/PolyHaven/Sketchfab
	- Only for asset_type="models"

3. Recommended asset source priority:
	- For specific existing objects: First try Local, then Sketchfab, then PolyHaven, then Meshy
	- For generic objects/furniture: First try PolyHaven, then Local, then Sketchfab, then Meshy
	- For environment lighting: Use PolyHaven HDRIs
	- For materials/textures: Use PolyHaven textures
	- For custom or unique items not available in libraries: return an empty list and status "failed"
	- Respond with object containing the following fields:
	- search_required: true/false (true if search is required)
	- searches: array of search objects, each containing:
		- asset_type: "models", "textures", or "hdris"
		- search_query: the query to use for searching
		- providers_order: array of provider names to use for searching, e.g. ["polyhaven","sketchfab","local","meshy"] always provide provider order even if there is only one provider
		- tags: array of descriptive tags (only for local models, optional for others)
		- animated: boolean (optional, true if the model has to be animated, false if it is for sure static model. No value means that it is not known if the model is animated or not. Only for Sketchfab models)

Example queries:
User query: "I need a realistic model of a car"
Response: {
	"search_required": true,
	"searches": [{
		"asset_type": "models",
		"search_query": "realistic car",
		"providers_order": ["local", "sketchfab", "polyhaven", "meshy"],
		"tags": ["car", "vehicle", "realistic", "automobile", "transportation"]
	}]
}

User query: "I need a texture for a wooden floor and a realistic car model"
Response: {
	"search_required": true,
	"searches": [
		{
			"asset_type": "textures",
			"search_query": "wooden floor texture",
			"providers_order": ["polyhaven"]
		},
		{
			"asset_type": "models",
			"search_query": "realistic car",
			"providers_order": ["local", "sketchfab", "polyhaven", "meshy"],
			"tags": ["car", "vehicle", "realistic", "automobile", "transportation"]
		}
	]
}

User query: "I need a realistinc monkey and giraffe models"
Response: {
	"search_required": true,
	"searches": [{
		"asset_type": "models",
		"search_query": "realistic monkey",
		"providers_order": ["local", "sketchfab", "polyhaven", "meshy"],
		"tags": ["monkey", "animal", "realistic", "primate", "wildlife"],
		"animated": true
	}, {
		"asset_type": "models",
		"search_query": "realistic giraffe",
		"providers_order": ["local", "sketchfab", "polyhaven", "meshy"],
		"tags": ["giraffe", "animal", "realistic", "tall", "wildlife"],
		"animated": true
	}]
}

User query: "I need a model of a chair"
Response: {
	"search_required": true,
	"searches": [{
		"asset_type": "models",
		"search_query": "chair",
		"providers_order": ["polyhaven", "local", "sketchfab", "meshy"],
		"tags": ["chair", "furniture", "seat", "interior", "home"],
		"animated": false
	}]
}

User query: "I need a HDRI for outdoor lighting"
Response: {
	"search_required": true,
	"searches": [{
		"asset_type": "hdris",
		"search_query": "outdoor lighting",
		"providers_order": ["polyhaven"]
	}]
}

User query: "Create primitive objects like cubes and spheres"
Response: {
	"search_required": false,
	"searches": []
}

IMPORTANT: Respond with ONLY the JSON object with search_required and searches fields. Do not include any additional text or explanations.
`

func GetCategoriesPrompt(categoriesData string) string {
	return fmt.Sprintf(`
	You are an AI assistant designed to help users find assets for their 3D scenes. Your task is to determine which categories to use for searching based on the query.
	Categories data contains key value pairs where key is the category name and value is a number of models in this category.
	example queries:
	User query: "I need a realistic model of a car"
	Response: ["Vehicles"]

	Categories data: %s

	Important: Respond with ONLY the JSON array of categories that are relevant to the user query. Do not include any additional text or explanations.
`, categoriesData)
}


// AssetSearchParams represents the parameters for asset Search
type AssetSearchParams struct {
	SearchRequired bool              `json:"search_required"`
	Searches       []AssetSearchItem `json:"searches"`
}
// AssetSearchItem represents a single asset search item
type AssetSearchItem struct {
	AssetType      string   `json:"asset_type"`      // e.g., "models", "textures", "hdris"
	SearchQuery    string   `json:"search_query"`    // The query to use for searching
	ProvidersOrder []string `json:"providers_order"` // Order of providers to use for searching
	Tags           []string `json:"tags,omitempty"`  // Descriptive tags for local models (optional)
	Animated       bool     `json:"animated,omitempty"` // True if the model is animated (optional, only for Sketchfab models)
}
// GenerateAssetSearchParams generates asset search parameters based on user query
func GenerateAssetSearchParams(ctx context.Context, userQuery string, providerType ProviderType) (*AssetSearchParams, error) {
	// Prepare the request payload
	payload := map[string]string{
		"query": userQuery,
	}

	// Convert payload to JSON
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal JSON: %w", err)
	}

	// Send the request to the LLM API
	resp, err := processLLMRequest(ctx, providerType, PROMPT, string(jsonPayload))
	if err != nil {
		return nil, fmt.Errorf("failed to send request to LLM API: %w", err)
	}

	var searchParams AssetSearchParams
	if err := json.NewDecoder(strings.NewReader(resp)).Decode(&searchParams); err != nil {
		return nil, fmt.Errorf("failed to decode LLM response: %w", err)
	}

	return &searchParams, nil
}



func ChooseCategoriesForSearch(ctx context.Context, providerType ProviderType, query string, categoriesData map[string]int ) []string {
	categoriesJSON, err := json.Marshal(categoriesData)
	if err != nil {
		return nil
	}

	prompt := GetCategoriesPrompt(string(categoriesJSON))
	resp, err := processLLMRequest(ctx, providerType, prompt, fmt.Sprintf(`{"query": %q}`, query))
	if err != nil {
		return nil
	}

	var categories []string
	if err := json.Unmarshal([]byte(resp), &categories); err != nil {
		return nil
	}

	return categories
	
}

func processLLMRequest(ctx context.Context, providerType ProviderType, prompt string, userMessage string) (string, error) {
	llmProvider, err := NewLLMProvider(providerType)
	if err != nil {
		return "", err
	}

	return llmProvider.CreateCompletion(ctx, prompt, userMessage)
}