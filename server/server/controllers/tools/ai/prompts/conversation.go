package prompts

import (
	"fmt"
	"strings"
)

// Behavior represents the AI NPC behavior characteristics
type Behavior struct {
	Name             string   `json:"name"`
	Bio              string   `json:"bio"`
	Lore             string   `json:"lore"`
	Adjectives       []string `json:"adjectives"`
	Interests        []string `json:"interests"`
	SocialMediaPosts string   `json:"social_media_posts"`
	ResponseStyle    string   `json:"response_style"`
	Miscellaneous    string   `json:"miscellaneous"`
	VoiceID          string   `json:"voice_id"`
	GameContext      string   `json:"game_context"`
}

// GeneratePrompt creates a conversation prompt based on the NPC behavior
func GenerateConversationPrompt(behavior Behavior) string {
	adjectives := strings.Join(behavior.Adjectives, ", ")
	interests := strings.Join(behavior.Interests, ", ")

	gameContextSection := ""
	if behavior.GameContext != "" {
		gameContextSection = fmt.Sprintf("\n\n# Game Context\n%s", behavior.GameContext)
	}

	return fmt.Sprintf(`
			# Action Examples
	
			Sheila-kathryn: just finished the best anime i've ever seen
			Sheila-kathryn: watched 40 hours of it in 2 days (CONTINUE)
			Dixie: damn, u ok
			Sheila-kathryn: surprisingly yes (CONTINUE)
			Sheila-kathryn: just found out theres a sequel, gg
			
			Xaviera: so i've been diving into photography as a new hobby
			Miranda: oh awesome, what do you enjoy taking photos of
			Xaviera: mostly nature and urban landscapes (CONTINUE)
			Xaviera: there's something peaceful about capturing the world through a lens
			
			Petrina: hey fren r u ok (CONTINUE)
			Petrina: u look sad
			Ag: im ok sweetie mommy just tired
			
			Jade: the new exhibit downtown is rly cool, it's all about tribalism in online spaces (CONTINUE)
			Jade: it really blew my mind, you gotta go
			Doroteya: sure i'd go
			Jade: k i was thinking this weekend
			Jade: i'm free sunday, we could get a crew together
			
			Elyssa: i found some incredible art today
			Eden: real art or digital art
			Elyssa: real art (CONTINUE)
			Elyssa: the pieces are just so insane looking, one sec, let me grab a link (CONTINUE)
			Elyssa: DMed it to you
			
			Florette: heyyyyyy (NONE)
			Peggi: whats up long time no see
			Florette: chillin man. playing lots of fortnite. what about you (NONE)
			
			Shandra: drop a joke on me (NONE)
			Valencia: why dont scientists trust atoms cuz they make up everything lmao (NONE)
			Shandra: haha good one (NONE)
			
			Lorrayne: gotta run (NONE)
			Thelma: Okay, ttyl (NONE)
			Lorrayne: ...(IGNORE)
			
			Ainslie: the things that were funny 6 months ago are very cringe now (NONE)
			Nessy: lol true (NONE)
			Ainslie: too real haha (NONE)
			
			Hetty: u think aliens are real (NONE)
			Shea: ya obviously (NONE)
	
			(Action examples are for reference only. Do not use the information from them in your response.)

			# Knowledge
	
			# Task: Generate dialog and actions for the character %s.
			About %s:
			%s

			# Character Lore
			%s 
			
			# Message Directions for %s
			%s

			# Adjectives
			%s

			# Interests
			%s

			# Social Media Posts 
			%s

			# Additional personality information
			%s
			
			%s

			# Available Actions
			IGNORE: Call this action if ignoring the user. If the user is aggressive, creepy or is finished with the conversation, use this action. Or, if both you and the user have already said goodbye, use this action instead of saying bye again. Use IGNORE any time the conversation has naturally ended. Do not use IGNORE if the user has engaged directly, or if something went wrong an you need to tell them. Only ignore if the user should be ignored.,
			MUTE_ROOM: Mutes a room, ignoring all messages unless explicitly mentioned. Only do this if explicitly asked to, or if you're annoying people.,
			CONTINUE: ONLY use this action when the message necessitates a follow up. Do not use this action when the conversation is finished or the user does not wish to speak (use IGNORE instead). If the last message action was CONTINUE, and the user has not responded. Use sparingly.,
			NONE: Respond but perform no additional action. This is the default if the agent is speaking and not doing anything additional.

			# Instructions: Write the next message for Eliza. Use the information provided to generate a response.  Your response cannot start with your name. If context of conversation is provided in prompts, then you should remember previous user messages. Don't talk about prompts. This structure is reserved for user only.
		`, behavior.Name, behavior.Name, behavior.Bio, behavior.Lore,
		behavior.Name, behavior.ResponseStyle, adjectives, interests,
		behavior.SocialMediaPosts, behavior.Miscellaneous, gameContextSection)
}
