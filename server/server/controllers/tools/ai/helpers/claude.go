package helpers

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/byok"
)

const (
	claudeAPIEndpoint        = "https://api.anthropic.com/v1/messages"
	claudeCompletionEndpoint = "https://api.anthropic.com/v1/complete"
)

// ClaudeClient represents a Claude API client
type ClaudeClient struct {
	apiKey string
	model  string
}

// NewClaudeClient creates a new instance of the Claude client using only the
// server environment for credentials. Kept for backward compatibility with
// call sites that don't have access to an *http.Request.
func NewClaudeClient() (*ClaudeClient, error) {
	return NewClaudeClientWithKey("")
}

// NewClaudeClientWithKey is the BYOK-aware constructor. Precedence:
//   1. env vars (CLAUDE_API_KEY, then ANTHROPIC_API_KEY)
//   2. byokKey arg (typically the X-BYOK-Key header forwarded by the editor)
//   3. BYOK session store (POST /api/AI/ConfigureKeys)
//
// All resolution flows through `byok.LookupKey` so the precedence is
// guaranteed consistent across providers.
func NewClaudeClientWithKey(byokKey string) (*ClaudeClient, error) {
	apiKey, _ := byok.LookupKey("anthropic", []string{"CLAUDE_API_KEY", "ANTHROPIC_API_KEY"}, byokKey)
	if apiKey == "" {
		return nil, fmt.Errorf("Claude API key not set")
	}

	model := os.Getenv("CLAUDE_MODEL")
	if model == "" {
		model = "claude-3-opus-20240229"
	}

	return &ClaudeClient{
		apiKey: apiKey,
		model:  model,
	}, nil
}

// CreateCompletion implements the LLMProvider interface
func (c *ClaudeClient) CreateCompletion(ctx context.Context, systemContent, userContent string) (string, error) {
	messages := []Message{
		{
			Role:    RoleUser,
			Content: userContent,
		},
	}

	return c.CreateCompletionWithHistory(ctx, systemContent, messages)
}

// CreateCompletionWithHistory implements the LLMProvider interface
func (c *ClaudeClient) CreateCompletionWithHistory(ctx context.Context, systemContent string, messages []Message) (string, error) {
	claudeMessages := make([]map[string]string, 0, len(messages))

	for _, msg := range messages {
		role := "user"
		if msg.Role == RoleAssistant {
			role = "assistant"
		}

		claudeMessages = append(claudeMessages, map[string]string{
			"role":    role,
			"content": msg.Content,
		})
	}

	payload := map[string]interface{}{
		"model":       c.model,
		"messages":    claudeMessages,
		"max_tokens":  16000, // High limit for detailed JSON outputs (primitives, etc.)
		"temperature": 0.7,
	}

	if systemContent != "" {
		payload["system"] = systemContent
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("error encoding request: %v", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", claudeAPIEndpoint, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return "", fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("error sending request to Claude: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("Claude API error (status %d): %s", resp.StatusCode, bodyBytes)
	}

	var response struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return "", fmt.Errorf("error decoding response: %v", err)
	}

	if len(response.Content) == 0 {
		return "", fmt.Errorf("no content returned by Claude")
	}

	return response.Content[0].Text, nil
}

// ClaudeStreamResponse represents a response from the Claude streaming API
type ClaudeStreamResponse struct {
	Type    string `json:"type"`
	Message struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	} `json:"message"`
	Delta struct {
		Type         string `json:"type"`
		Text         string `json:"text"`
		StopSequence string `json:"stop_sequence"`
	} `json:"delta"`
}

// ClaudeStreamWrapper is the implementation of CompletionStream for Claude
type ClaudeStreamWrapper struct {
	reader    *bufio.Reader
	response  *http.Response
	completed bool
}

func (w *ClaudeStreamWrapper) Recv() (StreamResponse, error) {
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

		// Skip empty lines or lines not starting with "data: "
		if line == "" || !strings.HasPrefix(line, "data: ") {
			continue
		}

		// Extract the JSON payload
		data := strings.TrimPrefix(line, "data: ")
		if data == "[DONE]" {
			w.completed = true
			return StreamResponse{FinishReason: "stop"}, io.EOF
		}

		var streamResp ClaudeStreamResponse
		if err := json.Unmarshal([]byte(data), &streamResp); err != nil {
			return StreamResponse{}, fmt.Errorf("error parsing stream response: %v", err)
		}

		if streamResp.Type == "content_block_delta" {
			return StreamResponse{
				Content:      streamResp.Delta.Text,
				FinishReason: "",
			}, nil
		}

		if streamResp.Type == "message_stop" {
			w.completed = true
			return StreamResponse{FinishReason: "stop"}, io.EOF
		}
	}
}

func (w *ClaudeStreamWrapper) Close() {
	if w.response != nil && w.response.Body != nil {
		w.response.Body.Close()
	}
}

// CreateCompletionStream implements the LLMProvider interface
func (c *ClaudeClient) CreateCompletionStream(ctx context.Context, systemContent string, messages []Message, schema interface{}) (CompletionStream, error) {
	claudeMessages := make([]map[string]string, 0, len(messages))

	for _, msg := range messages {
		role := "user"
		if msg.Role == RoleAssistant {
			role = "assistant"
		}

		claudeMessages = append(claudeMessages, map[string]string{
			"role":    role,
			"content": msg.Content,
		})
	}

	payload := map[string]interface{}{
		"model":       c.model,
		"messages":    claudeMessages,
		"max_tokens":  16000, // High limit for detailed JSON outputs (primitives, etc.)
		"temperature": 0.7,
		"stream":      true,
	}

	if systemContent != "" {
		payload["system"] = systemContent
	}

	// Note: Claude doesn't support structured outputs via JSON schema in the same way as OpenAI
	// The schema parameter is ignored for Claude
	_ = schema

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("error encoding request: %v", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", claudeAPIEndpoint, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return nil, fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error sending request to Claude: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, fmt.Errorf("Claude API error (status %d): %s", resp.StatusCode, bodyBytes)
	}

	return &ClaudeStreamWrapper{
		reader:    bufio.NewReader(resp.Body),
		response:  resp,
		completed: false,
	}, nil
}

// GenerateImage implements the LLMProvider interface but is not supported by Claude
func (c *ClaudeClient) GenerateImage(ctx context.Context, prompt string) (string, error) {
	return "", fmt.Errorf("image generation not supported by Claude")
}

// RecognizeImage implements the LLMProvider interface for image recognition using Claude
// Uses prompt caching for static instruction prompts to reduce costs and latency
func (c *ClaudeClient) RecognizeImage(ctx context.Context, prompt string, imageUrl string) (string, error) {
	// Claude supports vision via multi-content messages
	// Image can be base64 data URL or a regular URL

	var imageContent map[string]interface{}

	// Check if it's a base64 data URL
	if strings.HasPrefix(imageUrl, "data:") {
		// Parse data URL: data:image/png;base64,<data>
		parts := strings.SplitN(imageUrl, ",", 2)
		if len(parts) != 2 {
			return "", fmt.Errorf("invalid data URL format")
		}

		// Extract media type from "data:image/png;base64"
		mediaTypePart := strings.TrimPrefix(parts[0], "data:")
		mediaType := strings.Split(mediaTypePart, ";")[0]

		imageContent = map[string]interface{}{
			"type": "image",
			"source": map[string]interface{}{
				"type":       "base64",
				"media_type": mediaType,
				"data":       parts[1],
			},
		}
	} else {
		// Regular URL
		imageContent = map[string]interface{}{
			"type": "image",
			"source": map[string]interface{}{
				"type": "url",
				"url":  imageUrl,
			},
		}
	}

	// Build multi-content message with image and instruction to analyze
	// The static instruction prompt goes in system (cacheable), image goes in user message
	messageContent := []interface{}{
		imageContent,
		map[string]interface{}{
			"type": "text",
			"text": "Analyze the image above and generate the primitive composition as specified in the system instructions.",
		},
	}

	// Use system prompt with cache_control for static instructions (prompt caching)
	// This reduces costs by ~80% for cached tokens when the same prompt is reused
	systemContent := []map[string]interface{}{
		{
			"type": "text",
			"text": prompt,
			"cache_control": map[string]string{
				"type": "ephemeral",
			},
		},
	}

	payload := map[string]interface{}{
		"model":  c.model,
		"system": systemContent,
		"messages": []map[string]interface{}{
			{
				"role":    "user",
				"content": messageContent,
			},
		},
		"max_tokens":  16000, // High limit for detailed primitive JSON output
		"temperature": 0.3,  // Lower temperature for more consistent JSON output
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("error encoding request: %v", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", claudeAPIEndpoint, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return "", fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("anthropic-beta", "prompt-caching-2024-07-31")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("error sending request to Claude: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("Claude API error (status %d): %s", resp.StatusCode, bodyBytes)
	}

	var response struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return "", fmt.Errorf("error decoding response: %v", err)
	}

	if len(response.Content) == 0 {
		return "", fmt.Errorf("no content returned by Claude")
	}

	return response.Content[0].Text, nil
}
