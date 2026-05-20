package helpers

import (
	"bufio"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/byok"
)

const (
	// URLs for Google's Gemini API
	geminiAPIEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/"
)

// GeminiClient represents a Gemini API client
type GeminiClient struct {
	apiKey string
	model  string
}

// NewGeminiClient creates a new instance of the Gemini client using only the
// server environment for credentials.
func NewGeminiClient() (*GeminiClient, error) {
	return NewGeminiClientWithKey("")
}

// NewGeminiClientWithKey is the BYOK-aware constructor. Precedence: env →
// byokKey arg → BYOK session store, via byok.LookupKey.
func NewGeminiClientWithKey(byokKey string) (*GeminiClient, error) {
	apiKey, _ := byok.LookupKey("gemini", []string{"GEMINI_API_KEY"}, byokKey)
	if apiKey == "" {
		return nil, fmt.Errorf("Gemini API key not set")
	}

	model := os.Getenv("GEMINI_MODEL")
	if model == "" {
		model = "gemini-3-pro-preview" // Default model (Gemini 3)
	}

	return &GeminiClient{
		apiKey: apiKey,
		model:  model,
	}, nil
}

// CreateCompletion implements the LLMProvider interface
func (c *GeminiClient) CreateCompletion(ctx context.Context, systemContent, userContent string) (string, error) {
	messages := []Message{
		{
			Role:    RoleUser,
			Content: userContent,
		},
	}

	return c.CreateCompletionWithHistory(ctx, systemContent, messages)
}

// GeminiMessage represents a message in the Gemini API format
type GeminiMessage struct {
	Role    string `json:"role"`
	Content string `json:"text"`
}

// CreateCompletionWithHistory implements the LLMProvider interface
func (c *GeminiClient) CreateCompletionWithHistory(ctx context.Context, systemContent string, messages []Message) (string, error) {
	geminiMessages := make([]GeminiMessage, 0, len(messages)+1)

	// In Gemini, system content is added as a "system" role message
	if systemContent != "" {
		geminiMessages = append(geminiMessages, GeminiMessage{
			Role:    "system",
			Content: systemContent,
		})
	}

	for _, msg := range messages {
		role := "user"
		if msg.Role == RoleAssistant {
			role = "model"
		}

		geminiMessages = append(geminiMessages, GeminiMessage{
			Role:    role,
			Content: msg.Content,
		})
	}

	payload := map[string]interface{}{
		"contents": geminiMessages,
		"generationConfig": map[string]interface{}{
			"temperature":     0.7,
			"maxOutputTokens": 2048,
			"topP":            0.95,
			"topK":            40,
		},
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("error encoding request: %v", err)
	}

	url := fmt.Sprintf("%s%s:generateContent?key=%s", geminiAPIEndpoint, c.model, c.apiKey)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return "", fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("error sending request to Gemini: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("Gemini API error (status %d): %s", resp.StatusCode, bodyBytes)
	}

	var response struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return "", fmt.Errorf("error decoding response: %v", err)
	}

	if len(response.Candidates) == 0 || len(response.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no content returned by Gemini")
	}

	return response.Candidates[0].Content.Parts[0].Text, nil
}

// GeminiStreamResponse represents a streaming response from Gemini
type GeminiStreamResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
		FinishReason string `json:"finishReason"`
	} `json:"candidates"`
}

// GeminiStreamWrapper is the implementation of CompletionStream for Gemini
type GeminiStreamWrapper struct {
	reader    *bufio.Reader
	response  *http.Response
	completed bool
}

func (w *GeminiStreamWrapper) Recv() (StreamResponse, error) {
	if w.completed {
		return StreamResponse{}, io.EOF
	}

	// Read until we get a data line
	for {
		line, err := w.reader.ReadString('\n')
		if err != nil {
			return StreamResponse{}, err
		}

		line = strings.TrimSpace(line)

		// Skip empty lines
		if line == "" {
			continue
		}

		// Check if it's the end of the stream
		if line == "---" || line == "[DONE]" {
			w.completed = true
			return StreamResponse{FinishReason: "stop"}, io.EOF
		}

		var streamResp GeminiStreamResponse
		if err := json.Unmarshal([]byte(line), &streamResp); err != nil {
			continue // Skip lines that aren't valid JSON
		}

		if len(streamResp.Candidates) > 0 && len(streamResp.Candidates[0].Content.Parts) > 0 {
			text := streamResp.Candidates[0].Content.Parts[0].Text
			finishReason := streamResp.Candidates[0].FinishReason

			if finishReason != "" {
				w.completed = true
				return StreamResponse{
					Content:      text,
					FinishReason: finishReason,
				}, nil
			}

			return StreamResponse{
				Content:      text,
				FinishReason: "",
			}, nil
		}
	}
}

func (w *GeminiStreamWrapper) Close() {
	if w.response != nil && w.response.Body != nil {
		w.response.Body.Close()
	}
}

// CreateCompletionStream implements the LLMProvider interface
func (c *GeminiClient) CreateCompletionStream(ctx context.Context, systemContent string, messages []Message, schema interface{}) (CompletionStream, error) {
	geminiMessages := make([]GeminiMessage, 0, len(messages)+1)

	// In Gemini, system content is added as a "system" role message
	if systemContent != "" {
		geminiMessages = append(geminiMessages, GeminiMessage{
			Role:    "system",
			Content: systemContent,
		})
	}

	for _, msg := range messages {
		role := "user"
		if msg.Role == RoleAssistant {
			role = "model"
		}

		geminiMessages = append(geminiMessages, GeminiMessage{
			Role:    role,
			Content: msg.Content,
		})
	}

	payload := map[string]interface{}{
		"contents": geminiMessages,
		"generationConfig": map[string]interface{}{
			"temperature":     0.7,
			"maxOutputTokens": 2048,
			"topP":            0.95,
			"topK":            40,
		},
	}

	// Note: Gemini doesn't support structured outputs via JSON schema in the same way as OpenAI
	// The schema parameter is ignored for Gemini
	_ = schema

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("error encoding request: %v", err)
	}

	url := fmt.Sprintf("%s%s:streamGenerateContent?key=%s", geminiAPIEndpoint, c.model, c.apiKey)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return nil, fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error sending request to Gemini: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, fmt.Errorf("Gemini API error (status %d): %s", resp.StatusCode, bodyBytes)
	}

	return &GeminiStreamWrapper{
		reader:    bufio.NewReader(resp.Body),
		response:  resp,
		completed: false,
	}, nil
}

// GenerateImage implements the LLMProvider interface
func (c *GeminiClient) GenerateImage(ctx context.Context, prompt string) (string, error) {
	// Gemini doesn't support image generation in the same way as DALL-E
	// but Gemini 1.5 Pro can generate images by describing them
	payload := map[string]interface{}{
		"contents": []GeminiMessage{
			{
				Role: "user",
				Content: fmt.Sprintf(
					"Create an image based on this description: %s. "+
						"Respond only with a detailed description of what the image would look like. "+
						"Be extremely detailed and descriptive, but don't include any explanations.",
					prompt,
				),
			},
		},
		"generationConfig": map[string]interface{}{
			"temperature":     0.9,
			"maxOutputTokens": 2048,
			"topP":            0.95,
			"topK":            40,
		},
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("error encoding request: %v", err)
	}

	url := fmt.Sprintf("%s%s:generateContent?key=%s", geminiAPIEndpoint, c.model, c.apiKey)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return "", fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("error sending request to Gemini: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("Gemini API error (status %d): %s", resp.StatusCode, bodyBytes)
	}

	var response struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return "", fmt.Errorf("error decoding response: %v", err)
	}

	if len(response.Candidates) == 0 || len(response.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no content returned by Gemini")
	}

	// Return the description instead of an actual image
	return response.Candidates[0].Content.Parts[0].Text, nil
}

// RecognizeImage implements the LLMProvider interface for image recognition
func (c *GeminiClient) RecognizeImage(ctx context.Context, prompt string, imageUrl string) (string, error) {
	if !strings.HasPrefix(c.model, "gemini-1.5") {
		return "", fmt.Errorf("image recognition requires Gemini 1.5 model or later, current model: %s", c.model)
	}

	// Fetch the image data from the URL
	respImage, err := http.Get(imageUrl)
	if err != nil {
		return "", fmt.Errorf("error fetching image from URL %s: %v", imageUrl, err)
	}
	defer respImage.Body.Close()

	if respImage.StatusCode != http.StatusOK {
		return "", fmt.Errorf("error fetching image from URL %s: status code %d", imageUrl, respImage.StatusCode)
	}

	imageData, err := io.ReadAll(respImage.Body)
	if err != nil {
		return "", fmt.Errorf("error reading image data from URL %s: %v", imageUrl, err)
	}

	// Detect MIME type
	mimeType := http.DetectContentType(imageData)
	// Ensure it's a supported image type (Gemini supports common image formats)
	if !strings.HasPrefix(mimeType, "image/") {
		// Fallback to Content-Type header if detection fails or isn't specific enough
		headerMime := respImage.Header.Get("Content-Type")
		if strings.HasPrefix(headerMime, "image/") {
			mimeType = headerMime
		} else {
			return "", fmt.Errorf("could not determine a valid image MIME type for URL %s (detected: %s)", imageUrl, mimeType)
		}
	}


	// Base64 encode the image data
	encodedImage := base64.StdEncoding.EncodeToString(imageData)

	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]interface{}{
					{"text": prompt},
					{
						"inline_data": map[string]string{
							"mime_type": mimeType,
							"data":      encodedImage,
						},
					},
				},
			},
		},
		"generationConfig": map[string]interface{}{
			"temperature":     0.4, // Lower temperature for more factual description
			"maxOutputTokens": 1024,
			"topP":            1.0,
			"topK":            32,
		},
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("error encoding request: %v", err)
	}

	url := fmt.Sprintf("%s%s:generateContent?key=%s", geminiAPIEndpoint, c.model, c.apiKey)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return "", fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("error sending request to Gemini: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("Gemini API error (status %d): %s", resp.StatusCode, bodyBytes)
	}

	var response struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return "", fmt.Errorf("error decoding response: %v", err)
	}

	if len(response.Candidates) == 0 || len(response.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no content returned by Gemini")
	}

	return response.Candidates[0].Content.Parts[0].Text, nil
}
