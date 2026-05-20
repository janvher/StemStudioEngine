package object_generation

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/byok"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
)

func init() {
	serverContext.Handle(http.MethodPost, "/api/AI/ObjectGeneration/Tripo/Upload", UploadImage, constants.None)
}

// UploadImage uploads an image to Tripo3D API and returns the response.
func UploadImage(w http.ResponseWriter, r *http.Request) {
	byokKey, _ := byok.ResolveFromRequest(r, "tripo", byok.ProviderEnvVars("tripo")...)
	client, err := helpers.NewTripoClientWithKey(byokKey)
	if err != nil {
		http.Error(w, "API client initialization failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Parse the multipart form
	err = r.ParseMultipartForm(serverContext.Config.Upload.MaxSize)
	if err != nil {
		http.Error(w, "Failed to read uploaded file", http.StatusBadRequest)
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Failed to read uploaded file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Create a buffer to store the file
	var requestBody bytes.Buffer
	writer := multipart.NewWriter(&requestBody)
	part, err := writer.CreateFormFile("file", header.Filename)
	if err != nil {
		http.Error(w, "Failed to create form file", http.StatusInternalServerError)
		return
	}
	_, err = io.Copy(part, file)
	if err != nil {
		http.Error(w, "Failed to copy file", http.StatusInternalServerError)
		return
	}
	writer.Close()

	// Create a custom request that uses a multipart form
	reqUrl := fmt.Sprintf("%s/upload", client.GetBaseURL())
	req, err := http.NewRequest("POST", reqUrl, &requestBody)
	if err != nil {
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", client.GetAuthHeader())

	httpClient := &http.Client{}
	resp, err := httpClient.Do(req)
	if err != nil {
		http.Error(w, "Failed to send request", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("Failed to upload image, status code: %d", resp.StatusCode), http.StatusInternalServerError)
		return
	}

	// Decode response from Tripo3D
	var responseBody map[string]interface{}
	err = json.NewDecoder(resp.Body).Decode(&responseBody)
	if err != nil {
		http.Error(w, "Failed to parse response", http.StatusInternalServerError)
		return
	}

	// Return response to the client
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(responseBody)
}
