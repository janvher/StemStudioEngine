package url_conversion

import (
	"testing"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/helper"
)

// Test URL conversion for all asset types used in scene imports
func TestBasicURLConversion(t *testing.T) {
	// Test that all asset types convert correctly
	assetURLs := map[string]string{
		// Models/Meshes (most common in scene imports)
		"/Upload/Model/20250924001122_345678/building.glb": "/api/Asset/Download/model/20250924001122_345678/building.glb",
		"/Upload/Model/id123/character.fbx":                "/api/Asset/Download/model/id123/character.fbx",

		// Textures (used as material properties)
		"/Upload/Texture/id456/wall.jpg":   "/api/Asset/Download/texture/id456/wall.jpg",
		"/Upload/Texture/id789/normal.png": "/api/Asset/Download/texture/id789/normal.png",

		// Images (used in UI behaviors, backgrounds, etc.)
		"/Upload/Image/id111/button.png": "/api/Asset/Download/image/id111/button.png",
		"/Upload/Image/id222/banner.jpg": "/api/Asset/Download/image/id222/banner.jpg",

		// Audio (used in audio behaviors)
		"/Upload/Audio/id333/music.mp3": "/api/Asset/Download/audio/id333/music.mp3",
		"/Upload/Audio/id444/sound.wav": "/api/Asset/Download/audio/id444/sound.wav",

		// Video (used in video textures, screens)
		"/Upload/Video/id555/intro.mp4":  "/api/Asset/Download/video/id555/intro.mp4",
		"/Upload/Video/id666/loop.webm":  "/api/Asset/Download/video/id666/loop.webm",

		// Animations (character animations)
		"/Upload/Animation/id777/walk.vmd":  "/api/Asset/Download/animation/id777/walk.vmd",
		"/Upload/Animation/id888/dance.bvh": "/api/Asset/Download/animation/id888/dance.bvh",

		// Avatars (VR/AR avatars)
		"/Upload/Avatar/id999/player.vrm": "/api/Asset/Download/avatar/id999/player.vrm",
		"/Upload/Avatar/id000/npc.glb":    "/api/Asset/Download/avatar/id000/npc.glb",

		// General files (scripts, configs, etc.)
		"/Upload/File/id111/script.js":   "/api/Asset/Download/file/id111/script.js",
		"/Upload/File/id222/config.json": "/api/Asset/Download/file/id222/config.json",
	}

	for oldURL, expectedNewURL := range assetURLs {
		result := helper.ConvertToNewAssetURL(oldURL)
		if result != expectedNewURL {
			t.Errorf("Asset URL conversion failed:\n  Input: %q\n  Got: %q\n  Want: %q",
				oldURL, result, expectedNewURL)
		}
	}
}

// Test edge cases that might occur in asset handling
func TestBasicURLConversionEdgeCases(t *testing.T) {
	edgeCases := map[string]string{
		// Files with multiple dots in filename
		"/Upload/Model/id123/model.v1.0.glb": "/api/Asset/Download/model/id123/model.v1.0.glb",

		// Files with spaces (should be URL encoded in real usage)
		"/Upload/Image/id456/my image.jpg": "/api/Asset/Download/image/id456/my image.jpg",

		// Files with special characters
		"/Upload/Audio/id789/sound-effect_01.mp3": "/api/Asset/Download/audio/id789/sound-effect_01.mp3",

		// Very long filenames
		"/Upload/Model/id111/very_long_filename_with_many_characters_and_details.glb":
			"/api/Asset/Download/model/id111/very_long_filename_with_many_characters_and_details.glb",
	}

	for oldURL, expectedNewURL := range edgeCases {
		result := helper.ConvertToNewAssetURL(oldURL)
		if result != expectedNewURL {
			t.Errorf("Edge case URL conversion failed:\n  Input: %q\n  Got: %q\n  Want: %q",
				oldURL, result, expectedNewURL)
		}
	}
}

// Test unknown asset types fallback behavior
func TestBasicUnknownAssetTypes(t *testing.T) {
	unknownTypes := map[string]string{
		"/Upload/CustomType/id123/file.ext":     "/api/Asset/Download/customtype/id123/file.ext",
		"/Upload/NewFormat/id456/data.xyz":      "/api/Asset/Download/newformat/id456/data.xyz",
		"/Upload/Plugin/id789/extension.plugin": "/api/Asset/Download/plugin/id789/extension.plugin",
	}

	for oldURL, expectedNewURL := range unknownTypes {
		result := helper.ConvertToNewAssetURL(oldURL)
		if result != expectedNewURL {
			t.Errorf("Unknown type URL conversion failed:\n  Input: %q\n  Got: %q\n  Want: %q",
				oldURL, result, expectedNewURL)
		}
	}
}

// Test that invalid paths are handled gracefully
func TestBasicInvalidPaths(t *testing.T) {
	// Test cases and their expected outputs
	invalidCases := map[string]string{
		"":                        "",                      // Empty string
		"no-slash":                "no-slash",              // No leading slash
		"/Upload":                 "Upload",                // Too short (slash removed)
		"/Upload/Type":            "Upload/Type",           // Missing ID and filename (slash removed)
		"/NotUpload/Type/id/file": "NotUpload/Type/id/file", // Wrong prefix (slash removed)
	}

	for invalidPath, expected := range invalidCases {
		result := helper.ConvertToNewAssetURL(invalidPath)
		// For invalid paths, the function should return the input (with leading slash removed if present)
		if result != expected {
			t.Errorf("Invalid path handling: got %q, want %q", result, expected)
		}
	}
}