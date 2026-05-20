package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
)

// DownloadAssetRequest represents the request structure for model download
type DownloadAssetRequest struct {
	AssetType string `json:"assetType"` // "models", "textures", "hdris"
	ID        string `json:"id"`
	Provider  string `json:"provider"` // "sketchfab" or "polyhaven"
}

// PolyHavenFileInfo represents file information from PolyHaven
type PolyHavenFileInfo struct {
	URL     string                       `json:"url"`
	Size    int64                        `json:"size"`
	Include map[string]PolyHavenFileInfo `json:"include,omitempty"`
}

// DownloadResult represents download information for an asset
type DownloadResult struct {
	MainFile        PolyHavenFileInfo            `json:"mainFile"`
	AdditionalFiles map[string]PolyHavenFileInfo `json:"additionalFiles,omitempty"`
	Resolution      string                       `json:"resolution,omitempty"`
	Format          string                       `json:"format,omitempty"`
}

// DownloadAssetResponse represents the response structure for model download
type DownloadAssetResponse struct {
	Success     bool           `json:"success"`
	Message     string         `json:"message"`
	DownloadURL string         `json:"downloadUrl,omitempty"` // For simple downloads (Sketchfab)
	Downloads   DownloadResult `json:"downloads,omitempty"`   // For complex downloads (PolyHaven)
	Thumbnail   string         `json:"thumbnail,omitempty"`   // Thumbnail URL for the asset
	AssetType   string         `json:"assetType"`
	Provider    string         `json:"provider"`
}

func init() {
	serverContext.Handle(http.MethodPost, "/api/AI/DownloadAsset", DownloadAssetHandler, constants.User)
}

func DownloadAssetHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondWithDownloadJSON(w, http.StatusMethodNotAllowed, DownloadAssetResponse{
			Success: false,
			Message: "Invalid request method",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// Parse request data
	var requestData DownloadAssetRequest
	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		respondWithDownloadJSON(w, http.StatusBadRequest, DownloadAssetResponse{
			Success: false,
			Message: "Invalid JSON data",
		})
		return
	}

	// Validate required fields
	if requestData.ID == "" {
		respondWithDownloadJSON(w, http.StatusBadRequest, DownloadAssetResponse{
			Success: false,
			Message: "Asset ID is required",
		})
		return
	}

	if requestData.Provider == "" {
		respondWithDownloadJSON(w, http.StatusBadRequest, DownloadAssetResponse{
			Success: false,
			Message: "Provider is required",
		})
		return
	}

	if requestData.AssetType == "" {
		respondWithDownloadJSON(w, http.StatusBadRequest, DownloadAssetResponse{
			Success: false,
			Message: "Asset type is required",
		})
		return
	}

	// Validate asset type
	if requestData.AssetType != "models" && requestData.AssetType != "textures" && requestData.AssetType != "hdris" {
		respondWithDownloadJSON(w, http.StatusBadRequest, DownloadAssetResponse{
			Success: false,
			Message: "Asset type must be 'models', 'textures', or 'hdris'",
		})
		return
	}

	// Validate provider
	if requestData.Provider != "sketchfab" && requestData.Provider != "polyhaven" && requestData.Provider != "meshy" {
		respondWithDownloadJSON(w, http.StatusBadRequest, DownloadAssetResponse{
			Success: false,
			Message: "Provider must be 'sketchfab' or 'polyhaven'",
		})
		return
	}

	// Route to appropriate provider handler
	switch requestData.Provider {
	case "sketchfab":
		handleSketchfabDownload(w, r.Context(), requestData)
	case "polyhaven":
		handlePolyHavenDownload(w, r.Context(), requestData)
	case "meshy":
		handleMeshyDownload(w, r.Context(), requestData)
	default:
		respondWithDownloadJSON(w, http.StatusBadRequest, DownloadAssetResponse{
			Success: false,
			Message: "Unsupported provider",
		})
	}
}

// handleSketchfabDownload handles download for Sketchfab assets
func handleSketchfabDownload(w http.ResponseWriter, ctx context.Context, request DownloadAssetRequest) {
	client := helpers.NewSketchfabClient()

	details, err := client.GetModelDetails(ctx, request.ID)

	if err != nil {
		respondWithDownloadJSON(w, http.StatusInternalServerError, DownloadAssetResponse{
			Success:   false,
			Message:   fmt.Sprintf("Failed to get model details: %v", err),
			AssetType: request.AssetType,
			Provider:  request.Provider,
		})
		return
	}

	downloadURL, err := client.GetModelDownloadURL(ctx, request.ID)
	if err != nil {
		respondWithDownloadJSON(w, http.StatusInternalServerError, DownloadAssetResponse{
			Success:   false,
			Message:   fmt.Sprintf("Failed to get download URL: %v", err),
			AssetType: request.AssetType,
			Provider:  request.Provider,
		})
		return
	}

	var thumbnail string
	if len(details.Thumbnails.Images) > 0 {
		thumbnail = details.Thumbnails.Images[0].URL
	}

	respondWithDownloadJSON(w, http.StatusOK, DownloadAssetResponse{
		Success:     true,
		Message:     "Download URL retrieved successfully",
		DownloadURL: downloadURL,
		Thumbnail:   thumbnail,
		AssetType:   request.AssetType,
		Provider:    request.Provider,
	})
}

// handlePolyHavenDownload handles download for PolyHaven assets
func handlePolyHavenDownload(w http.ResponseWriter, ctx context.Context, request DownloadAssetRequest) {
	client := helpers.NewPolyHavenClient()

	// Get asset files
	assetFiles, err := client.GetAssetFiles(ctx, request.ID)

	if err != nil {
		respondWithDownloadJSON(w, http.StatusInternalServerError, DownloadAssetResponse{
			Success:   false,
			Message:   fmt.Sprintf("Failed to get asset files: %v", err),
			AssetType: request.AssetType,
			Provider:  request.Provider,
		})
		return
	}

	fmt.Printf("PolyHaven asset files: %+v\n", assetFiles.Files)

	// Process files based on asset type
	downloads, err := processPolyHavenFiles(assetFiles.Files, request.AssetType)
	if err != nil {
		respondWithDownloadJSON(w, http.StatusInternalServerError, DownloadAssetResponse{
			Success:   false,
			Message:   fmt.Sprintf("Failed to process asset files: %v", err),
			AssetType: request.AssetType,
			Provider:  request.Provider,
		})
		return
	}

	respondWithDownloadJSON(w, http.StatusOK, DownloadAssetResponse{
		Success:   true,
		Message:   "Download information retrieved successfully",
		Downloads: downloads,
		Thumbnail: fmt.Sprintf("https://cdn.polyhaven.com/asset_img/thumbs/%s.png?width=256&height=256", request.ID),
		AssetType: request.AssetType,
		Provider:  request.Provider,
	})
}

func handleMeshyDownload(w http.ResponseWriter, ctx context.Context, request DownloadAssetRequest) {
	client, err := helpers.NewMeshyClient()
	if err != nil {
		respondWithDownloadJSON(w, http.StatusInternalServerError, DownloadAssetResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to create Meshy client: %v", err),
		})
		return
	}

	taskResult, err := helpers.MeshyWaitForTask(client, request.ID, 5*time.Second, 3*time.Minute)
	if err != nil {
		respondWithDownloadJSON(w, http.StatusInternalServerError, DownloadAssetResponse{
			Success: false,
			Message: fmt.Sprintf("Meshy task failed: %v", err),
		})
		return
	}

	// Important: Meshy download URLs are signed URLs that expire quickly.
	// We return the URL immediately so the frontend can download it.
	// If the URL expires, the task will fail and need to be regenerated.
	respondWithDownloadJSON(w, http.StatusOK, DownloadAssetResponse{
		Success:   true,
		Message:   "Meshy model ready - download URL expires in ~1 hour",
		Downloads: DownloadResult{MainFile: PolyHavenFileInfo{URL: taskResult.Model, Size: 0}},
		Thumbnail: taskResult.Thumbnail,
		AssetType: request.AssetType,
		Provider:  "meshy",
	})
}

// processPolyHavenFiles processes PolyHaven files based on asset type
func processPolyHavenFiles(files map[string]map[string]map[string]helpers.PolyHavenFile, assetType string) (DownloadResult, error) {
	var result DownloadResult
	result.AdditionalFiles = make(map[string]PolyHavenFileInfo)

	switch assetType {
	case "hdris":
		// For HDRIs, prefer 1k resolution and hdr format
		resolution := "1k"
		format := "hdr"

		// Look for hdri files
		if hdriFiles, exists := files["hdri"]; exists {
			if resFiles, hasRes := hdriFiles[resolution]; hasRes {
				if file, hasFormat := resFiles[format]; hasFormat {
					result.MainFile = PolyHavenFileInfo{
						URL:  file.URL,
						Size: file.Size,
					}
					result.Resolution = resolution
					result.Format = format
				} else {
					// Try other formats if hdr not available
					for fmt, file := range resFiles {
						result.MainFile = PolyHavenFileInfo{
							URL:  file.URL,
							Size: file.Size,
						}
						result.Resolution = resolution
						result.Format = fmt
						break
					}
				}
			} else {
				// Try other resolutions
				for res, resFiles := range hdriFiles {
					if file, hasFormat := resFiles[format]; hasFormat {
						result.MainFile = PolyHavenFileInfo{
							URL:  file.URL,
							Size: file.Size,
						}
						result.Resolution = res
						result.Format = format
						break
					}
				}
			}
		}

		if result.MainFile.URL == "" {
			return result, fmt.Errorf("no HDRI file found")
		}

	case "textures":
		// For textures, collect all texture maps
		resolution := "1k"
		format := "jpg"

		for mapType, resolutions := range files {
			if mapType != "blend" && mapType != "gltf" {
				if resFiles, hasRes := resolutions[resolution]; hasRes {
					if file, hasFormat := resFiles[format]; hasFormat {
						fileInfo := PolyHavenFileInfo{
							URL:  file.URL,
							Size: file.Size,
						}

						// Set the first texture as main file, others as additional
						if result.MainFile.URL == "" {
							result.MainFile = fileInfo
							result.Resolution = resolution
							result.Format = format
						} else {
							result.AdditionalFiles[mapType] = fileInfo
						}
					} else {
						// Try other formats
						for fmt, file := range resFiles {
							fileInfo := PolyHavenFileInfo{
								URL:  file.URL,
								Size: file.Size,
							}

							if result.MainFile.URL == "" {
								result.MainFile = fileInfo
								result.Resolution = resolution
								result.Format = fmt
							} else {
								result.AdditionalFiles[mapType] = fileInfo
							}
							break
						}
					}
				}
			}
		}

		if result.MainFile.URL == "" {
			return result, fmt.Errorf("no texture files found")
		}

	case "models":
		// For models, prefer gltf format
		format := "gltf"
		resolution := "1k"

		// Look for gltf files first
		if gltfFiles, exists := files["gltf"]; exists {
			if resFiles, hasRes := gltfFiles[resolution]; hasRes {
				if file, hasFormat := resFiles[format]; hasFormat {
					mainFile := PolyHavenFileInfo{
						URL:  file.URL,
						Size: file.Size,
					}

					// Handle include files
					if file.Include != nil {
						mainFile.Include = make(map[string]PolyHavenFileInfo)
						for path, includeFile := range file.Include {
							mainFile.Include[path] = PolyHavenFileInfo{
								URL:  includeFile.URL,
								Size: includeFile.Size,
							}
						}
					}

					result.MainFile = mainFile
					result.Resolution = resolution
					result.Format = format
				}
			}
		}

		// If no gltf, try other model formats
		if result.MainFile.URL == "" {
			for fileType, resolutions := range files {
				if fileType == "fbx" || fileType == "obj" || fileType == "blend" {
					for res, resFiles := range resolutions {
						for fmt, file := range resFiles {
							result.MainFile = PolyHavenFileInfo{
								URL:  file.URL,
								Size: file.Size,
							}
							result.Format = fmt
							result.Resolution = res
							goto found
						}
					}
				}
			}
		found:
		}

		if result.MainFile.URL == "" {
			return result, fmt.Errorf("no model file found")
		}

	default:
		return result, fmt.Errorf("unsupported asset type: %s", assetType)
	}

	return result, nil
}

// respondWithDownloadJSON sends a JSON response for download endpoints
func respondWithDownloadJSON(w http.ResponseWriter, status int, response DownloadAssetResponse) {
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Failed to encode JSON response", http.StatusInternalServerError)
	}
}
