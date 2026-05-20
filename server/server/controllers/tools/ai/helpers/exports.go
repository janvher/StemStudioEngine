package helpers

// This package provides helper functions for various AI-related operations.
// It includes:
//
// Provider Interface and Selection:
// - LLMProvider: Interface for all language model providers
// - NewLLMProvider: Creates an LLM provider based on provider type
// - ProviderType: Enum for different providers (OpenAI, Claude, Gemini)
// - GetDefaultProvider: Returns the current default provider
// - SetDefaultProvider: Sets the default provider for a specific task
// - GetProviderFromRequest: Extracts provider selection from request
// - GetAvailableProviders: Returns information about all available providers
// - ProviderInfoHandler: API handler for provider information
// - ProviderSelectionHandler: API handler to change the provider
//
// OpenAI API Integration:
// - OpenAIClient: Client for OpenAI services
// - NewOpenAIClient: Creates a new OpenAI client
// - WhisperAPIEndpoint: Endpoint for OpenAI audio transcription service
// - ChatGPTAPIEndpoint: Endpoint for OpenAI chat completion service
// - CreateChatCompletion: Sends a request to the ChatGPT API
// - CreateChatCompletionWithHistory: Similar to CreateChatCompletion but with conversation history
// - CreateChatCompletionStream: Creates a streaming chat completion
// - GenerateImage: Generates an image using DALL-E
// - TranscribeAudio: Transcribes audio using Whisper API
//
// Claude API Integration:
// - ClaudeClient: Client for Anthropic's Claude services
// - NewClaudeClient: Creates a new Claude client
// - CreateCompletion: Sends a request to the Claude API
// - CreateCompletionWithHistory: Similar to CreateCompletion but with conversation history
// - CreateCompletionStream: Creates a streaming completion
//
// Gemini API Integration:
// - GeminiClient: Client for Google's Gemini services
// - NewGeminiClient: Creates a new Gemini client
// - CreateCompletion: Sends a request to the Gemini API
// - CreateCompletionWithHistory: Similar to CreateCompletion but with conversation history
// - CreateCompletionStream: Creates a streaming completion
// - GenerateImage: Generates an image description
//
// ElevenLabs API Integration:
// - GenerateSpeech: Generates speech from text using ElevenLabs API
// - GenerateSpeechWS: Generates speech with WebSocket error handling
// - SendError: Sends an error message over WebSocket
// - CloseConnectionWithReason: Closes a WebSocket connection with a reason
