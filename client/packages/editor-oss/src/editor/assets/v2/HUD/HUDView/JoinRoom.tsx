import {Track} from "livekit-client";
import {useEffect, useRef, useState} from "react";
import "@livekit/components-styles";
import styled from "styled-components";
import {LiveKitRoom, RoomAudioRenderer, TrackToggle, useParticipants} from "@livekit/components-react";

import {generateLiveKitToken} from "@stem/network/api/livekit";
import global from "@stem/editor-oss/global";

interface Props {
    roomId: string;
}

const JoinRoom = ({roomId}: Props) => {
    const microphoneRef = useRef<HTMLButtonElement>(null);
    const editor = (global as any).app.editor;
    const [joinToken, setJoinToken] = useState<string>();
    const [roomConected, setRoomConected] = useState(false);

    useEffect(() => {
        const handleKeydown = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === "m") {
                if (microphoneRef?.current) {
                    microphoneRef.current.click();
                }
            }
        };
        window.addEventListener("keydown", handleKeydown);
        return () => {
            window.removeEventListener("keydown", handleKeydown);
        };
    }, []);

    useEffect(() => {
        if (!editor) return;
        const handleJoinToken = async () => {
            const token = await generateLiveKitToken(roomId, editor.username);
            if (token) {
                setJoinToken(token);
            }
        };

        const requestPermissions = async () => {
            try {
                await navigator.mediaDevices.getUserMedia({audio: true});
                handleJoinToken();
            } catch (error) {
                console.error("Permission denied for audio:", error);
            }
        };

        requestPermissions();
    }, []);

    return (
        <StyledLiveKitRoom
            onConnected={() => {
                setRoomConected(true);
                console.log("Connected to the room");
            }}
            onDisconnected={() => {
                setRoomConected(false);
                console.log("Disconnected from the room");
            }}
            onError={() => console.log("Error LIVEKIT")}
            token={joinToken}
            serverUrl={process.env.REACT_APP_LIVEKIT_WS}
            data-lk-theme="default"
        >
            {/* The RoomAudioRenderer takes care of room-wide audio for you. */}
            <RoomAudioRenderer />
            <TrackToggle source={Track.Source.Microphone}
                ref={microphoneRef}
            />
            {roomConected && <ParticipantsList />}
        </StyledLiveKitRoom>
    );
};

export default JoinRoom;

const StyledLiveKitRoom = styled(LiveKitRoom)`
    width: max-content;
    height: 37px;
    background-color: transparent;
    position: absolute;
    top: 32px;
    left: 50%;
    transform: translateX(-50%);
`;

export const ParticipantsList = () => {
    const participants = useParticipants();
    useEffect(() => {
        if (participants?.length > 0) {
            participants.forEach(el => console.log("User in the room:", el.identity));
        }
    }, [participants]);
    return null;
};
