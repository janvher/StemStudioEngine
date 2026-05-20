package helpers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/helper"
)

// PolyHavenClient provides access to PolyHaven API for HDRs, textures, and models
type PolyHavenClient struct {
	BaseURL string
}

// PolyHavenAsset represents an asset from PolyHaven
type PolyHavenAsset struct {
	ID          string                      `json:"id"`
	Name        string                      `json:"name"`
	Description string                      `json:"description"`
	Tags        []string                    `json:"tags"`
	Type        string                      `json:"type"`
	Files       map[string]PolyHavenFile   `json:"files"`
	Preview     string                      `json:"preview"`
	Category    string                      `json:"category"`
}

// PolyHavenFile represents a file variant of an asset
type PolyHavenFile struct {
	URL     string                            `json:"url"`
	Size    int64                             `json:"size"`
	Format  string                            `json:"format"`
	Include map[string]PolyHavenIncludeFile  `json:"include,omitempty"`
}

// PolyHavenIncludeFile represents an included file in a PolyHaven asset
type PolyHavenIncludeFile struct {
	URL  string `json:"url"`
	Size int64  `json:"size"`
}

// PolyHavenAssetFiles represents the complete file structure for a PolyHaven asset
type PolyHavenAssetFiles struct {
	Files map[string]map[string]map[string]PolyHavenFile `json:"-"` // map[fileType][resolution][format]PolyHavenFile
}

// PolyHavenSearchResult represents search results
type PolyHavenSearchResult struct {
	Assets []PolyHavenAsset `json:"assets"`
	Count  int              `json:"count"`
}

// NewPolyHavenClient creates a new PolyHaven API client
func NewPolyHavenClient() *PolyHavenClient {
	return &PolyHavenClient{
		BaseURL: "https://api.polyhaven.com",
	}
}

// SearchAssets searches for assets on PolyHaven
func (c *PolyHavenClient) SearchAssets(ctx context.Context, query string, assetType string, categories []string, limit int) (*PolyHavenSearchResult, error) {
	// Build query parameters
	params := url.Values{}
	if query != "" {
		params.Add("search", query)
	}
	if assetType != "" {
		params.Add("type", assetType) // hdris, textures, models
	}

	if len(categories) > 0 {
		params.Add("categories", strings.Join(categories, ",")) // Join categories with commas
	}

	// Construct URL
	requestURL := fmt.Sprintf("%s/assets?%s", c.BaseURL, params.Encode())

	// Create request
	req, err := http.NewRequestWithContext(ctx, "GET", requestURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "AI-3D-Sandbox/1.0")

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
	var rawAssets map[string]map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&rawAssets); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	var filteredAssets []PolyHavenAsset
	for id, raw := range rawAssets {
		asset := PolyHavenAsset{
			ID:          id,
			Name:        helper.GetStringFromField(raw, "name", ""),
			Description: "", // Not present in response
			Tags:        getStringSlice(raw, "tags"),
			Type:        fmt.Sprintf("%v", raw["type"]),
			Files:       nil, // Not present in response
			Preview:     helper.GetStringFromField(raw, "thumbnail_url", ""),
			Category:    "", // Not present directly
		}

		// If categories exist, set the first as Category
		if cats := getStringSlice(raw, "categories"); len(cats) > 0 {
			asset.Category = cats[0]
		}

		filteredAssets = append(filteredAssets, asset)

		// Apply limit
		if limit > 0 && len(filteredAssets) >= limit {
			break
		}
	}

	return &PolyHavenSearchResult{
		Assets: filteredAssets,
		Count:  len(filteredAssets),
	}, nil
}

// GetAssetFiles gets detailed information about a specific asset
func (c *PolyHavenClient) GetAssetFiles(ctx context.Context, assetID string) (*PolyHavenAssetFiles, error) {
	requestURL := fmt.Sprintf("%s/files/%s", c.BaseURL, assetID)

	req, err := http.NewRequestWithContext(ctx, "GET", requestURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "AI-3D-Sandbox/1.0")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status %d", resp.StatusCode)
	}

	var rawResponse map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&rawResponse); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	// Parse the nested structure
	files := make(map[string]map[string]map[string]PolyHavenFile)
	for fileType, fileTypeData := range rawResponse {
		if fileTypeMap, ok := fileTypeData.(map[string]interface{}); ok {
			files[fileType] = make(map[string]map[string]PolyHavenFile)
			for resolution, resolutionData := range fileTypeMap {
				if resolutionMap, ok := resolutionData.(map[string]interface{}); ok {
					files[fileType][resolution] = make(map[string]PolyHavenFile)
					for format, formatData := range resolutionMap {
						if formatMap, ok := formatData.(map[string]interface{}); ok {
							file := PolyHavenFile{
								URL:    helper.GetStringFromField(formatMap, "url", ""),
								Size:   helper.GetInt64FromField(formatMap, "size", 0),
								Format: format,
							}

							// Handle include files if present
							if includeData, hasInclude := formatMap["include"]; hasInclude {
								if includeMap, ok := includeData.(map[string]interface{}); ok {
									file.Include = make(map[string]PolyHavenIncludeFile)
									for includePath, includeInfo := range includeMap {
										if includeInfoMap, ok := includeInfo.(map[string]interface{}); ok {
											file.Include[includePath] = PolyHavenIncludeFile{
												URL:  helper.GetStringFromField(includeInfoMap, "url", ""),
												Size: helper.GetInt64FromField(includeInfoMap, "size", 0),
											}
										}
									}
								}
							}
							
							files[fileType][resolution][format] = file
						}
					}
				}
			}
		}
	}

	return &PolyHavenAssetFiles{Files: files}, nil
}

type PolyHavenCategories map[string]int

// GetAvailableCategories fetches available categories for a given asset type from PolyHaven
func (c *PolyHavenClient) GetAvailableCategories(ctx context.Context, assetType string) (PolyHavenCategories, error) {
	requestURL := fmt.Sprintf("%s/categories/%s", c.BaseURL, assetType)
	if assetType == "" {
		return nil, fmt.Errorf("asset type must be specified")
	}

	req, err := http.NewRequestWithContext(ctx, "GET", requestURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "AI-3D-Sandbox/1.0")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status %d", resp.StatusCode)
	}

	var categories PolyHavenCategories
	if err := json.NewDecoder(resp.Body).Decode(&categories); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return categories, nil
}


// getStringSlice safely extracts a []string from a map by key.
func getStringSlice(m map[string]interface{}, key string) []string {
	if v, ok := m[key]; ok {
		switch vv := v.(type) {
		case []interface{}:
			var result []string
			for _, item := range vv {
				if s, ok := item.(string); ok {
					result = append(result, s)
				}
			}
			return result
		case []string:
			return vv
		}
	}
	return nil
}

