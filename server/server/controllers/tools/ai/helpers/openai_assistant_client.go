package helpers

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/logger"
	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
	"go.uber.org/zap"
)

// AssistantClient wraps the OpenAI client and provides helper methods for assistant operations
type AssistantClient struct {
	client      openai.Client
	assistantID string
}

// RunStatus represents the possible states of a run
type RunStatus string

const (
	RunStatusQueued      RunStatus = "queued"
	RunStatusInProgress  RunStatus = "in_progress"
	RunStatusCompleted   RunStatus = "completed"
	RunStatusFailed      RunStatus = "failed"
	RunStatusCancelled   RunStatus = "cancelled"
	RunStatusExpired     RunStatus = "expired"
	RunStatusRequiresAction RunStatus = "requires_action"
)

// ConversationResponse contains the assistant's response and metadata
type ConversationResponse struct {
	Response  string
	ThreadID  string
	RunID     string
	Status    RunStatus
	Error     error
}

// NewAssistantClient creates a new assistant client
func NewAssistantClient(apiKey, assistantID string) *AssistantClient {
	client := openai.NewClient(
		option.WithAPIKey(apiKey),
	)
	
	return &AssistantClient{
		client:      client,
		assistantID: assistantID,
	}
}

// CreateThread creates a new conversation thread
func (ac *AssistantClient) CreateThread(ctx context.Context) (*openai.Thread, error) {
	thread, err := ac.client.Beta.Threads.New(ctx, openai.BetaThreadNewParams{})
	if err != nil {
		return nil, fmt.Errorf("failed to create thread: %w", err)
	}
	
	logger.LogAIOperation(ctx, "create_thread", "openai",
		zap.String("thread_id", thread.ID),
	)
	return thread, nil
}

// CreateThreadWithMessage creates a new thread with an initial message
func (ac *AssistantClient) CreateThreadWithMessage(ctx context.Context, message string) (*openai.Thread, error) {
	thread, err := ac.client.Beta.Threads.New(ctx, openai.BetaThreadNewParams{
		Messages: []openai.BetaThreadNewParamsMessage{
			{
				Role: "user",
				Content: openai.BetaThreadNewParamsMessageContentUnion{
					OfString: openai.String(message),
				},
			},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create thread with message: %w", err)
	}
	
	logger.LogAIOperation(ctx, "create_thread_with_message", "openai",
		zap.String("thread_id", thread.ID),
	)
	return thread, nil
}

// AddMessage adds a message to an existing thread
func (ac *AssistantClient) AddMessage(ctx context.Context, threadID, message string) (*openai.Message, error) {
	msg, err := ac.client.Beta.Threads.Messages.New(ctx, threadID, openai.BetaThreadMessageNewParams{
		Role: openai.BetaThreadMessageNewParamsRoleUser,
		Content: openai.BetaThreadMessageNewParamsContentUnion{
			OfString: openai.String(message),
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to add message to thread %s: %w", threadID, err)
	}
	
	logger.LogAIOperation(ctx, "add_message", "openai",
		zap.String("thread_id", threadID),
		zap.String("message_id", msg.ID),
	)
	return msg, nil
}

// CreateRun starts a new run for the assistant on the specified thread
func (ac *AssistantClient) CreateRun(ctx context.Context, threadID string) (*openai.Run, error) {
	run, err := ac.client.Beta.Threads.Runs.New(ctx, threadID, openai.BetaThreadRunNewParams{
		AssistantID: ac.assistantID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create run for thread %s: %w", threadID, err)
	}
	
	logger.LogAIOperation(ctx, "create_run", "openai",
		zap.String("thread_id", threadID),
		zap.String("run_id", run.ID),
	)
	return run, nil
}

// CreateRunWithInstructions starts a new run with custom instructions
func (ac *AssistantClient) CreateRunWithInstructions(ctx context.Context, threadID, instructions string) (*openai.Run, error) {
	run, err := ac.client.Beta.Threads.Runs.New(ctx, threadID, openai.BetaThreadRunNewParams{
		AssistantID:  ac.assistantID,
		Instructions: openai.String(instructions),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create run with instructions for thread %s: %w", threadID, err)
	}
	
	logger.LogAIOperation(ctx, "create_run_with_instructions", "openai",
		zap.String("thread_id", threadID),
		zap.String("run_id", run.ID),
	)
	return run, nil
}

// WaitForRunCompletion polls the run status until it completes or fails
func (ac *AssistantClient) WaitForRunCompletion(ctx context.Context, threadID, runID string, pollInterval time.Duration) (*openai.Run, error) {
	for {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}
		
		run, err := ac.client.Beta.Threads.Runs.Get(ctx, threadID, runID)
		if err != nil {
			return nil, fmt.Errorf("failed to get run status: %w", err)
		}
		
		logger.DebugCtx(ctx, "OpenAI run status check",
			zap.String("run_id", runID),
			zap.String("status", string(run.Status)),
			zap.String("model", "openai"),
		)
		
		switch run.Status {
		case openai.RunStatusCompleted:
			return run, nil
		case openai.RunStatusFailed, openai.RunStatusCancelled, openai.RunStatusExpired:
			var errMsg string
			if run.LastError.Code != "" || run.LastError.Message != "" {
				errMsg = fmt.Sprintf("Run failed with error: %s - %s", run.LastError.Code, run.LastError.Message)
			} else {
				errMsg = fmt.Sprintf("Run ended with status: %s", run.Status)
			}
			return run, errors.New(errMsg) // Return run object with error
		case openai.RunStatusRequiresAction:
			return run, errors.New("run requires action (tool calls not implemented in this example)") // Return run object with error
		}
		
		time.Sleep(pollInterval)
	}
}

// GetMessages retrieves all messages from a thread
func (ac *AssistantClient) GetMessages(ctx context.Context, threadID string) ([]openai.Message, error) {
	messages, err := ac.client.Beta.Threads.Messages.List(ctx, threadID, openai.BetaThreadMessageListParams{})
	if err != nil {
		return nil, fmt.Errorf("failed to get messages from thread %s: %w", threadID, err)
	}
	
	return messages.Data, nil
}

// GetLatestAssistantMessage retrieves the most recent assistant message from a thread
func (ac *AssistantClient) GetLatestAssistantMessage(ctx context.Context, threadID string) (string, error) {
	messages, err := ac.GetMessages(ctx, threadID)
	if err != nil {
		return "", err
	}
	
	// Messages are returned in reverse chronological order
	for _, msg := range messages {
		if msg.Role == openai.MessageRoleAssistant {
			// Extract text content from the message
			for _, content := range msg.Content {
				if content.Type == "text" {
					return content.Text.Value, nil
				}
			}
		}
	}
	
	return "", errors.New("no assistant message found")
}

// SubmitPrompt is a convenience method that combines multiple operations:
// 1. Creates a new thread (or uses existing)
// 2. Adds the prompt message
// 3. Creates and waits for run completion
// 4. Returns the assistant's response
func (ac *AssistantClient) SubmitPrompt(ctx context.Context, prompt string) (*ConversationResponse, error) {
	// Create a new thread with the prompt
	thread, err := ac.CreateThreadWithMessage(ctx, prompt)
	if err != nil {
		return &ConversationResponse{Error: err}, err
	}
	
	return ac.SubmitPromptToThread(ctx, thread.ID, prompt, true)
}

// SubmitPromptToThread submits a prompt to an existing thread
func (ac *AssistantClient) SubmitPromptToThread(ctx context.Context, threadID, prompt string, skipAddMessage bool) (*ConversationResponse, error) {
	response := &ConversationResponse{
		ThreadID: threadID,
	}
	
	// Add message to thread if not already added
	if !skipAddMessage {
		_, err := ac.AddMessage(ctx, threadID, prompt)
		if err != nil {
			response.Error = err
			return response, err
		}
	}
	
	// Create and start the run
	run, err := ac.CreateRun(ctx, threadID)
	if err != nil {
		response.Error = err
		return response, err
	}
	
	response.RunID = run.ID
	
	// Wait for completion
	completedRun, err := ac.WaitForRunCompletion(ctx, threadID, run.ID, 2*time.Second)
	if err != nil {
		response.Error = err
		// Only set status if completedRun is not nil
		if completedRun != nil {
			response.Status = RunStatus(completedRun.Status)
		}
		return response, err
	}
	
	response.Status = RunStatus(completedRun.Status)
	
	// Get the assistant's response
	assistantResponse, err := ac.GetLatestAssistantMessage(ctx, threadID)
	if err != nil {
			response.Error = err
			return response, err
	}
	
	response.Response = assistantResponse
	return response, nil
}

// ContinueConversation continues an existing conversation in a thread
func (ac *AssistantClient) ContinueConversation(ctx context.Context, threadID, message string) (*ConversationResponse, error) {
	return ac.SubmitPromptToThread(ctx, threadID, message, false)
}

// Example usage function
func ExampleUsage() {
	// Initialize the client with your API key and assistant ID
	client := NewAssistantClient("your-openai-api-key", "your-assistant-id")
	
	ctx := context.Background()
	
	// Example 1: Simple prompt submission
	fmt.Println("=== Example 1: Simple Prompt ===")
	response, err := client.SubmitPrompt(ctx, "Hello! Can you explain what quantum computing is?")
	if err != nil {
		logger.GetLogger().Fatal("OpenAI assistant conversation error",
			zap.Error(err),
			zap.String("operation", "conversation"),
			zap.String("model", "openai"),
		)
	}
	
	fmt.Printf("Assistant Response: %s\n", response.Response)
	fmt.Printf("Thread ID: %s\n", response.ThreadID)
	fmt.Printf("Run ID: %s\n", response.RunID)
	
	// Example 2: Continue the conversation
	fmt.Println("\n=== Example 2: Continue Conversation ===")
	followUp, err := client.ContinueConversation(ctx, response.ThreadID, "Can you give me a simple example?")
	if err != nil {
		logger.GetLogger().Fatal("OpenAI assistant conversation error",
			zap.Error(err),
			zap.String("operation", "conversation"),
			zap.String("model", "openai"),
		)
	}
	
	fmt.Printf("Follow-up Response: %s\n", followUp.Response)
	
	// Example 3: Manual thread management
	fmt.Println("\n=== Example 3: Manual Thread Management ===")
	thread, err := client.CreateThread(ctx)
	if err != nil {
		logger.GetLogger().Fatal("Error creating thread for manual management example",
			zap.Error(err),
			zap.String("operation", "create_thread"),
			zap.String("model", "openai"),
		)
	}
	
	// Add multiple messages and process them
	messages := []string{
		"What is machine learning?",
		"How does it differ from traditional programming?",
		"Can you give me an example use case?",
	}
	
	for i, msg := range messages {
		fmt.Printf("\n--- Message %d ---\n", i+1)
		fmt.Printf("User: %s\n", msg)
		
		response, err := client.SubmitPromptToThread(ctx, thread.ID, msg, false)
		if err != nil {
				logger.GetLogger().Error("OpenAI assistant operation error",
				zap.Error(err),
				zap.String("operation", "conversation"),
				zap.String("model", "openai"),
			)
			continue
		}
		
		fmt.Printf("Assistant: %s\n", response.Response)
	}
	
	// Example 4: Get all messages from a thread
	fmt.Println("\n=== Example 4: Thread History ===")
	allMessages, err := client.GetMessages(ctx, thread.ID)
	if err != nil {
		logger.GetLogger().Fatal("Error getting messages for thread history example",
			zap.Error(err),
			zap.String("thread_id", thread.ID),
			zap.String("operation", "get_messages"),
			zap.String("model", "openai"),
		)
	}
	
	fmt.Printf("Total messages in thread: %d\n", len(allMessages))
	for i, msg := range allMessages {
		// Messages are in reverse chronological order
		fmt.Printf("Message %d [%s]: ", len(allMessages)-i, msg.Role)
		for _, content := range msg.Content {
			if content.Type == "text" {
				fmt.Printf("%s\n", content.Text.Value)
				break
			}
		}
	}
}