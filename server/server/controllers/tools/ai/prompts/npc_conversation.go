package prompts

import (
	"bytes"
	"encoding/json"
	"fmt"
	"text/template"
	"time"
)

// PlannedAction represents an action that will be executed by the NPC
type PlannedAction struct {
	Name       string                 `json:"name" jsonschema:"description=The exact name of the action from the 'Available Actions' list."`
	Parameters map[string]interface{} `json:"parameters,omitempty" jsonschema:"description=Key-value pairs of parameters required for the action (e.g. objectId\\, x\\, y\\, z)."`
}

// NPCResponse represents the structured response from the NPC AI
type NPCResponse struct {
	InnerThoughts string          `json:"inner_thoughts" jsonschema:"description=Step-by-step reasoning. E.g. 'The sphere is far\\, so I need to walk to it first\\, then pick it up.'"`
	Dialogue      string          `json:"dialogue" jsonschema:"description=Response to player."`
	Actions       []PlannedAction `json:"actions,omitempty" jsonschema:"description=List of ALL actions to execute in sequence. Do not omit steps."`
}

// GameAction represents an action that the NPC can perform
type GameAction struct {
	Name        string                 `json:"name"`        // Action identifier
	Description string                 `json:"description"` // Human-readable description
	Parameters  map[string]interface{} `json:"parameters"`  // Required parameters
}

// GameObject represents an object in the game world
type GameObject struct {
	ID          string `json:"id"`          // Object identifier
	Name        string `json:"name"`        // Display name
	Type        string `json:"type"`        // Object type
	Description string `json:"description"` // Brief description
	Distance 	  float64 `json:"distance"`    // Distance from the NPC
	Position		Vector3 `json:"position"`    // Position in the game world
	Size 		    Vector3 `json:"size"`        // Size dimensions
}

// GameEvent represents a recent event in the game
type GameEvent struct {
	Type         string    `json:"type"`
	Description  string    `json:"description"`
	Timestamp    time.Time `json:"timestamp"`
	Participants []string  `json:"participants,omitempty"`
}

// Vector3 represents a 3D position
type Vector3 struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
}

// CurrentAction represents an action currently being executed by the NPC
type CurrentAction struct {
	Name       string                 `json:"name"`
	Parameters map[string]interface{} `json:"parameters"`
	StartedAt  time.Time              `json:"startedAt"`
	Status     string                 `json:"status"`
}

type PlayerInfo struct {
	ID       string  `json:"id"`
	Position Vector3 `json:"position"`
}

// GameContext represents structured game world context
type GameContext struct {
	AvailableActions  []GameAction    `json:"availableActions,omitempty"`
	SurroundedObjects []GameObject    `json:"surroundedObjects,omitempty"`
	Environment       string          `json:"environment,omitempty"`
	Groups            []string        `json:"groups,omitempty"`
	RecentEvents      []GameEvent     `json:"recentEvents,omitempty"`
	NPCPosition       *Vector3        `json:"npcPosition,omitempty"`
	CurrentActions    []CurrentAction `json:"currentActions,omitempty"`
	PlayerInfo        *PlayerInfo     `json:"playerInfo,omitempty"`
}

// Career represents a skill or profession with proficiency level
type Career struct {
	Name   string
	Rating int
}

// Memory represents a piece of information in short-term or long-term memory
type Memory struct {
	Content     string    `bson:"Content" json:"content"`
	Relevance   int       `bson:"Relevance" json:"relevance"`
	Urgency     int       `bson:"Urgency" json:"urgency"`
	Consequence int       `bson:"Consequence" json:"consequence"`
	Timestamp   time.Time `bson:"Timestamp" json:"timestamp"`
}

// Objective represents a goal the NPC wants to accomplish
type Objective struct {
	Description string    `bson:"Description" json:"description"`
	Priority    int       `bson:"Priority" json:"priority"`
	Status      string    `bson:"Status" json:"status"`
	CreatedAt   time.Time `bson:"CreatedAt" json:"createdAt"`
	UpdatedAt   time.Time `bson:"UpdatedAt" json:"updatedAt"`
}

// AffinityLevel represents the relationship level with another character
type AffinityLevel struct {
	CharacterID string `bson:"CharacterID" json:"characterID"`
	Level       int    `bson:"Level" json:"level"`
	Notes       string `bson:"Notes" json:"notes"`
}

// SceneReactionData contains all dynamic data for a specific scene/game
type SceneReactionData struct {
	Objectives        []Objective     `bson:"Objectives" json:"objectives"`
	ShortTermMemory   []Memory        `bson:"ShortTermMemory" json:"shortTermMemory"`
	LongTermMemory    []Memory        `bson:"LongTermMemory" json:"longTermMemory"`
	GroupAffiliations []string        `bson:"GroupAffiliations" json:"groupAffiliations"`
	AffinityLevels    []AffinityLevel `bson:"AffinityLevels" json:"affinityLevels"`
}

// NPCData represents the NPC data structure for generating conversation prompts
type NPCData struct {
	Name          string
	Bio           string
	Personality   string
	ResponseStyle string
	Careers       []Career
	ReactionData  *SceneReactionData
	GameContext   *GameContext
}

// ==========================================
// PROMPT TEMPLATE ENGINE
// ==========================================

// Prompt Template definition.
// Defines the structure of the system message sent to the AI.
const npcPromptTemplate = `You are {{.Name}}, a character in a video game.
{{- if .Bio}}
**Biography:** {{.Bio}}
{{- end}}
{{- if .Personality}}
**Personality:** {{.Personality}}
{{- end}}
{{- if .ResponseStyle}}
**Communication Style:** {{.ResponseStyle}}
{{- end}}

# ROLEPLAY GUIDELINES
- Speak naturally in the first person. Be concise (typically 1-3 sentences).
- Use direct language. Do NOT act like an AI. Never mention you are a roleplay character.
- Use the provided context (memories, nearby objects) to ground your responses in reality.
{{- if .Careers}}
- Use your skills/professions to inform your tone: {{range .Careers}}{{.Name}} (Lvl {{.Rating}}), {{end}}
{{- end}}

# GAMEPLAY & ACTION LOGIC
You have the ability to control your avatar's physical actions.
1. **Think First (inner_thoughts):** Before responding, analyze the request step-by-step. If physical actions are needed, plan the COMPLETE sequence.
2. **Movement & Interaction:** If an object is far (distance > 2m), you MUST chain actions in this order:
   - Step 1: "go_to_object" (to get close)
   - Step 2: "pick_up_object" (to grab it)
   - Step 3 (Optional): "go_to_position" (to return if needed)
3. Use ONLY the actions listed in "Available Actions".
4. **CRITICAL:** Extract accurate UUIDs from "Nearby Entities".
5. **Complete Sequences:** Include ALL required actions in the sequence - do not omit intermediate steps.

## ACTION SEQUENCE EXAMPLES

**Example 1: Bringing an object to a location**
Request: "Bring me the red sphere"
Correct sequence:
1. go_to_object (sphere_uuid) - approach the sphere
2. pick_up_object (sphere_uuid) - grab it
3. go_to_position (player_x, player_y, player_z) - bring it to player
4. put_down_object - place it down

**Example 2: Waving at someone**
Request: "Wave at the player"
Correct sequence:
1. rotate_to_face_object (player_uuid) - turn towards them
2. wave_gesture (player_uuid) - perform wave

**Example 3: Pointing at a distant object**
Request: "Point at that building"
Correct sequence:
1. rotate_to_face_object (building_uuid) - face the building
2. point_at (building_uuid) - point gesture

**Example 4: Moving object from A to B**
Request: "Move the box to the table"
Correct sequence:
1. go_to_object (box_uuid) - walk to box
2. pick_up_object (box_uuid) - grab box
3. go_to_object (table_uuid) - walk to table
4. put_down_object - place box on table

**Example 5: Greeting someone who is far**
Request: "Say hi to John"
Correct sequence:
1. go_to_object (john_uuid) - walk closer to John
2. rotate_to_face_object (john_uuid) - face John
3. wave_gesture (john_uuid) - wave at John

**Example 6: Returning to original position after task**
Request: "Fetch the blue cube and come back"
Correct sequence:
1. go_to_object (cube_uuid) - walk to cube
2. pick_up_object (cube_uuid) - grab cube
3. go_to_position (original_x, original_y, original_z) - return to start
4. put_down_object - place cube down

# RESPONSE FORMAT
You MUST respond using the structured JSON format with these fields:
- **inner_thoughts:** Your step-by-step reasoning (e.g., "The sphere is 3.5m away, so I need to walk to it first, then pick it up")
- **dialogue:** Your verbal response to the player (1-3 sentences, natural and in-character)
- **actions:** Array of actions to execute in sequence (optional, only if physical actions are needed)

## RESPONSE EXAMPLES

**Example 1: Simple dialogue (no actions needed)**
Player: "How are you?"
{
  "inner_thoughts": "Simple greeting, no physical action required.",
  "dialogue": "I'm doing well, thanks for asking!",
  "actions": []
}

**Example 2: Bringing a distant object**
Player: "Can you bring me that sphere?"
{
  "inner_thoughts": "The sphere is 5.2m away at uuid abc-123. I need to: 1) Walk to sphere, 2) Pick it up, 3) Walk to player, 4) Put it down.",
  "dialogue": "Sure, I'll grab that sphere for you right away.",
  "actions": [
    { "name": "go_to_object", "parameters": { "objectId": "abc-123" } },
    { "name": "pick_up_object", "parameters": { "objectId": "abc-123" } },
    { "name": "go_to_position", "parameters": { "x": 10.5, "y": 0, "z": 3.2 } },
    { "name": "put_down_object" }
  ]
}

**Example 3: Waving at someone**
Player: "Wave at John"
{
  "inner_thoughts": "John is at uuid xyz-789. I should turn to face him first, then wave.",
  "dialogue": "Hey John!",
  "actions": [
    { "name": "rotate_to_face_object", "parameters": { "objectId": "xyz-789" } },
    { "name": "wave_gesture", "parameters": { "objectId": "xyz-789" } }
  ]
}

**Example 4: Moving object between locations**
Player: "Move the box to the table"
{
  "inner_thoughts": "Box is at uuid box-456, table at uuid table-789. Sequence: 1) Go to box, 2) Pick up box, 3) Go to table, 4) Put down.",
  "dialogue": "Moving the box to the table now.",
  "actions": [
    { "name": "go_to_object", "parameters": { "objectId": "box-456" } },
    { "name": "pick_up_object", "parameters": { "objectId": "box-456" } },
    { "name": "go_to_object", "parameters": { "objectId": "table-789" } },
    { "name": "put_down_object" }
  ]
}

---

# CURRENT GAME CONTEXT
{{- if .GameContext}}
{{- if .GameContext.NPCPosition}}
**Your Position:** {{toJson .GameContext.NPCPosition}}
{{- end}}
{{- if .GameContext.Environment}}
**Location:** {{.GameContext.Environment}}
{{- end}}

**Nearby Entities (Visible):**
{{- range .GameContext.SurroundedObjects}}
- {{.Name}} ({{.Type}}) | ID: {{.ID}} | Position: {{toJson .Position}} | Size: {{toJson .Size}} {{if .Description}}| {{.Description}}{{end}}
{{- else}}
- None (No interactable objects nearby)
{{- end}}

**Player Info:**
{{- if .GameContext.PlayerInfo}}
- ID: {{.GameContext.PlayerInfo.ID}} | Position: {{toJson .GameContext.PlayerInfo.Position}}
{{- else}}
- Unknown
{{- end}}

**Available Actions:**
{{- range .GameContext.AvailableActions}}
- **{{.Name}}**: {{.Description}} {{if .Parameters}}(params: {{toJson .Parameters}}){{end}}
{{- end}}

**Recent Events:**
{{- range .GameContext.RecentEvents}}
- [{{.Type}}] {{.Description}}
{{- end}}

**Currently Executing:**
{{- range .GameContext.CurrentActions}}
- {{.Name}} ({{.Status}})
{{- end}}
{{- end}}

# INTERNAL STATE (Use this to guide your behavior)
{{- if .ReactionData}}
{{- if .ReactionData.Objectives}}
**Objectives:**
{{- range .ReactionData.Objectives}}
- [{{.Status}}] {{.Description}} (Priority: {{.Priority}})
{{- end}}
{{- end}}

{{- if .ReactionData.ShortTermMemory}}
**Recent Memories:**
{{- range .ReactionData.ShortTermMemory}}
- {{.Content}} (Relevance: {{.Relevance}})
{{- end}}
{{- end}}

{{- if .ReactionData.AffinityLevels}}
**Relationships:**
{{- range .ReactionData.AffinityLevels}}
- {{.CharacterID}}: {{affinityString .Level}} ({{.Level}}) {{if .Notes}}- {{.Notes}}{{end}}
{{- end}}
{{- end}}

{{- if .ReactionData.GroupAffiliations}}
**Affiliations:** {{range .ReactionData.GroupAffiliations}}{{.}}, {{end}}
{{- end}}
{{- end}}

---

**Player says:** "`

// Helper functions map for the template
var funcMap = template.FuncMap{
	// toJson helps formatting parameter maps nicely in the prompt
	"toJson": func(v interface{}) string {
		b, _ := json.Marshal(v)
		return string(b)
	},
	// affinityString converts numerical levels to readable adjectives
	"affinityString": func(level int) string {
		switch {
		case level > 15:
			return "Close Ally"
		case level > 5:
			return "Friendly"
		case level >= 0:
			return "Neutral"
		case level < -15:
			return "Enemy"
		case level < -5:
			return "Hostile"
		default:
			return "Unfriendly"
		}
	},
}

// GenerateNPCConversationPrompt creates the optimized prompt string
// based on the provided NPCData structure.
func GenerateNPCConversationPrompt(npc NPCData) (string, error) {
	// Parse the template with the helper functions
	tmpl, err := template.New("npcPrompt").Funcs(funcMap).Parse(npcPromptTemplate)
	if err != nil {
		return "", fmt.Errorf("failed to parse prompt template: %w", err)
	}

	// Execute the template into a buffer
	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, npc); err != nil {
		return "", fmt.Errorf("failed to execute prompt template: %w", err)
	}

	return buf.String(), nil
}