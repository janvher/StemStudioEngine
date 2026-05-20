import React, {useCallback, useEffect, useRef} from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";

import x from "../AssetsLibrary/images/x.svg";

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    z-index: 10000;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.5);
`;

const Container = styled.div<{$isVideo: boolean}>`
    width: ${({$isVideo}) => ($isVideo ? "600px" : "450px")};
    max-height: 80vh;
    background: var(--theme-dialog-bg);
    border: none;
    border-radius: var(--theme-dialog-border-radius);
    box-shadow: var(--theme-dialog-shadow);
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const Nav = styled.div`
    color: white;
    width: 100%;
    height: 56px;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--theme-container-divider);
    font-size: 14px;
    font-weight: 500;
`;

const NavTitle = styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-right: 12px;
`;

const CloseButton = styled.button`
    cursor: pointer;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    img {
        width: 13px;
        height: auto;
    }
`;

const Content = styled.div`
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    video,
    audio {
        width: 100%;
        outline: none;
        border-radius: 8px;
    }

    video {
        max-height: 340px;
        background: black;
    }
`;

const VisualizerCanvas = styled.canvas`
    width: 100%;
    height: 80px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.3);
`;

interface Props {
    isOpen: boolean;
    onClose: () => void;
    url: string;
    name: string;
    type: "audio" | "video";
}

export const MediaPlayerDialog: React.FC<Props> = ({isOpen, onClose, url, name, type}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number>(0);
    const audioCtxRef = useRef<AudioContext | null>(null);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        },
        [onClose],
    );

    useEffect(() => {
        if (!isOpen) return;
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, handleKeyDown]);

    // Audio visualization
    useEffect(() => {
        if (!isOpen || type !== "audio") return;

        const audio = audioRef.current;
        const canvas = canvasRef.current;
        if (!audio || !canvas) return;

        let ctx: AudioContext;
        let analyser: AnalyserNode;
        let source: MediaElementAudioSourceNode;

        const setup = () => {
            try {
                ctx = new AudioContext();
                audioCtxRef.current = ctx;
                analyser = ctx.createAnalyser();
                analyser.fftSize = 128;
                source = ctx.createMediaElementSource(audio);
                source.connect(analyser);
                analyser.connect(ctx.destination);

                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                const canvasCtx = canvas.getContext("2d");
                if (!canvasCtx) return;

                const draw = () => {
                    animFrameRef.current = requestAnimationFrame(draw);
                    analyser.getByteFrequencyData(dataArray);

                    const w = canvas.width;
                    const h = canvas.height;
                    canvasCtx.clearRect(0, 0, w, h);

                    const barWidth = (w / bufferLength) * 0.8;
                    const gap = (w / bufferLength) * 0.2;
                    let posX = 0;

                    for (let i = 0; i < bufferLength; i++) {
                        const barHeight = ((dataArray[i] ?? 0) / 255) * h;
                        const hue = (i / bufferLength) * 260 + 180;
                        canvasCtx.fillStyle = `hsl(${hue}, 80%, 60%)`;
                        canvasCtx.fillRect(posX, h - barHeight, barWidth, barHeight);
                        posX += barWidth + gap;
                    }
                };

                draw();
            } catch {
                // Web Audio API not supported or already connected
            }
        };

        // Wait for user interaction (play) before connecting AudioContext
        const onPlay = () => setup();
        audio.addEventListener("play", onPlay, {once: true});

        return () => {
            audio.removeEventListener("play", onPlay);
            cancelAnimationFrame(animFrameRef.current);
            if (audioCtxRef.current) {
                audioCtxRef.current.close().catch(() => {});
                audioCtxRef.current = null;
            }
        };
    }, [isOpen, type]);

    // Set canvas resolution to match display size
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
    }, [isOpen]);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <Overlay onClick={handleOverlayClick}>
            <Container ref={containerRef}
                $isVideo={type === "video"}
            >
                <Nav>
                    <NavTitle>{name}</NavTitle>
                    <CloseButton className="reset-css"
                        onClick={onClose}
                    >
                        <img src={x}
                            alt="close"
                        />
                    </CloseButton>
                </Nav>
                <Content>
                    {type === "video" ? (
                        <video controls
                            autoPlay
                            src={url}
                        />
                    ) : (
                        <>
                            <VisualizerCanvas ref={canvasRef} />
                            <audio ref={audioRef}
                                controls
                                controlsList="nodownload"
                                autoPlay
                                crossOrigin="anonymous"
                                src={url}
                            />
                        </>
                    )}
                </Content>
            </Container>
        </Overlay>,
        document.body,
    );
};
