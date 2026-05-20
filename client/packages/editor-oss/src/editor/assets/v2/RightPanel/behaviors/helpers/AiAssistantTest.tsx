import {useState} from "react";

import global from "@stem/editor-oss/global";
import {DefaultWrapper} from "../../styles/Behaviors.style";

interface Props {
    autoDetectAnimations: () => void;
}

export const AiAssistantTest = ({autoDetectAnimations}: Props) => {
    const app = (global as any).app;
    const editor = app.editor;
    const model = editor.selected;
    const camera = editor.camera;

    // OpenAI question and answer states
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [loading, setLoading] = useState(false);

    const handleAskQuestion = async () => {
        if (!question) return;
        setLoading(true);
        await askQuestion(question);
    };
    //TODO this is being tested for AI response to suggest animations
    //it is not finished but trains the Chatgpt to suggest animations to use for the character
    const _AiSuggestAnimoitions = async (weaponType: string) => {
        setLoading(true);

        const characterOptions = camera.userData.cameraData.characterOptions;
        const animationProperties: string[] = [];
        Object.keys(characterOptions).forEach(key => {
            if (key.includes("Animation")) {
                animationProperties.push(key);
            }
        });

        const animationList = animationProperties.join(", ");

        const availableAnimations = model._obj.animations.map((anim: any) => anim.name).join(", ");
        console.log("Available Animations for ChatGPT:", availableAnimations);

        const question = `What are the best animations for this character's existing animation clips if it was holding 
        this weapon type: ${weaponType}? Here is the list of available animations from the model: ${availableAnimations}.
        Here is the list of animation properties to set from the model: ${availableAnimations}.
        Can you return the recommended animation names as a numbered list with a short sentence for each? Make sure the next clip starts on a new line with a line break like this <br>
        Send the response as HTML, and don't say "sure" or "certainly." Start the response with "Recommend animation clips to use from your model with a ${weaponType} new line in response.
        Make sure to suggest each animation name from ${availableAnimations} that has ${weaponType}.
        Sometimes the list is not returned as a numbered list with <br> after each animation name please make sure add numbered items.
        Please make sure all ${availableAnimations} are returned in the response if a weapon from this list ${weaponType} is found in the animation name
        Make sure that each one of the animation objects below have recommended values to be set from the animations list
        ${animationList} remove any syntax at start and end that is not human readable
        left, right and reverse directions animations should be the same as the walkAnimation
        response should read similar to this below
        Response template start
        
        That looks better but it not returning all of the available animation clip names on seperate lines
        Example please make each link look like this each 
       
        The returned response must be formated like this always like below example
        
        <div>1. idleAnimaton (idle): animation name: rifle_idle<br></div>
        <div>2. walkAnimaton (walk): animation name: rifle_walk<br></div>
    
        Please make human readable if none is selected do not add that to the response
        there should be separate line for each item in the ${animationList} 
        remove any syntax from start and end of response that is not readable

         `;

        await askQuestion(question);

        setLoading(false);
    };

    //TODO future AI assistant
    const askQuestion = async (question: string) => {
        const apiKey = ""; //enter the api key for Open AI sk-!@#$%@##$

        if (!question) {
            console.log("No question provided.");
            return;
        }

        const requestBody = {
            model: "gpt-3.5-turbo",
            messages: [
                {role: "system", content: "You are a helpful assistant."},
                {role: "user", content: question},
            ],
            max_tokens: 1000,
            temperature: 0.7,
        };

        try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                throw new Error("Request failed with status " + response.status);
            }

            const data = await response.json();
            const answer = data.choices[0].message.content;

            const stripHtml = (htmlString: any) => {
                return htmlString.replace(/<[^>]*>/g, "");
            };

            const strippedAnswer = stripHtml(answer);
            console.log("ChatGPT says:", strippedAnswer);

            const keywords: string[] = strippedAnswer
                .split("\n")
                .map((line: string) => line.trim())
                .filter((line: string) => line.toLowerCase().includes("animation name:"))
                .map((line: string) => {
                    const parts: string[] = line.split("animation name:");
                    return parts[1]?.trim() || "";
                })
                .filter((keyword: string) => keyword.length > 0);

            keywords.forEach((keyword: string) => {
                console.log(keyword);
                autoDetectAnimations();
            });

            setAnswer(answer);
        } catch (error) {
            console.error("Error:", error);
            setAnswer("Sorry, something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DefaultWrapper>
            <DefaultWrapper>
                <div>
                    <input
                        type="text"
                        placeholder="Ask OpenAI something..."
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                    />
                    <button onClick={handleAskQuestion}
                        disabled={loading}
                    >
                        Ask
                    </button>
                    {loading ? 
                        <p className="small-font">Loading...</p>
                     : 
                        answer && 
                            <div>
                                <p className="small-font">AI Assistant:</p>
                                <div className="small-font"
                                    dangerouslySetInnerHTML={{__html: answer}}
                                />
                            </div>
                        
                    }
                </div>
            </DefaultWrapper>
        </DefaultWrapper>
    );
};
