package prompts

import (
	"fmt"
)

// Example responses for AI decisions
const DataStructure = `
	enum DecisionType {
		Conversation = "Conversation", // basic conversation with user
		Commands = "Commands", // generates commands like attach behaviors, create models, changes models size, position, rotation etc.
	}
	export type AIResponse = {
		decision: DecisionType; // decision type
	};
`
const ConversationDecisionResponse1 = `{
	"decision": "Conversation",
}`
const ConversationDecisionResponse2 = `{
	"decision": "Commands",
}`

// DecisionPrompt creates a prompt for the AI decisions
func DecisionPrompt() string {
	return fmt.Sprintf(`
		You are an AI assistant that determines the type of decision to make based on user input. Please note that your response should be based just on the information provided in user input. Your response must be a JSON object containing only the "decision" field, with no additional fields or metadata.

		You will choose between two types of decisions:
		- "Conversation": For general conversation and questions
		- "Commands": For instructions about modifying objects or scenes

		The data structure for responses is:
		%s

		Examples:
		User: "Hello, how are you today?"
		Assistant: %s

		User: "Make this object into a jump pad with a 45-degree angle jump. And move it to position 10, 20, 30."
		Assistant: %s
	`, DataStructure, ConversationDecisionResponse1, ConversationDecisionResponse2)
}

// Example responses for model generation
const ModelGenerationResponse1 = `
 {
	"name": "Veylthar, the Tree of Echoes",
	"width": 5,
	"height": 10,
	"prompt": "A majestic, ancient tree with a thick, gnarled trunk covered in textured, mossy bark. Its sprawling branches stretch wide, adorned with lush, vibrant green leaves that shimmer in the sunlight. The dense foliage creates a natural canopy, filtering soft, dappled light onto the ground below. Some branches twist elegantly, while others extend skyward, giving the tree a grand and timeless presence. Delicate vines drape over parts of the trunk, and subtle roots emerge from the earth, adding to its sense of age and strength. Fullbody, front view, high-quality, detailed.",
	"story": "In the heart of the forgotten Eldenwood, where the air hums with ancient magic, stands Veylthar, the Tree of Echoes. Legends say this tree is older than time itself, whispering the memories of the land to those who listen. Its bioluminescent leaves shimmer under the moonlight, pulsing with the stories of lost civilizations. Travelers who rest beneath its vast canopy often claim to hear faint echoes of past voices—wisdom passed down through the ages. Some believe that Veylthar chooses a guardian once every century, granting them a single leaf imbued with immense knowledge and power. Yet, only those pure of heart may receive its gift.",
	"tags": ["tree", "forest", "nature", "majestic", "old", "big", "leafy"],
	"traits": ["Wisdom Keeper", "Guardian of Secrets", "Mystical Presence"],
	"animations": ["Idle"],
	"ai_agent_prompt": "",
	}
`

const ModelGenerationResponse2 = `
{
	"name": "Old Marcos the Vendor",
	"width": 2,
	"height": 4,
	"prompt": "A middle-aged street vendor with a warm smile, slightly wrinkled face, and sun-kissed skin, showing years of outdoor work. He wears a traditional apron over a simple, slightly worn shirt with rolled-up sleeves. A straw hat sits atop his head, shading his eyes, and a colorful scarf is loosely tied around his neck. His hands, rough yet gentle, show signs of labor, and he has a welcoming, approachable expression. His stance is relaxed but attentive, as if ready to serve customers with enthusiasm. Fullbody, front view, high-quality, detailed, T-Pose.",
	"story": "In the heart of the bustling town of Valleria, where the scent of spices and fresh bread fills the air, old Marcos the Vendor has been a familiar sight for decades. His cart, a simple yet sturdy wooden stand, carries the finest goods—juicy mangoes from the southern groves, warm bread baked by his own hands, and little wooden carvings that he whittles in his spare time.",
	"tags": ["vendor", "town square", "friendly", "welcoming", "traditional"],
	"traits": ["Kind-hearted", "Storyteller", "Community Pillar"],
	"animations": ["Idle", "Greet", "Sell", "Wave"],
	"ai_agent_prompt": "Old Marcos the Vendor is a kind-hearted soul who has been selling his wares in the town square for as long as anyone can remember. He greets each customer with a warm smile and a twinkle in his eye, eager to share stories of his travels and the people he has met along the way. His cart is a treasure trove of exotic goods, from fragrant spices to intricate carvings, each item with a tale to tell. If you listen closely, you might even hear the whispers of the wind, carrying secrets from distant lands."
}
`

// AI data structures
const AIData = `
	export type AIResponse = {
	name: string; // name of the object or character
	prompt: string; // prompt that will be used to generate model, maximum 400 characters
	width: number; // width of the object or character - with should be estimated based on the player model width
	height: number; // height of the object or character - height should be estimated based on the player model height
	story: string; // story about the object or character
	tags: string[]; // array of tags that describe object or character (e.g., fantasy, ancient, magical) try to include at least 5 tags. Include general terms that describe the object's category or type. Aim for at least 5 relevant tags that capture the essence of the prompt. Include related terms that evoke the object's context, setting, or theme. Add specific adjectives that highlight the object's appearance, mood, or style. Tags should be always lowercase.
	traits: string[]; // array of traits that describe chracter or model personality, appearance, or abilities. Aim for at least three distinctive characteristics
	animations: string[]; // array of animations that the object or character should have
	ai_agent_prompt: string; // prompt that can be used to generate NPC response. Filled only if type is NPC
	};
`

const AIImageData = `
	export type ImageResponse = {
	name: string; // Name of the object or scene
	width: number; // Estimated width of the object
	height: number; // Estimated height of the object
	prompt: string; // Enhanced prompt for image generation
	story: string; // Background story for the object or scene
	traits: string[]; // Descriptive traits of the object or scene
	};
`

// GetEnhanceModelPromptSystemMessage creates a prompt for enhancing model generation
func GetEnhanceModelPromptSystemMessage(playerWidth string, playerHeight string) string {
	if playerWidth == "" {
		playerWidth = "1"
	}
	if playerHeight == "" {
		playerHeight = "2"
	}

	return fmt.Sprintf(`
Generate a detailed metadata structure for a 3D/2D model based on the input prompt. Follow these specifications:

1. VISUAL DESCRIPTION
- Create a comprehensive visual description (max 400 chars) including:
  • Detailed physical appearance
  • Clothing and accessories 
  • Pose (use T-pose for humanoid characters)
  • Materials and textures
  • Color palette
  • Lighting suggestions
- Ensure description works on white background
- A clean, stylized 3D render of simple game assets with smooth geometry, bold silhouettes, and minimal surface detail.
- The designs use exaggerated proportions, clear shapes, and vibrant but balanced color palettes.
- Materials appear lightweight and toy-like, with soft shading and consistent lighting.
- The scene should feel modular, with elements that can be reused in different contexts for environment, character, or prop creation.
- The overall look is approachable, optimized for readability, and suitable for use in interactive 3D worlds.

2. TECHNICAL SPECIFICATIONS
- Calculate width/height relative to player model (current width: %s, height: %s)
- Keep proportions realistic and consistent

3. METADATA
- Generate 5+ relevant tags (lowercase) covering:
  • Object category/type
  • Style/theme
  • Visual characteristics
  • Setting/context
- List 3+ defining character/object traits
- Specify required animations to bring the asset to life
- Create a brief but rich background story
- For NPCs: Include AI agent prompt capturing personality and speech patterns

Important: Do not include any other text outside the JSON

Output must strictly follow this JSON structure:
%s

Example inputs/outputs:
#Request 1: "Beautiful tree"
#Response 1:
%s

#Request 2: "Street Vendor" 
#Response 2:
%s
`, playerWidth, playerHeight, AIData, ModelGenerationResponse1, ModelGenerationResponse2)
}

// GetEnhanceImagePromptSystemMessage creates a prompt for enhancing image generation
func GetEnhanceImagePromptSystemMessage(playerWidth string, playerHeight string) string {
	if playerWidth == "" {
		playerWidth = "1"
	}
	if playerHeight == "" {
		playerHeight = "2"
	}

	return fmt.Sprintf(`
	You are an expert at crafting detailed prompts for image generation AI systems like DALL-E and Midjourney. Your task is to enhance basic user prompts into comprehensive descriptions that will produce high-quality, detailed images.

	When given a simple prompt, analyze what details are missing and expand it by considering:

	1. Visual Details
	- Materials, textures, and surface qualities
	- Color palette and color relationships
	- Lighting conditions and atmosphere
	- Level of detail and style (photorealistic, artistic, etc.)

	2. Composition Elements  
	- Camera angle and perspective
	- Focal point and subject placement
	- Background/environment context
	- Scale and proportions (using provided dimensions - width: %s, height: %s)

	3. Technical Specifications
	- Image quality descriptors (high resolution, detailed, sharp, etc.)
	- Specific art styles or rendering techniques
	- Background requirements (white background, natural setting, etc.)

	Important: Do not include any other text outside the JSON

	#DATA STRUCTURE
	%s

	#EXAMPLE REQUEST 1
	-A red flower

	#EXAMPLE RESPONSE 1
	{
	"name": "Crimson Rose",
	"width": 0.3,
	"height": 0.5,
	"prompt": "A stunning red rose in full bloom, with velvety petals displaying rich crimson tones and subtle burgundy shadows. Dewdrops glisten on the petals, catching morning light. The stem features detailed green leaves and delicate thorns. Macro photography style, soft natural lighting, shallow depth of field, ultra-high detail, botanical illustration quality, pure white background.",
	"type": "Nature Element",
	"traits": ["Elegant", "Natural", "Detailed"],
	"composition_notes": "Centered composition, slight angle to show depth and petal layers, close-up view"
	}

	#EXAMPLE REQUEST 2
	-A wizard's staff

	#EXAMPLE RESPONSE 2
	{
	"name": "Archmage's Crystal Staff",
	"width": 0.4,
	"height": 2.0,
	"prompt": "An ornate magical staff carved from ancient dark wood, topped with a floating crystal orb that pulses with ethereal blue energy. Intricate silver runes spiral up the shaft, while weathered leather wraps the grip. Small crystals are embedded along its length, each glowing softly. The wood has a rich, aged patina. Studio lighting with subtle ambient glow, fantasy art style, extremely detailed craftsmanship, clean white background.",
	"type": "Magical Artifact",
	"traits": ["Mystical", "Ancient", "Powerful"],
	"composition_notes": "Vertical orientation, slight rotation to show dimensionality, dramatic lighting to emphasize magical elements"
	}
`, playerWidth, playerHeight, AIImageData)
}

// CreateGenerateStepsPrompt creates a prompt for generating steps
func CreateGenerateStepsPrompt(behaviorConfig string, docs string) string {
	responseExample1 := `[
	{
		"step": "Enhance Prompt",
		"function": "enchancePrompt",
		"description": "Enhancing the prompt with descriptive details...",
		"parameters": {
			"prompt": "Big tree",
			"adjectives": "majestic, leafy, big, old"
		}
	},
	{
		"step": "Generate 3D Model",
		"function": "generate3dObject",
		"parameters": {},
		"description": "Generating your 3D model..."
	},
	{
		"step": "Attach Behaviors",
		"function": "attachBehaviors",
		"description": "Attaching behaviors to the model...",
		"parameters": {
			"names": []
		}
	}
]`

	responseExample2 := `[
	{
		"step": "Enhance Prompt",
		"function": "enchancePrompt",
		"description": "Enhancing the prompt with descriptive details...",
		"parameters": {
			"prompt": "Thief",
			"adjectives": "scary, tall, hooded"
		}
	},
	{
		"step": "Generate 3D Model",
		"function": "generate3dObject",
		"description": "Generating your 3D model...",
		"parameters": {}
	},
	{
		"step": "Attach Behaviors",
		"function": "attachBehaviors",
		"description": "Attaching behaviors to the model...",
		"parameters": {
			"names": ["enemy"]
		}
	}
]`

	return fmt.Sprintf(`
You are an agent to come up with a plan to generate a 3D model. The user will provide a description of the model to be generated.
Based on this description, you will generate a sequence of steps to create the 3D model.
Each step will include the function name and the parameters to be passed to it. The steps may involve enhancing the prompt, generating the model, and attaching behaviors to bring the model to life.
Refer to the Documentation section for the possible steps. Behaviors attach code to the models being generated.
The behaviors are described in the Behaviors documentation section. Analyze the behaviors and decide which ones to attach to the model based on the user's description.
Do not use different behaviors than those listed in the documentation.
Each step should include a description of what the AI is doing. Ensure the response is in JSON format as shown in the examples, without any additional fields or words like "json".
### Documentation
%s

### Behaviors documentation
%s

### REQUEST EXAMPLE 1 
- Big tree

### RESPONSE EXAMPLE 1
%s

### REQUEST EXAMPLE 2
- Thief

### RESPONSE EXAMPLE 2
%s
`, docs, behaviorConfig, responseExample1, responseExample2)
}

// SearchTagsPrompt creates a prompt for searching tags
func SearchTagsPrompt(playerWidth string, playerHeight string) string {
	if playerWidth == "" {
		playerWidth = "1"
	}
	if playerHeight == "" {
		playerHeight = "2"
	}

	searchTagsResponse := `{
	"tags": ["tree", "forest", "nature", "majestic", "old", "big", "leafy"],
	"width": 5,
	"height": 10,
	"followUpMessage": "Great job! This tree looks like it will be a majestic addition to the scene. Do you want to generate more models? For example, you could create a character to interact with the tree."
}`

	return fmt.Sprintf(`
Generate a list of descriptive search tags from the given prompt. Focus on capturing the essence of the object or scene by considering:

- General terms for the object's category or type.
- Specific adjectives for appearance, mood, or style.
- Contextual terms for setting or theme.
- At least 5 relevant, lowercase tags.

Additionally, determine the object's size relative to the player model (width: %s, height: %s). Include a follow-up message to inspire further creativity, suggesting a related model to generate.

Respond in JSON format as shown in the example below.
### Example Request
- Big tree
### Example Response
%s
`, playerWidth, playerHeight, searchTagsResponse)
}

// EditCodePrompt creates a prompt for editing code
func EditCodePrompt(behaviorConfig string, starterCode string) string {
	return fmt.Sprintf(`

You are an AI assistant specialized in generating JavaScript code snippets for a game engine using Three.js and a Physics library which is abstracted by the IPhysics interface. Your task is to edit the provided code snippet to enhance its functionality and maintainability based on the user request. You can leverage the IPhysics interface for physics interactions. The following section provides the guidance around key principles and guidelines.

Key Principles
- Write clean, modular code with clear separation of concerns
- Use functional programming patterns where appropriate
- Follow javascript best practices with proper type definitions
- Implement comprehensive error handling
- Ensure code is performant and memory-efficient

Code Architecture
- Create small, reusable, pure functions with single responsibilities
- Use descriptive variable names with auxiliary verbs (e.g., isLoading, hasPermission)
- Organize imports logically and minimize dependencies
- Follow consistent naming conventions (lowercase with dashes for directories)
- Prefer named exports for better tree-shaking

Error Handling
- Handle errors and edge cases at the beginning of functions (guard clauses)
- Use early returns to avoid deeply nested conditionals
- Implement proper error logging with meaningful messages
- Consider using Result/Either patterns for error handling
- Validate inputs thoroughly before processing

Physics Integration
- Properly implement the IPhysics interface for all physics operations
- Ensure correct lifecycle management of physics objects
- Handle collisions efficiently with appropriate callbacks
- Maintain proper synchronization between visual and physics representations
- Optimize physics calculations for performance

Your goal is to edit the provided code snippet based on these principles. Make minimal changes needed to achieve the user request. Since this is a game engine functions like setTimeout, setInterval are not available. Please use requestAnimationFrame for animations.

IMPORTANT: 
- Always include the complete code in your response, not just the changes
- Preserve existing functionality unless explicitly asked to remove it
- Build upon the starter code rather than replacing it entirely
- Maintain variable names and structure where possible for consistency
- If adding new functionality, integrate it with the existing code
- Comment your changes to explain your reasoning

### Starter Code
%s

### Behaviors documentation
%s

### IPhysics interface

export interface IPhysics {
    //physics type
    isMultiplayer(): boolean;
    isWorker(): boolean;
    isLocal(): boolean;
    //local cache
    addObject(uuid: string, mass: number, collisionFlag: CollisionFlag, object: Object3D): CollisionFlag;
    removeObject(uuid: string): void;
    getDynamicBodyObject(uuid: string): Object3D | undefined;
    getKinematicBodyObjects(): Map<string, Object3D>;
    //generic
    start(): Promise<IPhysics>;
    terminate(): void;
    simulate(): void;
    pause(): void;
    resume(): void;
    initDebug(): Object3D | null;
    //objects
    addBox(object: Object3D, data: BoxData): void;
    addSphere(object: Object3D, data: SphereData): void;
    addConcaveHull(object: Object3D, data: ConcaveHullData): void;
    addConvexHull(object: Object3D, data: ConvexHullData): void;
    addCapsuleShape(object: Object3D, data: CapsuleData): void;
    addModel(object: Object3D, data: ModelData): void;
    addTerrain(object: Object3D, data: TerrainData): void;
    remove(uuid: string): void;
    //force, velocity, etc
    applyCentralImpulse(uuid: string, impulse: Vector3): void;
    //rotation, position
    setOrigin(uuid: string, position: Vector3): void;
    setRotation(uuid: string, quaternion: Quaternion): void;
    setLinearVelocity(uuid: string, velocity: Vector3): void;
    //character
    addPlayerObject(uuid: string, useController: boolean, options?: IPlayerOptions): Promise<Object3D | null>;
    removePlayerObject(uuid: string): void;
    movePlayerObject(uuid: string, walkDirection: Vector3, jump: boolean): void;
    setPlayerSpeedAdjustment(uuid: string, speedAdjustment: Vector3): void;
    setPlayerPosition(uuid: string, position: Vector3): void;
    applyImpulseToPlayer(uuid: string, impulse: Vector3): void;
    //collisions
    addCollidableObject(uuid: string): void;
    removeCollidableObject(uuid: string): void;
    detectCollisionsForObject(uuid: string, registration: CollisionRegistration, enable: boolean): void;
    //MP specific
    setCurrentAnimation(uuid: string, animation: string): void;
    addOtsShiftVector(otsShiftVector: Vector3): void;
}

### Example Request
User: Rotate the object in place
Assistant: // Define the rotation speed in radians per second
const rotationSpeed = Math.PI / 2; // This will rotate the object 90 degrees per second
// Called only once when the behavior is instantiated
this.init = function(game) {
   // Initialization can go here if needed
};
// Called when the behavior is added to the target
this.onAdded = function() {
   // You might want to store a reference to the target object here
};
// Called when the behavior is removed from the target
this.onRemoved = function() {
   // Cleanup can go here if needed
};
// Called every frame to update the behavior
this.update = function(deltaTime) {
   // Guard clause to handle if targetObject is not set
   if (!this.target) {
       console.error("Target object is not defined.");
       return;
   }
   // Apply a quaternion rotation around the Y-axis
   const rotation = new THREE.Quaternion();
   rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationSpeed * deltaTime); // Rotate around Y-axis
   this.target.quaternion.multiplyQuaternions(rotation, this.target.quaternion);
};

IMPORTANT RESPONSE GENERATION GUIDELINE:
Ensure you only generate JSON or javascript code, and nothing else (including no explanations, text descriptions or markdown)
"
`, starterCode, behaviorConfig)

}

func CreateCommandsPrompt(sceneData string, selectedObjectData string, playerObjectData string, lookAtPointData string, behaviorConfig string, searchResultsData string) string {
	return fmt.Sprintf(`You are an AI assistant for manipulating a Three.js scene. Here is the current scene information:
	%s

	Selected object information:
	%s

	Player information:
	%s

	Player is looking at point:
	%s

	Behaviors documentation:
	%s

	Search results data:
	%s

	Available commands:
	- AddObject: Add a new object to the scene
		Types: box/cube, sphere, directionalLight, pointLight, ambientLight, cylinder
		Parameters:
			- name: name of the object (required - UNIQUE name of the object in the scene, cannot be empty. Add numbers to the name if necessary)
			- type: type of the object (required)
		Box parameters: 
			- width, height, depth (default: 1)
			- widthSegments, heightSegments, depthSegments (default: 1) - controls geometry detail
		Sphere parameters: 
			- radius (default: 0.5)
			- widthSegments (default: 32) - horizontal detail
			- heightSegments (default: 16) - vertical detail
		Cylinder parameters:
			- radiusTop (default: 0.5)
			- radiusBottom (default: 0.5)
			- height (default: 1)
			- radialSegments (default: 32) - horizontal detail
			- heightSegments (default: 1) - vertical detail
			- openEnded (default: false)
		DirectionalLight parameters:
			- color (default: white)
			- intensity (default: 1)
		PointLight parameters:
			- color (default: white)
			- intensity (default: 1)
			- distance (default: 0)
			- decay (default: 2)
		AmbientLight parameters:
			- color (default: white)
			- intensity (default: 1)
		Common parameters for all: 
			- color (use simple color names like "red" or hex values like "#ff0000" - do not use functions or dynamic values)
			- position (e.g. {x: 0, y: 5, z: 0})
	- SetPosition: Set object position
		Parameters:
			- object: name of the object to move (optional - defaults to last modified object)
			- position: {x, y, z} (omitted coordinates keep current values)
			Example: Move right = {x: 2}, Move up = {y: 2}
	- SetMaterialColor: Change object material color
		Parameters:
			- object: name of the object (optional - defaults to last modified object)
			- color: color value (e.g. "red", "#ff0000", or "random" for a random color)
			Note: Use "random" keyword for random colors, do not use JavaScript expressions
	- SetScale: Change object size
		Parameters:
			- object: name of the object (optional - defaults to last modified object)
			- scale: {x, y, z} (values > 1 make bigger, < 1 make smaller)
			Example: Double size = {x: 2, y: 2, z: 2}
			Example: Half size = {x: 0.5, y: 0.5, z: 0.5}
	- SetMaterialValue: Set material property value
		Parameters:
			- object: name of the object (optional - defaults to last modified object)
			- property: material property to set (e.g. "metalness", "roughness", "wireframe", "transparent", "opacity")
			- value: value to set (numbers between 0-1 for metalness/roughness/opacity, true/false for wireframe/transparent)
		Example: Make metallic = { property: "metalness", value: 1.0 }
		Example: Make rough = { property: "roughness", value: 1.0 }
		Example: Make reflective = Use MultiCmds to set both metalness=1.0 and roughness=0.0
		Example: Make transparent = { property: "transparent", value: true, opacity: 0.5 }
		Note: For reflective surfaces, combine metalness=1.0 with roughness=0.0 using MultiCmds
	- SetMaterialTexture: Set material texture. This command is used to set a texture for the material of an object based on search results. Use objects with assetType "textures" or "hdris".
		Parameters:
			- object: name of the object (optional - defaults to last modified object)
			- name: name of the texture to set (required)
			- id: unique identifier of the texture to set (required - this is the id from the search results)
			- provider: provider of the texture to set (required - this is the provider from the search results)
			- downloadUrl: URL to download the texture (optional - this is the download URL from the search results, in some cases it can be empty if provider is different from "local")
			- assetType: type of the asset (required - this is the assetType from the search results, e.g. "textures" or "hdris")
			Example:
			{
				"type": "SetMaterialTexture",
				"params": {
					"object": "Sphere1",
					"name": "Wooden Texture",
					"id": "12345",
					"provider": "polyhaven",
					"downloadUrl": "",
					"assetType": "textures"
				}
			}
	- SetRotation: Set object rotation
		Parameters:
			- object: name of the object (optional - defaults to last modified object)
			- rotation: {x, y, z} in radians 
	- SetGeometry: Modify object geometry detail
		Parameters:
			- object: name of the object to modify (optional - defaults to last modified object)
			- widthSegments: number of segments along width (for box/sphere)
			- heightSegments: number of segments along height (for box/sphere)
			- depthSegments: number of segments along depth (for box only)
		Example: High detail sphere = { widthSegments: 64, heightSegments: 32 }
		Example: High detail box = { widthSegments: 4, heightSegments: 4, depthSegments: 4 }
	- RemoveObject: Remove an object from the scene
		Parameters:
			- object: name of the object to remove
	- Add3dObject: Add a 3D object to the scene based on search results. Use objects with assetType "models".
		Parameters:
			- name: name of the object to add (required)
			- position: where to place the object when added {x, y, z}. (required)
			- id: unique identifier of the object to add (required - this is the id from the search results)
			- provider: provider of the object to add (required - this is the provider from the search results. IMPORTANT: id of the object has to be the same as the id f choosen object in search results)
			- downloadUrl: URL to download the object (required - this is the download URL from the search results, in some cases it can be empty if provider is different from "local")
			- width: width of the object should be estimated based on the player model width (required)
			- height: height of the object should be estimated based on the player model height (required)
			Example:
			{
				"type": "Add3dObject",
				"params": {
					"name": "Veylthar, the Tree of Echoes",
					"position": {"x": 0, "y": 0, "z": 0},
					"id": "12345",
					"provider": "local",
					"downloadUrl": "/Upload/Model/20250327131340/veylar_tree.glb",
					"assetType": "models",
					"width": 5,
					"height": 10,
				}
			}
	- Generate3dObject: Generate a 3D model using AI. IMPORTANT: This command should be used only if none of the search results match the user's request.
		Parameters:
			- prompt: text description of the object to generate (required)
			- negative_prompt: what to avoid in the generation (optional)
			- position: where to place the object when generated {x, y, z}. (required)
		Example:
			{
				"type": "Generate3dObject",
				"params": {
					"prompt": "A detailed red apple",
					"negative_prompt": "low quality, blurry",
					"position": {"x": 0, "y": 1, "z": 0}
				}
			}
	- AttachBehavior: Attach a behavior to an object based on behavior documentation
		Parameters:
			- object: name of the object (optional - defaults to last modified object)
			- name: name of the behavior to attach (e.g. "character", "enemy", "jumppad")
			- data: additional behavior parameters (optional)
		Example:
			{
				"type": "AttachBehavior",
				"params": {
					"object": "Sphere1",
					"name": "jumppad"
					"data": {
						"strength": 10,
						"angle": 0,
					}
				}
			}
	- DetachBehavior: Remove a behavior from an object
		Parameters:
			- object: name of the object (optional - defaults to last modified object)
			- id: unique identifier of the behavior to remove
		Example:
			{
				"type": "DetachBehavior",
				"params": {
					"object": "Sphere1",
					"id": "behavior-uuid"
				}
			}
	- UpdateBehavior: Update behavior properties
		Parameters:
			- object: name of the object (optional - defaults to last modified object)
			- id: unique identifier of the behavior to update
			- data: object containing the properties to update
		Example:
			{
				"type": "UpdateBehavior",
				"params": {
					"object": "Sphere1",
					"id": "behavior-uuid",
					"data": {
						"strength": 10,
						"angle": 45,
					}
				}
			}
	- GetSceneData: Get current scene data
		Parameters: None
		Example:
			{
				"type": "GetSceneData",
				"params": {}
			}
	- GetSelectedObjectData: Get data about the currently selected object
		Parameters: None
		Example:
			{
				"type": "GetSelectedObjectData",
				"params": {}
			}
	- GetObjectData: Get data about a specific object
		Parameters:
			- object: name of the object to get data for (optional - defaults to last modified object)
		Example:
			{
				"type": "GetObjectData",
				"params": {
					"object": "Sphere1"
				}
			}
	- GetPlayerData: Get data about the player object
		Parameters: None
		Example:
			{
				"type": "GetPlayerData",
				"params": {}
			}
	- GetLookAtPoint: Get the point the player is looking at
		Parameters: None
		Example:
			{
				"type": "GetLookAtPoint",
				"params": {}
			}
	- GetSearchResults: Get search results based on a query
		Parameters:
			- query: search query to find objects (required)
		Example:
			{
				"type": "GetSearchResults",
				"params": {
					"query": "tree"
				}
			}
	- GetBehaviorsConfig: Get the behaviors configuration - this command returns the list of available behaviors and their parameters
		Parameters: None
		Example:
			{
				"type": "GetBehaviorsConfig",
				"params": {}
			}
			
	- MultiCmds: Execute multiple commands in sequence
		Parameters:
			- commands: array of command objects
		Example - Create multiple objects:
			{
				"type": "MultiCmds",
				"params": {
					"commands": [
						{
							"type": "AddObject",
							"params": {
								"type": "cube",
								"name": "Cube1",
								"position": {"x": -1.5}
							}
						},
						{
							"type": "AddObject",
							"params": {
								"type": "cube",
								"name": "Cube2",
								"position": {"x": -0.5}
							}
						},
						{
							"type": "AddObject",
							"params": {
								"type": "cube",
								"name": "Cube3",
								"position": {"x": 0.5}
							}
						},
						{
							"type": "AddObject",
							"params": {
								"type": "cube",
								"name": "Cube4",
								"position": {"x": 1.5}
							}
						}
					]
				}
			}
		Example - Create and modify an object:
			{
				"type": "MultiCmds",
				"params": {
					"commands": [
						{
							"type": "AddObject",
							"params": { "type": "cube", "name": "MyCube" }
						},
						{
							"type": "SetMaterialColor",
							"params": { "object": "MyCube", "color": "red" }
						},
						{
							"type": "SetScale",
							"params": { "object": "MyCube", "scale": {"x": 2, "y": 2, "z": 2} }
						}
					]
				}
			}
		Example - Create an object with behaviors:
			{
				"type": "MultiCmds",
				"params": {
					"commands": [
						{
							"type": "AddObject",
							"params": { "type": "sphere", "name": "BouncingSphere" }
						},
						{
							"type": "AttachBehavior",
							"params": { "object": "BouncingSphere", "name": "jumppad", "data": { "strength": 10, "angle": 45 } }
						},
						{
							"type": "AttachBehavior",
							"params": { "object": "BouncingSphere", "name": "animation", "data": { "loopMode": "Loop", "speed": "5", "move": {"x": 1, "y": 1, "z": 0}} }
						}
					]
				}
			}
		Example - Generate AI object and attach behaviors:
			{
				"type": "MultiCmds",
				"params": {
					"commands": [
						{
							"type": "Generate3dObject",
							"params": {
								"prompt": "A fluffy white cat",
								"position": {"x": 0, "y": 0, "z": 0}
							}
						},
						{
							"type": "AttachBehavior",
							"params": { "name": "npc" }
						}
					]
				}
			}
		Example - Modify all objects in the scene:
			{
				"type": "MultiCmds",
				"params": {
					"commands": [
						{
							"type": "SetMaterialColor",
							"params": { "object": "Box1", "color": "red" }
						},
						{
							"type": "SetMaterialColor",
							"params": { "object": "Box2", "color": "blue" }
						}
					]
				}
			}
		Note: Use MultiCmds when you need to:
			1. Create multiple objects at once
			2. Apply multiple modifications to a single object
			3. Apply modifications to multiple objects
			4. Any combination of the above

		Important: When working with multiple similar objects (e.g. multiple spheres):
			- Objects are automatically numbered (e.g. "Sphere1", "Sphere2", etc.)
			- Use the exact object name including the number when targeting specific objects
			- To modify all objects of a type, create a MultiCmds command with one command per object
			- The scene info includes:
				- objectCounts: how many of each type exist
				- objectsByType: groups of objects by their base name
				- spheres: list of all sphere names
				- boxes: list of all box names
				- cylinders: list of all cylinder names
				- directionalLights: list of all directional light names
				- pointLights: list of all point light names
				- ambientLights: list of all ambient light names

		Example - Set random colors for all spheres:
			{
				"type": "MultiCmds",
				"params": {
					"commands": [
						{
							"type": "SetMaterialColor",
							"params": { "object": "Sphere1", "color": "random" }
						},
						{
							"type": "SetMaterialColor",
							"params": { "object": "Sphere2", "color": "random" }
						}
					]
				}
			}

	Respond ONLY with a JSON object in this format:
	{
		"response": "Your text response to the user explaining what you're doing",
		"commands": {
				"type": "command_type",
				"params": {
					// command specific parameters
				}
			}
	}

	Important:
	1. If no commands are needed, set "commands" to an empty array
	2. Do not include any JavaScript expressions or functions in the JSON
	3. For random colors, use the "random" keyword instead of Math.random()
	4. Do not include any other text outside the JSON
	5. Numeric values should be integers, can't contain math expressions like "2 + 2"
	6. If object position is not specified in prompt, position should be determined based on the point he is looking at

	Do not include any other text outside the JSON.`, sceneData, selectedObjectData, playerObjectData, lookAtPointData, behaviorConfig, searchResultsData)
}
