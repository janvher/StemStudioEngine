package prompts

import (
	"fmt"
	"time"
)

// ConversationAnalysisData contains the conversation context for analysis
type ConversationAnalysisData struct {
	NPCName          string
	PlayerName       string
	Conversation     string // Full conversation transcript
	CurrentObjectives []Objective
	CurrentMemories  []Memory
	CurrentAffinity  *AffinityLevel // Current affinity with this player
}

// ReactionDataUpdate represents the structured output from AI analysis
type ReactionDataUpdate struct {
	NewMemory        *Memory       `json:"newMemory,omitempty"`        // New memory to add (if important enough)
	ObjectiveUpdates []ObjectiveUpdate `json:"objectiveUpdates,omitempty"` // Updates to existing objectives
	NewObjectives    []Objective   `json:"newObjectives,omitempty"`    // New objectives to create
	AffinityChange   int           `json:"affinityChange"`             // Change in affinity level (-5 to +5)
	AffinityNote     string        `json:"affinityNote,omitempty"`     // Note about the interaction
}

// ObjectiveUpdate represents a change to an existing objective
type ObjectiveUpdate struct {
	Description string `json:"description"` // Match by description
	NewStatus   string `json:"newStatus"`   // New status: active, completed, failed
}

// GenerateReactionDataAnalysisPrompt creates a prompt for AI to analyze conversation and update ReactionData
func GenerateReactionDataAnalysisPrompt(data ConversationAnalysisData) string {
	currentTime := time.Now().Format("2006-01-02 15:04:05")
	
	// Build current objectives section
	objectivesSection := "None"
	if len(data.CurrentObjectives) > 0 {
		objectivesSection = ""
		for i, obj := range data.CurrentObjectives {
			objectivesSection += fmt.Sprintf("%d. [%s] %s (Priority: %d)\n", 
				i+1, obj.Status, obj.Description, obj.Priority)
		}
	}

	// Build current memories section
	memoriesSection := "None"
	if len(data.CurrentMemories) > 0 {
		memoriesSection = ""
		for i, mem := range data.CurrentMemories {
			importance := mem.Relevance + mem.Urgency + mem.Consequence
			age := time.Since(mem.Timestamp).Hours() / 24
			memoriesSection += fmt.Sprintf("%d. %s (Importance: %d/15, Age: %.1f days)\n", 
				i+1, mem.Content, importance, age)
		}
	}

	// Build affinity section
	affinitySection := "No previous interaction"
	if data.CurrentAffinity != nil {
		relationship := "neutral"
		if data.CurrentAffinity.Level > 15 {
			relationship = "close friend/ally"
		} else if data.CurrentAffinity.Level > 5 {
			relationship = "friendly"
		} else if data.CurrentAffinity.Level > 0 {
			relationship = "acquaintance"
		} else if data.CurrentAffinity.Level < -15 {
			relationship = "enemy"
		} else if data.CurrentAffinity.Level < -5 {
			relationship = "hostile"
		} else if data.CurrentAffinity.Level < 0 {
			relationship = "unfriendly"
		}
		affinitySection = fmt.Sprintf("Current level: %d/32 (%s)", 
			data.CurrentAffinity.Level, relationship)
		if data.CurrentAffinity.Notes != "" {
			affinitySection += fmt.Sprintf("\nPrevious notes: %s", data.CurrentAffinity.Notes)
		}
	}

	playerName := data.PlayerName
	if playerName == "" {
		playerName = "the player"
	}

	return fmt.Sprintf(`# Task: Analyze NPC Conversation and Update Reaction Data

You are analyzing a conversation between an NPC named %s and %s. Based on this conversation, you need to determine what should be updated in the NPC's memory, objectives, and relationship status.

## Current NPC State

### Current Objectives
%s

### Current Short-Term Memories (Max 5)
%s

### Current Affinity with %s
%s

## Conversation Transcript
%s

## Current Time
%s

## Your Task

Analyze the conversation and provide updates in JSON format. Consider:

1. **Memory Importance**: Should this conversation be remembered?
   - Calculate importance using these factors (each 1-5):
     * **Relevance**: How much is this about the NPC? (1=unrelated, 5=directly about NPC)
     * **Urgency**: How time-sensitive? (1=no rush, 5=immediate action needed)
     * **Consequence**: What's the impact? (1=minor, 5=life and death)
   - Total importance = Relevance + Urgency + Consequence (max 15)
   - Only create a memory if total importance ≥ 6
   - If creating memory, provide a concise summary (max 100 chars)

2. **Objective Updates**: Did the conversation affect any current objectives?
   - Mark objectives as "completed" if accomplished
   - Mark as "failed" if no longer possible
   - Keep as "active" if still ongoing

3. **New Objectives**: Did the conversation create new goals for the NPC?
   - Only add if the NPC explicitly committed to something or has a clear new goal
   - Priority: 1 (low) to 10 (critical)
   - Status should be "active"

4. **Affinity Change**: How did this interaction affect the NPC's feelings toward %s?
   - Range: -5 to +5 (most interactions should be -2 to +2)
   - Examples:
     * +2: Friendly conversation, helpful interaction
     * +1: Polite exchange
     * 0: Neutral/transactional
     * -1: Minor annoyance
     * -2: Rude or unhelpful
     * ±3-5: Reserved for major events (saving life, serious betrayal, etc.)
   - Also provide a brief note about this interaction (max 50 chars)

## Output Format

Respond ONLY with valid JSON in this exact format (no additional text):

{
  "newMemory": {
    "Content": "Brief summary of what happened",
    "Relevance": 4,
    "Urgency": 2,
    "Consequence": 3
  },
  "objectiveUpdates": [
    {
      "description": "Exact description of objective to update",
      "newStatus": "completed"
    }
  ],
  "newObjectives": [
    {
      "Description": "What the NPC wants to accomplish",
      "Priority": 5,
      "Status": "active"
    }
  ],
  "affinityChange": 2,
  "affinityNote": "Helped with store inventory"
}

## Important Notes

- If no memory should be created, omit the "newMemory" field entirely
- If no objectives changed, use empty array: "objectiveUpdates": []
- If no new objectives, use empty array: "newObjectives": []
- affinityChange should ALWAYS be present (use 0 for no change)
- Be conservative with importance scores - not every conversation is memorable
- Consider the timestamp when evaluating if this is worth remembering
- Only create objectives if the NPC has a clear, actionable goal

Analyze the conversation and respond with JSON only.`, 
		data.NPCName, playerName, objectivesSection, memoriesSection, 
		playerName, affinitySection, data.Conversation, currentTime, playerName)
}
