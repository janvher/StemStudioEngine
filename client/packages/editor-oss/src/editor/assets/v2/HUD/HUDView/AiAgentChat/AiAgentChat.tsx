import {marked} from "marked";
import {useEffect, useRef, useState} from "react";

import {ChatContainer, ChatInput, InputContainer, Messages, NoMessages} from "./AiAgentChat.style";
import {getNPCResponse} from "@stem/network/api/npc";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import AiAgent from "../../../../../../behaviors/packs/aiNpc/AiAgent";
import global from "@stem/editor-oss/global";

interface IMessage {
    author: string;
    text: string;
}

export const AiAgentChat = () => {
    const [stoppedAiAgentIds, setStoppedAiAgentIds] = useState<Set<string>>(new Set());
    const [messages, setMessages] = useState<IMessage[]>([]);
    const [yourMessage, setYourMessage] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesWrapperRef = useRef<HTMLDivElement>(null);
    const app = global.app as EngineRuntime;
    const agents = app?.game?.aiConversationManager?.aiAgents;
    const noChat = !agents || agents.length === 0 || !agents.find(el => el.behavior.attributes.show_text_chat === true);

    const processResponse = async (response: string) => {
        let text = response.replace(/\[.*?\]/g, "").trim(); // to remove [ AI Name ] from response
        text = text.replace(/\s+([.,!?;:'”’"])|(\s+['’](?=\w))/g, "$1$2"); // to remove spaces before punctation
        text = text.replace(/\s*\*\*\s*/g, "**").replace(/\s*\*\s*/g, "*"); // remove all spaces after * to ensure correct formatting of bold and italic
        text = text.replace(/\r\n/g, "\n").replace(/\\n/g, "\n");

        text = await marked.parse(text, { gfm: true, breaks: true });
        return text;
    };

    const scrollToBottom = () => {
        messagesWrapperRef?.current?.scrollTo({
            top: messagesWrapperRef.current.scrollHeight,
        });
    };

    const simulateTyping = (agent: AiAgent, onMessageText: string, prevMessages: IMessage[]) => {
        const chars = onMessageText.split("");
        let currentIndex = 0;

        const typeNextChar = () => {
            setMessages(() => {
                const updatedMessages = [...prevMessages];
                updatedMessages.push({
                    author: agent.behavior.npcProfileData?.Name || "AI Agent",
                    text: chars.slice(0, currentIndex).join(""),
                });
                return updatedMessages;
            });

            currentIndex++;

            if (currentIndex < chars.length) {
                setTimeout(typeNextChar, 20);
            } else {
                agent.stopSpeechAnimation();
            }
        };

        typeNextChar();
    };

    const handleSendTextToAI = async (message: string, currentMessages: IMessage[], aiAgent: AiAgent) => {
        const behavior = aiAgent ? app.game?.aiConversationManager?.getAiAgentBehavior(aiAgent) : null;
        try {
            if (behavior && behavior.npcProfileData?.ID) {
                // Stop NPC wandering during text chat
                behavior.stopNpc();

                const response = await getNPCResponse({
                    npcID: behavior.npcProfileData.ID,
                    text: message,
                    sceneID: (aiAgent?.sceneId || app.editor?.sceneID) ?? "",
                    userName: aiAgent?.userName || "guest",
                    gameContext: behavior.gameContext,
                });

                if (response && aiAgent) {
                    behavior.onActionsReceived(response.actions);
                    simulateTyping(aiAgent, await processResponse(response.text), currentMessages);
                    // Release NPC after response
                    setTimeout(() => {
                        behavior.releaseNpc();
                    }, 1000);
                } else {
                    throw Error("No response from AI.");
                }
            } else {
                throw Error("No AI NPC Behavior or NPC Profile Data on the scene.");
            }
        } catch (error) {
            console.error("Error: ", error);
            // Release NPC on error
            if (behavior) {
                behavior.releaseNpc();
            }
        }
    };

    const handleSendMessage = () => {
        const trimmedMessage = yourMessage.trim();
        let currentMessages = [...messages];
        if (trimmedMessage) {
            currentMessages = [...messages, {author: "You", text: trimmedMessage}];
            setMessages(currentMessages);
            setYourMessage("");
        }
        setIsFocused(false);
        app?.call("chatDeactivated");
        inputRef.current?.blur();

        const aiAgent = app.game?.aiConversationManager?.getClosestAiAgent();

        void aiAgent?.handleAiAgentRequest(
            yourMessage,
            async (message: string) => {
                simulateTyping(aiAgent, await processResponse(message), currentMessages);
            },
            (message: string) => {
                void handleSendTextToAI(message, currentMessages, aiAgent);
            },
        );
    };

    const stopClosestAiAgent = () => {
        const aiAgent = app.game?.aiConversationManager?.getClosestAiAgent();
        if (aiAgent) {
            aiAgent.behavior.stopNpc();
            setStoppedAiAgentIds(prev => new Set(prev).add(aiAgent.id));
        }
    };

    const releaseStoppedAiAgents = () => {
        const aiConversationManager = app.game?.aiConversationManager;
        if (!aiConversationManager) return;

        stoppedAiAgentIds.forEach(agentId => {
            const aiAgent = aiConversationManager.aiAgents.find(agent => agent.id === agentId);
            if (aiAgent) {
                aiAgent.behavior.releaseNpc();
            }
        });

        setStoppedAiAgentIds(new Set());
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            if (isFocused) {
                if (yourMessage.trim() === "") {
                    setIsFocused(false);
                    app?.call("chatDeactivated");
                    inputRef.current?.blur();
                } else {
                    handleSendMessage();
                }
            } else {
                setIsFocused(true);
                app?.call("chatActivated");
                inputRef.current?.focus();
            }
        }
    };

    useEffect(() => {
        if (noChat) {
            return;
        }
        const listener = (e: KeyboardEvent) => handleKeyDown(e);
        window.addEventListener("keydown", listener);

        return () => {
            window.removeEventListener("keydown", listener);
        };
    }, [yourMessage, isFocused]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    if (noChat) {
        return null;
    }

    return (
        <ChatContainer>
            <Messages className="hidden-scroll"
                ref={messagesWrapperRef}
            >
                <div className="messagesWrapper">
                    {messages.map(({author, text}, index) => 
                        <div key={index}
                            className="message"
                        >
                            <span className="author">{author}: </span>
                            <div className="text"
                                dangerouslySetInnerHTML={{__html: text}}
                            />
                        </div>,
                    )}
                    {messages.length === 0 && 
                        <NoMessages>
                            It’s quiet here... <br /> Let&apos;s start chatting!
                        </NoMessages>
                    }
                </div>
            </Messages>
            <InputContainer>
                <ChatInput
                    ref={inputRef}
                    placeholder="Press ENTER to type a message"
                    onFocus={stopClosestAiAgent}
                    onBlur={releaseStoppedAiAgents}
                    value={yourMessage}
                    onChange={e => setYourMessage(e.target.value)}
                    readOnly={!isFocused}
                />
            </InputContainer>
        </ChatContainer>
    );
};
