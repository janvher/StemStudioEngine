package helpers

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/openai/openai-go"
	"github.com/openai/openai-go/shared"
)

// ModelInfo represents metadata extracted from the uploaded 3D model
type ModelInfo struct {
	Name          string   `json:"name"`
	Size          string   `json:"size"` // e.g., "12 x 4 x 3"
	Meshes        []string `json:"meshes"`
	Materials     []string `json:"materials"`
	PolyCount     int      `json:"polyCount"`
	HasAnimations bool     `json:"hasAnimations"`
}

// PhysicsPrediction is the result of the AI prediction
type PhysicsPrediction struct {
	Scale         float64 `json:"scale"`
	Mass          float64 `json:"mass"`
	Bounciness    float64 `json:"bounciness"`
	Friction      float64 `json:"friction"`
	RigidBodyType string  `json:"rigidBodyType"`
	ColliderShape string  `json:"colliderShape"`
	CollisionType string  `json:"collisionType"`
}

// PredictPhysicsProperties sends a model info to GPT and returns physics prediction
func (c *OpenAIClient) PredictPhysicsProperties(model ModelInfo) (PhysicsPrediction, error) {
	systemPrompt := `You are a physics engine assistant. Based on a 3D model description, suggest scale and physics properties for real-time simulation.

	Respond with a valid JSON object only. Do not include any explanations, comments, or markdown formatting.

	Required fields:
	- scale: float (e.g., 0.1, 1.0)
	- mass: float (positive number)
	- bounciness: float (between 0 and 1)
	- friction: float (between 0 and 1)
	- rigidBodyType: string ("rigidBody")
	- colliderShape: string, must be one of:
	  "btBoxShape" | "btSphereShape" | "btCapsuleShape" | "btConvexHullShape" | "btConcaveHullShape"
	- collisionType: string, must be either "Static" or "Dynamic"
	`

	modelJson, err := json.MarshalIndent(model, "", "  ")
	if err != nil {
		return PhysicsPrediction{}, fmt.Errorf("failed to serialize model info: %w", err)
	}

	userPrompt := fmt.Sprintf("Model Description:\n%s", string(modelJson))

	resp, err := c.client.Chat.Completions.New(context.Background(), openai.ChatCompletionNewParams{
		Model:               shared.ChatModel(c.chatModel),
		MaxCompletionTokens: openai.Int(4096),
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage(systemPrompt),
			openai.UserMessage(userPrompt),
		},
	})

	if err != nil {
		return PhysicsPrediction{}, fmt.Errorf("chat completion failed: %w", err)
	}

	if len(resp.Choices) == 0 {
		return PhysicsPrediction{}, fmt.Errorf("no response choices returned")
	}

	var prediction PhysicsPrediction
	if err := json.Unmarshal([]byte(resp.Choices[0].Message.Content), &prediction); err != nil {
		return PhysicsPrediction{}, fmt.Errorf("failed to parse GPT response: %w\nResponse was: %s", err, resp.Choices[0].Message.Content)
	}

	return prediction, nil
}
