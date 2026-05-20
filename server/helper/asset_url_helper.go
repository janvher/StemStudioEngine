package helper

import (
	"fmt"
	"strings"
)

// ConvertToNewAssetURL converts old Upload path format to new API path format
// Converts "/Upload/Model/id/file.glb" to "/api/Asset/Download/model/id/file.glb"
func ConvertToNewAssetURL(oldPath string) string {
	// Remove leading slash if present
	oldPath = strings.TrimPrefix(oldPath, "/")

	// Split the path into components
	parts := strings.Split(oldPath, "/")
	if len(parts) < 3 {
		// Invalid path format, return as-is or return error
		return oldPath
	}

	if parts[0] != "Upload" {
		// Not an Upload path, return as-is
		return oldPath
	}

	typeDir := parts[1]
	uniqueID := parts[2]
	filename := strings.Join(parts[3:], "/") // Support nested files

	// Map directory names to asset types (same as backend mapping)
	var assetType string
	switch typeDir {
	case "Model":
		assetType = "model"
	case "Image":
		assetType = "image"
	case "Texture":
		assetType = "texture"
	case "Video":
		assetType = "video"
	case "Animation":
		assetType = "animation"
	case "Avatar":
		assetType = "avatar"
	case "Audio":
		assetType = "audio"
	default:
		// Use lowercase version of unknown types
		assetType = strings.ToLower(typeDir)
	}

	// Build new API URL format
	return fmt.Sprintf("/api/Asset/Download/%s/%s/%s", assetType, uniqueID, filename)
}