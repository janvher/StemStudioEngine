package helper

import (
	"testing"
)

func TestConvertToNewAssetURL(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Model asset",
			input:    "/Upload/Model/20250924003457_754133/Plant_Rose_RoseSprout.glb",
			expected: "/api/Asset/Download/model/20250924003457_754133/Plant_Rose_RoseSprout.glb",
		},
		{
			name:     "Texture asset",
			input:    "/Upload/Texture/123456789/texture.jpg",
			expected: "/api/Asset/Download/texture/123456789/texture.jpg",
		},
		{
			name:     "Audio asset",
			input:    "/Upload/Audio/987654321/sound.mp3",
			expected: "/api/Asset/Download/audio/987654321/sound.mp3",
		},
		{
			name:     "Video asset",
			input:    "/Upload/Video/111222333/video.mp4",
			expected: "/api/Asset/Download/video/111222333/video.mp4",
		},
		{
			name:     "Image asset",
			input:    "/Upload/Image/444555666/image.png",
			expected: "/api/Asset/Download/image/444555666/image.png",
		},
		{
			name:     "Avatar asset",
			input:    "/Upload/Avatar/777888999/avatar.fbx",
			expected: "/api/Asset/Download/avatar/777888999/avatar.fbx",
		},
		{
			name:     "Animation asset",
			input:    "/Upload/Animation/000111222/animation.json",
			expected: "/api/Asset/Download/animation/000111222/animation.json",
		},
		{
			name:     "Nested file path",
			input:    "/Upload/Model/123456/folder/subfolder/model.glb",
			expected: "/api/Asset/Download/model/123456/folder/subfolder/model.glb",
		},
		{
			name:     "Path without leading slash",
			input:    "Upload/Model/123456/model.glb",
			expected: "/api/Asset/Download/model/123456/model.glb",
		},
		{
			name:     "Unknown asset type - use lowercase",
			input:    "/Upload/Custom/123456/file.ext",
			expected: "/api/Asset/Download/custom/123456/file.ext",
		},
		{
			name:     "Invalid path format - too few parts",
			input:    "/Upload/Model",
			expected: "Upload/Model",
		},
		{
			name:     "Invalid path format - not Upload path",
			input:    "/SomeOtherPath/Model/123456/file.glb",
			expected: "SomeOtherPath/Model/123456/file.glb",
		},
		{
			name:     "Empty path",
			input:    "",
			expected: "",
		},
		{
			name:     "Path with special characters in filename",
			input:    "/Upload/Model/123456/My Model (Version 2).glb",
			expected: "/api/Asset/Download/model/123456/My Model (Version 2).glb",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ConvertToNewAssetURL(tt.input)
			if result != tt.expected {
				t.Errorf("ConvertToNewAssetURL(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

func TestConvertToNewAssetURL_AllAssetTypes(t *testing.T) {
	// Test all supported asset type mappings
	assetTypeMappings := map[string]string{
		"Model":     "model",
		"Image":     "image",
		"Texture":   "texture",
		"Video":     "video",
		"Animation": "animation",
		"Avatar":    "avatar",
		"Audio":     "audio",
	}

	for dirName, expectedType := range assetTypeMappings {
		t.Run(dirName+"_mapping", func(t *testing.T) {
			input := "/Upload/" + dirName + "/123456/test.file"
			expected := "/api/Asset/Download/" + expectedType + "/123456/test.file"
			result := ConvertToNewAssetURL(input)
			if result != expected {
				t.Errorf("ConvertToNewAssetURL(%q) = %q, want %q", input, result, expected)
			}
		})
	}
}

func BenchmarkConvertToNewAssetURL(b *testing.B) {
	input := "/Upload/Model/20250924003457_754133/Plant_Rose_RoseSprout.glb"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ConvertToNewAssetURL(input)
	}
}