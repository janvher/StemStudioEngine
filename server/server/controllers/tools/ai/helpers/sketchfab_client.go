package helpers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
)

// SketchfabClient provides access to Sketchfab API
type SketchfabClient struct {
	BaseURL string
	APIKey  string
}

// SketchfabModel represents a model from Sketchfab
type SketchfabModel struct {
	UID            string              `json:"uid"`
	Name           string              `json:"name"`
	Description    string              `json:"description"`
	VertexCount    int                 `json:"vertexCount"`
	FaceCount      int                 `json:"faceCount"`
	AnimationCount int                 `json:"animationCount"`
	IsDownloadable bool                `json:"isDownloadable"`
	Category       string              `json:"category"`
	Thumbnails     SketchfabThumbnails `json:"thumbnails"`
}

type SketchfabThumbnails struct {
	Images []SketchfabImage `json:"images"`
}

type SketchfabImage struct {
	UID    string `json:"uid"`
	URL    string `json:"url"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
	Size   int    `json:"size"`
}

// User represents the author of a Sketchfab model
type User struct {
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	Avatar      string `json:"avatar"`
}

// SketchfabSearchResult represents search results from Sketchfab
type SketchfabSearchResult struct {
	Results []SketchfabModel `json:"results"`
}

// NewSketchfabClient creates a new Sketchfab API client
func NewSketchfabClient() *SketchfabClient {
	apiKey := os.Getenv("SKETCHFAB_API_KEY")
	return &SketchfabClient{
		BaseURL: "https://api.sketchfab.com/v3",
		APIKey:  apiKey,
	}
}

// SearchModels searches for models on Sketchfab
func (c *SketchfabClient) SearchModels(ctx context.Context, query string, options SketchfabSearchOptions) (*SketchfabSearchResult, error) {
	// Build query parameters
	params := url.Values{}

	params.Add("type", "models") // Default query parameter
	if query != "" {
		params.Add("q", query)
	}

	if options.Downloadable {
		params.Add("downloadable", "true")
	}

	if options.Free {
		params.Add("max_price", "0")
	}

	if options.Animated {
		params.Add("animated", "true")
	}

	if options.License != "" {
		params.Add("license", options.License)
	}

	if len(options.Categories) > 0 {
		params.Add("categories", url.QueryEscape(strings.Join(options.Categories, ",")))
	}

	if options.MaxFaces > 0 {
		params.Add("max_face_count", fmt.Sprintf("%d", options.MaxFaces))
	}

	if options.MinFaces > 0 {
		params.Add("min_face_count", fmt.Sprintf("%d", options.MinFaces))
	}

	if options.SortBy != "" {
		params.Add("sort_by", options.SortBy) // "-likeCount", "-viewCount", "-publishedAt", "relevance"
	}

	if options.Count > 0 {
		params.Add("count", fmt.Sprintf("%d", options.Count))
	} else {
		params.Add("count", "24") // Default count
	}

	// Construct URL
	requestURL := fmt.Sprintf("%s/search?%s", c.BaseURL, params.Encode())

	// Create request
	req, err := http.NewRequestWithContext(ctx, "GET", requestURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "AI-3D-Sandbox/1.0")

	if c.APIKey != "" {
		req.Header.Set("Authorization", "Token "+c.APIKey)
	}

	// Execute request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status %d", resp.StatusCode)
	}

	// Parse response
	var result SketchfabSearchResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}

// SketchfabSearchOptions represents search options for Sketchfab
type SketchfabSearchOptions struct {
	Downloadable bool
	Free         bool
	Animated     bool
	License      string // "CC0", "CC-BY", "CC-BY-SA", "CC-BY-NC", "CC-BY-NC-SA"
	Categories   []string
	MaxFaces     int
	MinFaces     int
	SortBy       string // "-likeCount", "-viewCount", "-publishedAt", "relevance"
	Count        int
}

// GetModelDetails gets detailed information about a specific model
func (c *SketchfabClient) GetModelDetails(ctx context.Context, modelUID string) (*SketchfabModel, error) {
	requestURL := fmt.Sprintf("%s/models/%s", c.BaseURL, modelUID)

	req, err := http.NewRequestWithContext(ctx, "GET", requestURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "AI-3D-Sandbox/1.0")

	if c.APIKey != "" {
		req.Header.Set("Authorization", "Token "+c.APIKey)
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status %d", resp.StatusCode)
	}

	var model SketchfabModel
	if err := json.NewDecoder(resp.Body).Decode(&model); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &model, nil
}

// GetModelDownloadURL gets the download URL for a model (requires authentication and appropriate license)
func (c *SketchfabClient) GetModelDownloadURL(ctx context.Context, modelUID string) (string, error) {
	if c.APIKey == "" {
		return "", fmt.Errorf("API key required for downloading models")
	}

	requestURL := fmt.Sprintf("%s/models/%s/download", c.BaseURL, modelUID)

	req, err := http.NewRequestWithContext(ctx, "GET", requestURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Token "+c.APIKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("download request failed with status %d", resp.StatusCode)
	}

	var downloadResponse struct {
		Source struct {
			URL     string `json:"url"`
			Size    int64  `json:"size"`
			Expires int    `json:"expires"`
		} `json:"source"`
		GLB struct {
			URL     string `json:"url"`
			Size    int64  `json:"size"`
			Expires int    `json:"expires"`
		} `json:"glb"`
		GLTF struct {
			URL     string `json:"url"`
			Size    int64  `json:"size"`
			Expires int    `json:"expires"`
		} `json:"gltf"`
		USDZ struct {
			URL     string `json:"url"`
			Size    int64  `json:"size"`
			Expires int    `json:"expires"`
		} `json:"usdz"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&downloadResponse); err != nil {
		return "", fmt.Errorf("failed to parse download response: %w", err)
	}

	var url string
	if downloadResponse.GLB.URL != "" {
		url = downloadResponse.GLB.URL
	} else if downloadResponse.GLTF.URL != "" {
		url = downloadResponse.GLTF.URL
	} else if downloadResponse.Source.URL != "" {
		url = downloadResponse.Source.URL
	} else {
		return "", fmt.Errorf("no download URL found")
	}

	return url, nil
}

type CategoriesRelated struct {
	URI  string `json:"uri"`
	UID  string `json:"uid"`
	Name string `json:"name"`
	Slug string `json:"Slug"`
}

type CategoriesResponse struct {
	Results []CategoriesRelated `json:"results"`
}

func (c *SketchfabClient) GetAvailableCategories() (*CategoriesResponse, error) {
	requestURL := fmt.Sprintf("%s/categories", c.BaseURL)

	req, err := http.NewRequest("GET", requestURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "AI-3D-Sandbox/1.0")

	if c.APIKey != "" {
		req.Header.Set("Authorization", "Token "+c.APIKey)
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status %d", resp.StatusCode)
	}

	var categoriesResp CategoriesResponse
	if err := json.NewDecoder(resp.Body).Decode(&categoriesResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %v", err)
	}

	return &categoriesResp, nil
}
