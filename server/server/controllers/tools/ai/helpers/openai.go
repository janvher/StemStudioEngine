package helpers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"time"

	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
	"github.com/openai/openai-go/packages/ssestream"
	"github.com/openai/openai-go/shared"
	"github.com/openai/openai-go/shared/constant"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/helper"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/byok"
)

const (
	// WhisperAPIEndpoint is the OpenAI API endpoint for audio transcriptions
	WhisperAPIEndpoint string = "https://api.openai.com/v1/audio/transcriptions"
	// ChatGPTAPIEndpoint is the OpenAI API endpoint for chat completions
	ChatGPTAPIEndpoint string = "https://api.openai.com/v1/chat/completions"
)

type httpDoer interface {
	Do(req *http.Request) (*http.Response, error)
}

var (
	openAIImageGenerationEndpoint          = "https://api.openai.com/v1/images/generations"
	openAIWhisperEndpoint                  = WhisperAPIEndpoint
	openAIHTTPClient              httpDoer = &http.Client{Timeout: 5 * time.Minute}
)

// Client represents an OpenAI client wrapper
type OpenAIClient struct {
	client      openai.Client
	apiKey      string
	chatModel   string
	visionModel string
	imageModel  string
}

// getModelWithFallback returns the model from env var or the default
func getModelWithFallback(envVar, defaultModel string) string {
	if model := os.Getenv(envVar); model != "" {
		return model
	}
	// Fallback to legacy CHAT_GPT_VERSION for chat/vision models
	if envVar != "OPENAI_IMAGE_MODEL" {
		if legacy := os.Getenv("CHAT_GPT_VERSION"); legacy != "" {
			return legacy
		}
	}
	return defaultModel
}

// NewOpenAIClient creates a new instance of the OpenAI client using only the
// server environment for credentials. Kept for backward compatibility with
// call sites that don't have access to an *http.Request.
func NewOpenAIClient() (*OpenAIClient, error) {
	return NewOpenAIClientWithKey("")
}

// NewOpenAIClientWithKey is the BYOK-aware constructor. Precedence: env →
// byokKey arg → BYOK session store, via byok.LookupKey.
func NewOpenAIClientWithKey(byokKey string) (*OpenAIClient, error) {
	apiKey, _ := byok.LookupKey("openai", []string{"OPENAI_API_KEY"}, byokKey)
	if apiKey == "" {
		return nil, fmt.Errorf("OpenAI API key not set")
	}

	return &OpenAIClient{
		client:      openai.NewClient(option.WithAPIKey(apiKey)),
		apiKey:      apiKey,
		chatModel:   getModelWithFallback("OPENAI_CHAT_MODEL", "gpt-5"),
		visionModel: getModelWithFallback("OPENAI_VISION_MODEL", "gpt-5"),
		imageModel:  getModelWithFallback("OPENAI_IMAGE_MODEL", "gpt-image-1"),
	}, nil
}

// CreateCompletion implements the LLMProvider interface
func (c *OpenAIClient) CreateCompletion(ctx context.Context, systemContent, userContent string) (string, error) {
	return c.CreateChatCompletion(ctx, systemContent, userContent)
}

// CreateCompletionWithHistory implements the LLMProvider interface
func (c *OpenAIClient) CreateCompletionWithHistory(ctx context.Context, systemContent string, messages []Message) (string, error) {
	openaiMessages := ToOpenAIMessages(messages)
	return c.CreateChatCompletionWithHistory(ctx, systemContent, openaiMessages)
}

// CreateCompletionStream implements the LLMProvider interface
func (c *OpenAIClient) CreateCompletionStream(ctx context.Context, systemContent string, messages []Message, schema interface{}) (CompletionStream, error) {
	openaiMessages := ToOpenAIMessages(messages)

	stream, err := c.CreateChatCompletionStream(ctx, systemContent, openaiMessages, schema)
	if err != nil {
		return nil, err
	}

	return &OpenAIStreamWrapper{stream: stream}, nil
}

// CreateChatCompletion sends a request to the ChatGPT API and returns the response
func (c *OpenAIClient) CreateChatCompletion(ctx context.Context, systemContent, userContent string) (string, error) {
	messages := make([]openai.ChatCompletionMessageParamUnion, 0, 2)

	// Only add system message if systemContent is not empty
	if systemContent != "" {
		messages = append(messages, openai.SystemMessage(systemContent))
	}
	messages = append(messages, openai.UserMessage(userContent))

	params := openai.ChatCompletionNewParams{
		Model:               shared.ChatModel(c.chatModel),
		Messages:            messages,
		MaxCompletionTokens: openai.Int(16000), // MaxCompletionTokens for gpt-5 reasoning models
	}

	resp, err := c.client.Chat.Completions.New(ctx, params)
	if err != nil {
		return "", fmt.Errorf("ChatCompletion error: %v", err)
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("no response choices returned by ChatGPT")
	}

	return resp.Choices[0].Message.Content, nil
}

// CreateChatCompletionWithHistory sends a request to the ChatGPT API with conversation history
func (c *OpenAIClient) CreateChatCompletionWithHistory(ctx context.Context, systemContent string, messages []openai.ChatCompletionMessageParamUnion) (string, error) {
	fullMessages := make([]openai.ChatCompletionMessageParamUnion, 0, len(messages)+1)

	// Only add system message if systemContent is not empty
	if systemContent != "" {
		fullMessages = append(fullMessages, openai.SystemMessage(systemContent))
	}
	fullMessages = append(fullMessages, messages...)

	params := openai.ChatCompletionNewParams{
		Model:               shared.ChatModel(c.chatModel),
		Messages:            fullMessages,
		MaxCompletionTokens: openai.Int(16000),
	}

	resp, err := c.client.Chat.Completions.New(ctx, params)
	if err != nil {
		return "", fmt.Errorf("ChatCompletion error: %v", err)
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("no response choices returned by ChatGPT")
	}

	return resp.Choices[0].Message.Content, nil
}

// CreateChatCompletionStream creates a streaming chat completion.
//
// When `schema` is non-nil, it is attached as a ResponseFormat JSONSchema so
// the model produces structured output. The schema can be any
// JSON-serializable value — typically a map[string]any or a type defined by
// the caller. The sashabaranov SDK accepted a json.Marshaler here; we keep the
// signature `interface{}` and let the openai-go SDK serialize directly.
func (c *OpenAIClient) CreateChatCompletionStream(ctx context.Context, systemContent string, messages []openai.ChatCompletionMessageParamUnion, schema interface{}) (*ssestream.Stream[openai.ChatCompletionChunk], error) {
	fullMessages := make([]openai.ChatCompletionMessageParamUnion, 0, len(messages)+1)

	if systemContent != "" {
		fullMessages = append(fullMessages, openai.SystemMessage(systemContent))
	}
	fullMessages = append(fullMessages, messages...)

	params := openai.ChatCompletionNewParams{
		Model:               shared.ChatModel(c.chatModel),
		Messages:            fullMessages,
		MaxCompletionTokens: openai.Int(16000),
	}

	if schema != nil {
		params.ResponseFormat = openai.ChatCompletionNewParamsResponseFormatUnion{
			OfJSONSchema: &shared.ResponseFormatJSONSchemaParam{
				Type: constant.JSONSchema("json_schema"),
				JSONSchema: shared.ResponseFormatJSONSchemaJSONSchemaParam{
					Name:   "response",
					Schema: schema,
				},
			},
		}
	}

	stream := c.client.Chat.Completions.NewStreaming(ctx, params)
	// NewStreaming does not return an error directly — it returns a Stream
	// whose Err() will surface issues on iteration. Return the stream
	// directly; the wrapper handles Err() propagation.
	return stream, nil
}

// GenerateImage generates an image using the GPT Image model
// Uses raw HTTP without context to avoid context cancellation issues
func (c *OpenAIClient) GenerateImage(ctx context.Context, prompt string) (string, error) {
	return c.GenerateImageWithSize(ctx, prompt, "1024x1024")
}

// GenerateImageWithSize generates an image with a caller-specified OpenAI
// image size. It uses the API key captured by NewOpenAIClientWithKey so env,
// per-request BYOK, and BYOK session-store precedence is identical to chat.
func (c *OpenAIClient) GenerateImageWithSize(ctx context.Context, prompt string, size string) (string, error) {
	if c.apiKey == "" {
		return "", fmt.Errorf("OpenAI API key not set")
	}
	if size == "" {
		size = "1024x1024"
	}
	reqBody := map[string]interface{}{
		"model":   c.imageModel,
		"prompt":  prompt,
		"n":       1,
		"size":    size,
		"quality": "medium",
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %v", err)
	}

	// Don't use context - just rely on HTTP client timeout to avoid context cancellation issues
	req, err := http.NewRequest("POST", openAIImageGenerationEndpoint, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := openAIHTTPClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %v", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Data []struct {
			B64JSON string `json:"b64_json"`
		} `json:"data"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}

	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("failed to parse response: %v", err)
	}

	if result.Error != nil {
		return "", fmt.Errorf("OpenAI error: %s", result.Error.Message)
	}

	if len(result.Data) == 0 {
		return "", fmt.Errorf("no images returned")
	}

	return result.Data[0].B64JSON, nil
}

// TranscribeAudio transcribes audio using Whisper API
func TranscribeAudio(file io.Reader) (string, error) {
	return TranscribeAudioWithKey(file, "")
}

// TranscribeAudioWithKey transcribes audio using Whisper API with the same
// key precedence as the rest of the OpenAI helpers: env → BYOK arg → session.
func TranscribeAudioWithKey(file io.Reader, byokKey string) (string, error) {
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	part, err := writer.CreateFormFile("file", "audio.wav")
	if err != nil {
		return "", err
	}

	_, err = io.Copy(part, file)
	if err != nil {
		return "", err
	}
	writer.WriteField("model", "whisper-1")
	writer.Close()

	req, err := http.NewRequest("POST", openAIWhisperEndpoint, &buf)
	if err != nil {
		return "", err
	}

	apiKey, _ := byok.LookupKey("openai", []string{"OPENAI_API_KEY"}, byokKey)
	if apiKey == "" {
		return "", fmt.Errorf("API key not set")
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := openAIHTTPClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("failed to transcribe audio: %s", bodyBytes)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	transcription := helper.GetStringFromField(result, "text", "")
	if transcription == "" {
		return "", fmt.Errorf("unexpected response format")
	}

	return transcription, nil
}

// RecognizeImage analyzes an image based on a prompt using the OpenAI Vision API
func (c *OpenAIClient) RecognizeImage(ctx context.Context, prompt string, imageURL string) (string, error) {
	userContent := []openai.ChatCompletionContentPartUnionParam{
		openai.TextContentPart(prompt),
		openai.ImageContentPart(openai.ChatCompletionContentPartImageImageURLParam{
			URL:    imageURL,
			Detail: "high", // high detail for better primitive extraction
		}),
	}

	params := openai.ChatCompletionNewParams{
		Model:               shared.ChatModel(c.visionModel),
		Messages:            []openai.ChatCompletionMessageParamUnion{openai.UserMessage(userContent)},
		MaxCompletionTokens: openai.Int(16000),
		ResponseFormat: openai.ChatCompletionNewParamsResponseFormatUnion{
			OfJSONObject: &shared.ResponseFormatJSONObjectParam{
				Type: constant.JSONObject("json_object"),
			},
		},
	}

	resp, err := c.client.Chat.Completions.New(ctx, params)
	if err != nil {
		return "", fmt.Errorf("ImageRecognition error: %v", err)
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("no response choices returned by Vision API")
	}

	return resp.Choices[0].Message.Content, nil
}
