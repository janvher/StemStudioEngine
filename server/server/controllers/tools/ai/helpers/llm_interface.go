package helpers

import (
	"context"
	"io"

	"github.com/openai/openai-go"
	"github.com/openai/openai-go/packages/ssestream"
)

// LLMProvider is an interface that all LLM providers must implement
type LLMProvider interface {
	// CreateCompletion sends a text prompt to the LLM and returns the response
	CreateCompletion(ctx context.Context, systemContent, userContent string) (string, error)

	// CreateCompletionWithHistory sends a text prompt with conversation history to the LLM
	CreateCompletionWithHistory(ctx context.Context, systemContent string, messages []Message) (string, error)

	// CreateCompletionStream creates a streaming completion
	CreateCompletionStream(ctx context.Context, systemContent string, messages []Message, schema interface{}) (CompletionStream, error)

	// GenerateImage generates an image from a text prompt
	GenerateImage(ctx context.Context, prompt string) (string, error)

	// RecognizeImage performs image recognition on a given image URL
	RecognizeImage(ctx context.Context, prompt string, imageURL string) (string, error)
}

// ProviderType represents the LLM provider type
type ProviderType string

const (
	ProviderOpenAI   ProviderType = "openai"
	ProviderClaude   ProviderType = "claude"
	ProviderGemini   ProviderType = "gemini"
	ProviderScenario ProviderType = "scenario"
)

// MessageRole represents the role of a message
type MessageRole string

const (
	RoleSystem    MessageRole = "system"
	RoleUser      MessageRole = "user"
	RoleAssistant MessageRole = "assistant"
)

// Message represents a message in a conversation
type Message struct {
	Role    MessageRole
	Content string
}

// ToOpenAIMessages converts Message slice to the official openai-go
// ChatCompletionMessageParamUnion slice the SDK consumes.
func ToOpenAIMessages(messages []Message) []openai.ChatCompletionMessageParamUnion {
	result := make([]openai.ChatCompletionMessageParamUnion, 0, len(messages))

	for _, msg := range messages {
		switch msg.Role {
		case RoleSystem:
			result = append(result, openai.SystemMessage(msg.Content))
		case RoleUser:
			result = append(result, openai.UserMessage(msg.Content))
		case RoleAssistant:
			result = append(result, openai.AssistantMessage(msg.Content))
		}
	}

	return result
}

// CompletionStream is an interface for streaming completions
type CompletionStream interface {
	Recv() (StreamResponse, error)
	Close()
}

// StreamResponse represents a response chunk from the streaming API
type StreamResponse struct {
	Content      string
	FinishReason string
}

// OpenAIStreamWrapper adapts the official openai-go SSE stream (Next/Current/Err
// iterator pattern) to our Recv()-based CompletionStream interface. Recv()
// returns io.EOF on a clean end-of-stream, matching the contract the caller
// site previously relied on (the sashabaranov SDK used the same sentinel).
type OpenAIStreamWrapper struct {
	stream *ssestream.Stream[openai.ChatCompletionChunk]
}

func (w *OpenAIStreamWrapper) Recv() (StreamResponse, error) {
	if !w.stream.Next() {
		if err := w.stream.Err(); err != nil {
			return StreamResponse{}, err
		}
		return StreamResponse{}, io.EOF
	}
	chunk := w.stream.Current()
	if len(chunk.Choices) == 0 {
		return StreamResponse{}, nil
	}
	return StreamResponse{
		Content:      chunk.Choices[0].Delta.Content,
		FinishReason: string(chunk.Choices[0].FinishReason),
	}, nil
}

func (w *OpenAIStreamWrapper) Close() {
	w.stream.Close()
}

// NewLLMProvider creates a new LLM provider based on the provider type using
// only the server environment for credentials. Kept for call sites that don't
// have access to an *http.Request.
func NewLLMProvider(providerType ProviderType) (LLMProvider, error) {
	return NewLLMProviderWithKey(providerType, "")
}

// NewLLMProviderWithKey creates an LLM provider with an optional BYOK key
// fallback. The key is consulted only when the matching env var is empty —
// env always wins. Handlers extract the BYOK key from `r.Header.Get(byok.HeaderKey)`
// (or via the `byok.ResolveFromRequest` helper) and pass it here.
func NewLLMProviderWithKey(providerType ProviderType, byokKey string) (LLMProvider, error) {
	switch providerType {
	case ProviderOpenAI:
		return NewOpenAIClientWithKey(byokKey)
	case ProviderClaude:
		return NewClaudeClientWithKey(byokKey)
	case ProviderGemini:
		return NewGeminiClientWithKey(byokKey)
	case ProviderScenario:
		return NewScenarioClient()
	default:
		// Default to OpenAI if provider type is not recognized
		return NewOpenAIClientWithKey(byokKey)
	}
}
