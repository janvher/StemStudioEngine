import * as THREE from "three";

import {AISearchTagsResponse, GENERATION_STEPS_FUNCTIONS, GenerationStep} from "./AiWorldController.types";
import {DOCS} from "./docs";
import {getSceneData, getObjectData} from "./AiWorldController.utils";
import {BehaviorConfig} from "@stem/editor-oss/editor/behaviors/BehaviorConfig";
import {javaScriptStarter} from "@stem/editor-oss/editor/script/JavaScriptStarter";


// AI COPILOT
const AI_RESPONSE_EXAMPLE_1 = `[
  {
      modelUUID: "1234-5678-9101-1121",
      name: "Selected object name",
      behaviors: {
          attach: [
              {
                  name: "jumppad",
                  enabled: true,
                  attributesData: {
                      strength: 10,
                      angle: 45,
                  }
              },
          ],
          detach: ["enemy", "character"],
          update: [
              {
                  name: "Animation",
                  attributesData: {
                      move: {
                          x: 3,
                          y: 0,
                          z: 0,
                      }
                      loopMode: "Repaet",
                  }
              },
          ],
      },
  },
]`;

const AI_RESPONSE_EXAMPLE_2 = `[
  {
      modelUUID: "1234-5678-9101-1121",
      name: "Selected object name",
      transform: {
          scale: {
              x: 3,
              y: 3,
              z: 3,
          }, 
          rotation: {
              x: 90,
              y: 0,
              z: 0,
          },
          position: {
              x: 10,
              y: 20,
              z: 30,
          },
      },
  },
  {
      modelUUID: "other-model-uuid",
      name: "Box",
      behaviors: {
          detach: ["camera"],
      },
  },
]`;

const AI_RESPONSE_EXAMPLE_3 = `[
  {
      modelUUID: "Character model UUID",
      name: "Character object name",
      // in this example character control is setted to "3rd Person"
      behaviors: {
          update: [
              {
                  name: "character",
                  attributesData: {
                      walkSpeed: 20,
                      runSpeed: 30,
                      jumpAnimation: "Jumping"
                  }
              },
          ],
      },
  },
]`;

const AI_RESPONSE_EXAMPLE_4 = `[
  {
      modelUUID: "Enemy model UUID",
      name: "Enemy object name",
      behaviors: {
          update: [
              {
                  name: "enemy",
                  attributesData: {
                      enemyType: "Defensive",
                      health: 1000,
                  }
              },
          ],
      },
  },
]`;

const AI_RESPONSE_EXAMPLE_6 = `[
  {
    modelUUID: "Box model UUID",
    name: "BOX model name",
    transform: {
        scale: {
            x: 3,
            y: 3,
            z: 3,
        }, 
    },
    texture: {
      prompt: "Create image of of old castle brick wall",
      twoSided: false,
      transparent: false,
    },
  },
]`;

export const createAiCopilotPrompt = (
    scene: THREE.Scene,
    selected?: THREE.Object3D<THREE.Object3DEventMap> | THREE.Object3D<THREE.Object3DEventMap>[] | null,
    behaviorConfig?: BehaviorConfig[],
) => `
  Your task is to pass data that will be used to update models on Three.js Scene. Using the given types and interfaces, generate a response in JSON format. An example response is given below. The response should be an array of objects that will contain the uuid of the model and the operations that should be performed on it. It is important to stick to the guidelines and respond only with an array in JSON format. Use the selected object data to generate the response. It is very important to use only the names of animations available for a given model. Response can't contain any additional fields and words like "json" 

  # Instructions for data in the TRANSFORM field
  The transform field should only be passed when updating the size, rotation or position of an object. The scale, rotation and position fields can be passed but do not have to be
  
  # Instructions for data in the BEHAVIORS field
  The behavior field should only be passed when we update the behavior of a given model. The behavior field contains 3 fields that describe what operations should be performed.
  - attach: This field should contain an array of objects that describe what behaviors should be attached to the model. The object should contain the name of behavior and the behavior data. Field should be passed when we want to attach new behaviors to the model.
  - detach: This field should contain an array of strings that describe what behaviors should be detached from the model. Field should be passed when we want to detach behaviors from the model.
  - update: This field should contain an array of objects that describe what behaviors should be updated. The object should contain the name of behavior and the behavior data. Field should be passed when we want to update the existing behaviors of the model.

  # Instructions for data in the TEXTURE field

  The texture field should only be passed when we want to update the texture of the model. The texture field should contain an object with the following fields:
  - prompt: This field should contain a string that describes the image of the texture that will be generated. 
  - twoSided: This field should contain a boolean that describes if the texture is two-sided.
  - transparent: This field should contain a boolean that describes if the texture is transparent.
  
  # Behaviors documentation
  ${behaviorConfig}

  # Example Request 1
  Make this object into jump pad with 45 degrees angle jump. Remove from this object Enemy and Character behaviors. Update Animation behavior to be played in loop. And it should move horizontally 3 units.

  # Example Response 1
  ${AI_RESPONSE_EXAMPLE_1}

  # Example Request 2
  Make this object 3 times the size, and move it to position 10, 20, 30. Also, rotate it 90 degrees on the x-axis. Make sure update Box object by detaching Camera behavior.

  # Example Response 2
  ${AI_RESPONSE_EXAMPLE_2}

  # Example Request 3
  Change Character walk speed to 20, and run speed to 30. Also, change jump animation to Jumping.

  # Example Response 3
  ${AI_RESPONSE_EXAMPLE_3}

  # Example Request 4
  Change enemy attitude to Defensive and give him a lot of health points.

  # Example Response 4
  ${AI_RESPONSE_EXAMPLE_4}

  # Example Request 5
  Make this object 3 times the size. Also replace the texture with an image of an old castle brick wall.

  # Example Response 5
  ${AI_RESPONSE_EXAMPLE_6}

  # Scene Data
  ${JSON.stringify(getSceneData(scene))}

  # Selected Object Data
  ${JSON.stringify(getObjectData(selected))}
`;

// AI MODEL GENERATOR

const AI_DATA = `
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
`;

const MODEL_GENERATION_RESPONSE_1 = `
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
`;

const MODEL_GENERATION_RESPONSE_2 = `
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
`;

export const getEnhanceModelPromptSystemMessage = (playerWidth: string = "1", playerHeight: string = "2") => `
Your task is to generate data that will be used to generate 3D or 2D model.
You will be given a prompt. Your task is to determine what type of object should be created and estimate its size based on the available data.
Based on the data available to you, you need to refine given prompt. Try to provide as much detail as possible about the appearance of the object or character.  Include specifics such as clothing style, physical appearance, accessories, and visual elements that capture the object's/character's essence. If it is humanoid object make sure it asks for a t-pose
Produce an array of tags that describe object or character (e.g., fantasy, ancient, magical) try to include at least 5 tags.
Produce an array of traits that describe chracter or model personality, appearance, or abilities. Aim for at least three distinctive characteristics
List a series of animations (e.g., idle, walk, run, attack) that the character/object should have to bring character/object to life.
Additionally, create a story for this object or character. The story can refer to the appearance of the character or object. Include information to generate only one object or character on a white background so that the image is adapted to remove the background. 
Generate a prompt which when fed to an LLM can make the LLM respond to the user as a NPC. Take into account the story narrative, traits and create a folklore if needed.
Width and Height of the object should be estimated based on the player model width and height. Currently, the player model width is ${playerWidth} and height is ${playerHeight}.
It is very important that you respond in JSON format as shown in the examples. Response can't contain any additional fields and words like "json".

#DATA STRUCTURE
${AI_DATA}

#EXAMPLE REQUEST 1 (assuming that player model width is 2 and player model height is 4)
-Beautiful tree 

#EXAMPLE RESPONSE 1
${MODEL_GENERATION_RESPONSE_1}

#EXAMPLE REQUEST 2 (assuming that player model width is 2 and player model height is 4)
-Street Vendor

#EXAMPLE RESPONSE 2
${MODEL_GENERATION_RESPONSE_2}

`;

// AI IMAGE GENERATOR

const AI_IMAGE_DATA = `

  export type ImageResponse = {
    name: string; // Name of the object or scene
    width: number; // Estimated width of the object
    height: number; // Estimated height of the object
    prompt: string; // Enhanced prompt for image generation
    story: string; // Background story for the object or scene
    traits: string[]; // Descriptive traits of the object or scene
  };
`;

export const getEnhanceImagePromptSystemMessage = (playerWidth: string = "1", playerHeight: string = "2") => `
  Your task is to generate an enhanced prompt for image creation.
  You will be given a basic prompt. Your goal is to refine it, adding specific details about the object's or scene's appearance, atmosphere, and style.
  
  Consider the following aspects:
  - Describe the object's features in detail (e.g., clothing, accessories, textures, expressions, material qualities).
  - Include traits that define its personality, function, or mood.
  - Suggest suitable lighting and color schemes for better visual impact.
  - Provide composition notes to improve framing and perspective.
  - If applicable, write a short lore or background story that fits the object or environment.
  
  The object's width and height should be estimated based on the player model size.
  Currently, the player model width is ${playerWidth} and height is ${playerHeight}.
  Ensure that your response is in JSON format as shown in the examples below.
  
  #DATA STRUCTURE
  ${AI_IMAGE_DATA}
  
  #EXAMPLE REQUEST 1
  -A mystical sword
  
  #EXAMPLE RESPONSE 1
  {
    "name": "Blade of Eternity",
    "width": 1.5,
    "height": 4,
    "prompt": "An ancient, ornate longsword with glowing runes etched into its silver blade. The hilt is wrapped in dark leather, and the crossguard is shaped like wings of an ethereal being. A subtle aura of blue light emanates from the blade, hinting at its enchanted nature. The weapon rests on a stone pedestal, surrounded by mist. High-quality, full render, fantasy style, dramatic lighting, white background.",
    "story": "Forged by celestial beings, the Blade of Eternity is said to cut through both reality and illusion. It was lost in time, hidden within the ruins of a forgotten kingdom, waiting for the chosen warrior to reclaim its power.",
    "type": "Game Prop",
    "traits": ["Enchanted", "Ancient", "Legendary"],
    "composition_notes": "Sword should be centered, slight tilt for dramatic effect, mist for atmosphere."
  }
  
  #EXAMPLE REQUEST 2
  -A cyberpunk cityscape
  
  #EXAMPLE RESPONSE 2
  {
    "name": "Neon Dystopia",
    "width": 20,
    "height": 10,
    "prompt": "A sprawling cyberpunk metropolis at night, filled with towering skyscrapers covered in holographic advertisements. Neon lights in shades of blue, pink, and purple illuminate the streets, which are wet from recent rain. Crowds of people, dressed in futuristic attire, move along the sidewalks. In the background, flying cars zip through the sky between towering megastructures. Cinematic shot, high detail, cyberpunk style, atmospheric lighting, ultra-realistic, white background.",
    "story": "In the year 2147, the city of Neo-Tokyo is a hub of advanced technology and crime. Corporate overlords control the streets while underground hackers fight for freedom in a neon-lit world of deception and danger.",
    "type": "Game Prop",
    "traits": ["Futuristic", "Gritty", "Vibrant"],
    "composition_notes": "Wide-angle shot, high perspective, sense of depth with skyscrapers fading into the fog."
  }
`;

// AI STEPS GENERATOR
const RESPONSE_EXAMPLE_1: GenerationStep[] = [
    {
        step: "Enhance Prompt",
        function: GENERATION_STEPS_FUNCTIONS.ENCHANCE_PROMPT,
        description: "AI is enhancing the prompt",
        parameters: {
            prompt: "Big tree",
            adjectives: "majestic, leafy, big, old",
        },
    },
    {
        step: "Generate 3D Model",
        function: GENERATION_STEPS_FUNCTIONS.GENERATE_MODEL,
        parameters: {},
        description: "AI is generating your new 3D model",
    },
    {
        step: "Attach Behaviors",
        function: GENERATION_STEPS_FUNCTIONS.ATTACH_BEHAVIORS,
        description: "AI is attaching behaviors to the model",
        parameters: {
            names: [],
        },
    },
];

const RESPONSE_EXAMPLE_2: GenerationStep[] = [
    {
        step: "Enhance Prompt",
        function: GENERATION_STEPS_FUNCTIONS.ENCHANCE_PROMPT,
        description: "AI is enhancing the prompt",
        parameters: {
            prompt: "Thief",
            adjectives: "scary, tall, hooded",
        },
    },
    {
        step: "Generate 3D Model",
        function: GENERATION_STEPS_FUNCTIONS.GENERATE_MODEL,
        description: "AI is generating your new 3D model",
        parameters: {},
    },
    {
        step: "Attach Behaviors",
        function: GENERATION_STEPS_FUNCTIONS.ATTACH_BEHAVIORS,
        description: "AI is attaching behaviors to the model",
        parameters: {
            names: ["enemy"],
        },
    },
];

export const createGenerateStepsPrompt = (behaviorConfig: BehaviorConfig[]) => `
Prompt will be provided by user. Based on the prompt, AI will generate 3D object.
Based on gived documentation generate object that will contain requried steps and methods to generate 3D object from text.
Pass required parameters to each method. 
Attach description to each step. Desciption should describe what AI is doing in each step.
It is very important that you respond in JSON format as shown in the examples. Response can't contain any additional fields and words like "json".
### Documentation
${DOCS}

### Behaviors documentation
${behaviorConfig}

### REQUEST EXAMPLE 1 
- Big tree

### RESPONSE EXAMPLE 1
${JSON.stringify(RESPONSE_EXAMPLE_1, null, 2)}

### REQUEST EXAMPLE 2
- Thief

### RESPONSE EXAMPLE 2
${JSON.stringify(RESPONSE_EXAMPLE_2, null, 2)}

`;

// Search Tags
const SEARCH_TAGS_RESPONSE: AISearchTagsResponse = {
    tags: ["tree", "forest", "nature", "majestic", "old", "big", "leafy"],
    width: 5,
    height: 10,
    followUpMessage:
        "Great job! This tree looks like it will be a majestic addition to the scene. Do you want to generate more models? For example, you could create a character to interact with the tree.",
};

export const searchTagsPrompt = (playerWidth: string = "1", playerHeight: string = "2") => `
Your task is to generate search tags based on the given prompt.
You will be provided with a prompt. Your goal is to generate a list of tags that describe the object or scene in the prompt.
Consider the following aspects:
- Include general terms that describe the object's category or type.
- Add specific adjectives that highlight the object's appearance, mood, or style.
- Include related terms that evoke the object's context, setting, or theme.
- Aim for at least 5 relevant tags that capture the essence of the prompt.
- Tags should be always lowercase.

Additinally, determinne size of the object based on the player model size. Currently, the player model width is ${playerWidth} and height is ${playerHeight}.
Add a follow-up message to encourage further creativity or exploration. Follow-up message should suggest creating another model, related to the model generated based on the tags.

Ensure that your response is in JSON format as shown in the example below.
### Example Request
- Big tree
### Example Response
${JSON.stringify(SEARCH_TAGS_RESPONSE, null, 2)}
`;

export const editCodePrompt = (behaviorConfig: BehaviorConfig[]) => `
Your task is to edit the given code snippet that will be used in game based on THREE.js.
Behaviors are used to create interactive objects in the game. 
Compare actual code with starter code.

- You will be given a code snippet.
- Your goal is to edit the code snippet based on the given instructions.
- Make sure to follow the guidelines and respond only in JSON format.
- Your response should contain the edited code snippet.
- It is very important that you respond with the entire code.
- Do not remove default functions or comments that are included in javascript starter code.

### Starter Code
${javaScriptStarter("object.uuid")}

### Behaviors documentation
${behaviorConfig}

### Example Request
Animate target object to move 3 units horizontally
code: "object.position.x += 5;"

### Example Response
{
  "code": "object.position.x += 3;",
}
`;
