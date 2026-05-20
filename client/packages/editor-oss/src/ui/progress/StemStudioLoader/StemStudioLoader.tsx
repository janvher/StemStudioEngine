import classNames from "classnames";
import React, {useEffect, useMemo, useRef, useState} from "react";

import {
    Background,
    ContentWrapper,
    LoadMaskWrapper,
    LogoImage,
    ProgressText,
    StatusMessage,
} from "./StemStudioLoader.style";
import type EngineRuntime from "../../../EngineRuntime";
import stemStudioLogo from "../../../editor/assets/v2/HUD/HUDView/FloatingNav/AppVersion/stem-studio-alpha.png";
import global from "../../../global";

type Props = {
    style?: React.CSSProperties;
    show: boolean;
    className?: string;
    isAutoLoading?: boolean;
    message?: string;
    hideProgress?: boolean;
};

const palettes = [
    [
        ["rgba(255, 77, 109, 0.92)", "rgba(255, 183, 3, 0.42)"],
        ["rgba(76, 201, 240, 0.92)", "rgba(199, 125, 255, 0.38)"],
        ["rgba(6, 214, 160, 0.9)", "rgba(76, 201, 240, 0.34)"],
        ["rgba(255, 255, 255, 0.84)", "rgba(148, 163, 184, 0.16)"],
    ],
    [
        ["rgba(125, 211, 252, 0.9)", "rgba(59, 130, 246, 0.4)"],
        ["rgba(244, 114, 182, 0.84)", "rgba(168, 85, 247, 0.34)"],
        ["rgba(45, 212, 191, 0.88)", "rgba(14, 165, 233, 0.34)"],
        ["rgba(255, 255, 255, 0.78)", "rgba(148, 163, 184, 0.14)"],
    ],
];

const makeRadius = () => {
    const a = 34 + Math.floor(Math.random() * 32);
    const b = 100 - a;
    const c = 34 + Math.floor(Math.random() * 32);
    const d = 100 - c;
    const e = 36 + Math.floor(Math.random() * 28);
    const f = 100 - e;
    const g = 36 + Math.floor(Math.random() * 28);
    const h = 100 - g;
    return `${a}% ${b}% ${c}% ${d}% / ${e}% ${f}% ${g}% ${h}%`;
};

export const StemStudioLoader = ({style, show, className, isAutoLoading = true, message, hideProgress}: Props) => {
    const app = global.app;
    const [showMask, setShowMask] = useState(show);
    const [counter, setCounter] = useState(0);
    const [statusMessage, setStatusMessage] = useState("");
    const ref = useRef(0);
    const progressTimeoutRef = useRef<number | null>(null);
    const hideTimeoutRef = useRef<number | null>(null);

    const pieces = useMemo(() => {
        const motionTypes = ["orbit", "orbitReverse", "drift", "pulse", "float", "spiral"];
        const chosenPalette = palettes[Math.floor(Math.random() * palettes.length)] ?? palettes[0]!;
        const count = 6 + Math.floor(Math.random() * 2);

        return Array.from({length: count}, (_, i) => {
            const colorPair = chosenPalette[i % chosenPalette.length] ?? chosenPalette[0]!;
            const size = 34 + Math.floor(Math.random() * 34);
            const x = 14 + Math.random() * 58;
            const y = 16 + Math.random() * 58;
            const ampX = 10 + Math.floor(Math.random() * 30);
            const ampY = 10 + Math.floor(Math.random() * 30);
            const scaleMin = (0.72 + Math.random() * 0.18).toFixed(2);
            const scaleMax = (1.02 + Math.random() * 0.22).toFixed(2);
            const duration = (3.2 + Math.random() * 2.8).toFixed(2);
            const delay = (-Math.random() * 3.2).toFixed(2);
            const blur = (10 + Math.random() * 18).toFixed(0);
            const motion = motionTypes[Math.floor(Math.random() * motionTypes.length)];

            return {
                id: `${i}-${motion}-${size}`,
                motion,
                size,
                left: `${x}%`,
                top: `${y}%`,
                duration: `${duration}s`,
                delay: `${delay}s`,
                radiusA: makeRadius(),
                radiusB: makeRadius(),
                radiusC: makeRadius(),
                gradient: `linear-gradient(135deg, ${colorPair[0] ?? ""}, ${colorPair[1] ?? ""})`,
                glow: (colorPair[0] ?? "").replace(/0\.[0-9]+\)/, "0.28)"),
                vars: {
                    "--ax": `${ampX}px`,
                    "--ay": `${ampY}px`,
                    "--ax2": `${Math.round(ampX * (Math.random() > 0.5 ? -1.3 : 1.3))}px`,
                    "--ay2": `${Math.round(ampY * (Math.random() > 0.5 ? -1.2 : 1.2))}px`,
                    "--rot": `${Math.round(Math.random() * 24 - 12)}deg`,
                    "--rot2": `${Math.round(Math.random() * 44 - 22)}deg`,
                    "--scale-min": scaleMin,
                    "--scale-max": scaleMax,
                    "--blur": `${blur}px`,
                } as React.CSSProperties,
            };
        });
    }, []);

    const clearProgressTimeout = () => {
        if (progressTimeoutRef.current !== null) {
            window.clearTimeout(progressTimeoutRef.current);
            progressTimeoutRef.current = null;
        }
    };

    const clearHideTimeout = () => {
        if (hideTimeoutRef.current !== null) {
            window.clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
    };

    const updateCounterState = () => {
        if (ref.current >= 100) {
            progressTimeoutRef.current = null;
            return;
        }

        const next = Math.min(ref.current + 1, 100);
        ref.current = next;
        setCounter(next);

        progressTimeoutRef.current = window.setTimeout(updateCounterState, 30);
    };

    useEffect(() => {
        console.debug(`[StemStudioLoader] effect: show=${show}, isAutoLoading=${isAutoLoading}`);
        clearProgressTimeout();
        clearHideTimeout();

        if (show) {
            setShowMask(true);
            ref.current = 0;
            setCounter(0);
            setStatusMessage("");
            if (isAutoLoading) {
                updateCounterState();
            }
        } else {
            hideTimeoutRef.current = window.setTimeout(() => {
                console.debug("[StemStudioLoader] hide timer elapsed — hiding loader");
                setShowMask(false);
            }, 1000);
        }

        if (!app) {
            return () => {
                clearProgressTimeout();
                clearHideTimeout();
            };
        }

        const handleMaskProgress = (state: number) => {
            if (state > 100) {
                state = 100;
            }
            ref.current = state;
            setCounter(state);
        };

        const handleLoadingStatus = (status: {progress: number; message: string; stage: string}) => {
            if (status?.message) {
                setStatusMessage(status.message);
            }
        };

        app.on("maskProgress.LoadMask", handleMaskProgress);
        app.on("loadingStatus.LoadMask", handleLoadingStatus);

        return () => {
            clearProgressTimeout();
            clearHideTimeout();
            app.on("maskProgress.LoadMask", null);
            app.on("loadingStatus.LoadMask", null);
        };
    }, [app, isAutoLoading, show]);

    if (!showMask) return null;

    return (
        <LoadMaskWrapper
            className={classNames(className, !show && "hide")}
            style={style}
            $show={show}
        >
            <Background>
                {/* Animated background */}
                <div
                    className="remix-bg"
                    style={{position: "absolute", inset: 0}}
                />
                <div
                    className="remix-vignette"
                    style={{position: "absolute", inset: 0}}
                />

                <ContentWrapper>
                    <LogoImage
                        src={stemStudioLogo}
                        alt="Stem Studio"
                        className="remix-logo"
                    />

                    {/* Animation container */}
                    <div style={{position: "relative", width: 240, height: 240}}>
                        <div
                            className="remix-ambient"
                            style={{position: "absolute", inset: 0}}
                        />

                        {/* Stage */}
                        <div
                            className="remix-stage"
                            style={{
                                position: "absolute",
                                inset: "20%",
                                borderRadius: 36,
                                overflow: "hidden",
                            }}
                        >
                            <div
                                className="remix-stage-glow"
                                style={{position: "absolute", inset: 0}}
                            />
                            <div
                                className="remix-stage-inner"
                                style={{position: "absolute", inset: 1, borderRadius: 35}}
                            />
                        </div>

                        {/* Pieces */}
                        {pieces.map((piece) => (
                            <div
                                key={piece.id}
                                className={`remix-piece remix-${piece.motion}`}
                                style={{
                                    position: "absolute",
                                    width: `${piece.size}px`,
                                    height: `${piece.size}px`,
                                    left: piece.left,
                                    top: piece.top,
                                    animationDuration: `${piece.duration}, 7.8s`,
                                    animationDelay: `${piece.delay}, ${piece.delay}`,
                                    background: piece.gradient,
                                    boxShadow: `0 0 28px ${piece.glow}`,
                                    "--radius-a": piece.radiusA,
                                    "--radius-b": piece.radiusB,
                                    "--radius-c": piece.radiusC,
                                    ...piece.vars,
                                } as React.CSSProperties}
                            >
                                <div className="remix-piece-highlight" />
                            </div>
                        ))}

                        {/* Core glow */}
                        <div
                            className="remix-core"
                            style={{
                                position: "absolute",
                                left: "50%",
                                top: "50%",
                                width: 86,
                                height: 86,
                                transform: "translate(-50%, -50%)",
                                borderRadius: "50%",
                            }}
                        />

                        {/* Ring */}
                        <div
                            className="remix-ring"
                            style={{
                                position: "absolute",
                                left: "50%",
                                top: "50%",
                                width: 140,
                                height: 140,
                                borderRadius: "50%",
                            }}
                        />

                        {/* Sparks */}
                        {[...Array(10)].map((_, i) => (
                            <div
                                key={i}
                                className="remix-spark"
                                style={{animationDelay: `${i * 0.28}s`}}
                            />
                        ))}
                    </div>

                    {/* Progress and status */}
                    {!hideProgress && <ProgressText>Loading... {!show ? 100 : counter}%</ProgressText>}
                    <StatusMessage>{message || statusMessage || "\u00A0"}</StatusMessage>
                </ContentWrapper>
            </Background>

            <style>{`
                .remix-bg {
                    background:
                        radial-gradient(circle at 22% 18%, rgba(255, 77, 109, 0.22), transparent 24%),
                        radial-gradient(circle at 78% 28%, rgba(76, 201, 240, 0.20), transparent 24%),
                        radial-gradient(circle at 52% 78%, rgba(199, 125, 255, 0.22), transparent 26%),
                        radial-gradient(circle at 34% 72%, rgba(6, 214, 160, 0.16), transparent 18%),
                        linear-gradient(180deg, #0a1020 0%, #050816 58%, #03050d 100%);
                    animation: bgParty 8s ease-in-out infinite alternate;
                    filter: saturate(132%);
                }
                .remix-vignette {
                    background: radial-gradient(circle at center, transparent 42%, rgba(0,0,0,0.22) 100%);
                }
                .remix-ambient {
                    position: absolute;
                    inset: 2%;
                    border-radius: 999px;
                    background: radial-gradient(circle, rgba(255,255,255,0.14), transparent 56%);
                    filter: blur(24px);
                    animation: ambientPulse 4.8s ease-in-out infinite;
                }
                .remix-stage-glow {
                    background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.10), transparent 58%);
                    animation: stageGlow 4.2s ease-in-out infinite;
                }
                .remix-stage-inner {
                    background:
                        radial-gradient(circle at 50% 40%, rgba(255,255,255,0.08), transparent 54%),
                        linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
                }
                .remix-piece {
                    position: absolute;
                    transform-origin: center;
                    backdrop-filter: blur(2px);
                    border: 1px solid rgba(255,255,255,0.08);
                    overflow: hidden;
                    will-change: transform, opacity, border-radius;
                    animation-timing-function: cubic-bezier(0.37, 0, 0.2, 1), ease-in-out;
                    animation-iteration-count: infinite, infinite;
                    filter: saturate(120%);
                }
                .remix-piece-highlight {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(180deg, rgba(255,255,255,0.24), transparent 48%);
                    mix-blend-mode: screen;
                }
                .remix-orbit { animation-name: orbitSoft, morphRandom; }
                .remix-orbitReverse { animation-name: orbitReverseSoft, morphRandom; }
                .remix-drift { animation-name: driftSoft, morphRandom; }
                .remix-pulse { animation-name: pulseSoft, morphRandom; }
                .remix-float { animation-name: floatSoft, morphRandom; }
                .remix-spiral { animation-name: spiralSoft, morphRandom; }
                .remix-core {
                    background: radial-gradient(circle, rgba(255,255,255,0.9), rgba(125,211,252,0.18) 38%, transparent 72%);
                    animation: coreBreathe 3.8s cubic-bezier(0.37, 0, 0.2, 1) infinite;
                }
                .remix-ring {
                    border: 1px solid rgba(125, 211, 252, 0.12);
                    box-shadow: inset 0 0 18px rgba(125, 211, 252, 0.04);
                    animation: ringRotate 10s linear infinite;
                }
                .remix-spark {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: 3px;
                    height: 3px;
                    margin-left: -1.5px;
                    margin-top: -1.5px;
                    border-radius: 999px;
                    background: rgba(255,255,255,0.9);
                    box-shadow: 0 0 12px rgba(255,255,255,0.35);
                    animation: sparkOrbit 3.8s linear infinite;
                    opacity: 0;
                }

                @keyframes bgParty {
                    0% {
                        transform: scale(1) translate3d(0, 0, 0);
                        filter: saturate(128%) hue-rotate(0deg);
                    }
                    100% {
                        transform: scale(1.05) translate3d(0, -10px, 0);
                        filter: saturate(145%) hue-rotate(18deg);
                    }
                }
                @keyframes ambientPulse {
                    0%, 100% { opacity: 0.42; transform: scale(0.96); }
                    50% { opacity: 0.78; transform: scale(1.04); }
                }
                @keyframes stageGlow {
                    0%, 100% { opacity: 0.45; transform: scale(0.98); }
                    50% { opacity: 0.82; transform: scale(1.03); }
                }
                @keyframes coreBreathe {
                    0%, 100% { transform: translate(-50%, -50%) scale(0.88); opacity: 0.48; }
                    50% { transform: translate(-50%, -50%) scale(1.12); opacity: 0.82; }
                }
                @keyframes ringRotate {
                    0% { transform: translate(-50%, -50%) rotate(0deg) scale(0.96); opacity: 0.28; }
                    50% { transform: translate(-50%, -50%) rotate(180deg) scale(1.02); opacity: 0.4; }
                    100% { transform: translate(-50%, -50%) rotate(360deg) scale(0.96); opacity: 0.28; }
                }
                @keyframes sparkOrbit {
                    0% {
                        transform: rotate(0deg) translateX(24px) scale(0.2);
                        opacity: 0;
                    }
                    18% {
                        opacity: 0.9;
                    }
                    100% {
                        transform: rotate(360deg) translateX(74px) scale(0.7);
                        opacity: 0;
                    }
                }
                @keyframes orbitSoft {
                    0%, 100% { transform: translate3d(0, 0, 0) scale(var(--scale-min)) rotate(0deg); }
                    25% { transform: translate3d(var(--ax), calc(var(--ay) * -1), 0) scale(var(--scale-max)) rotate(var(--rot)); }
                    50% { transform: translate3d(var(--ax2), 6px, 0) scale(calc(var(--scale-min) + 0.08)) rotate(var(--rot2)); }
                    75% { transform: translate3d(calc(var(--ax) * 0.4), var(--ay), 0) scale(calc(var(--scale-max) - 0.06)) rotate(calc(var(--rot) * -0.7)); }
                }
                @keyframes orbitReverseSoft {
                    0%, 100% { transform: translate3d(0, 0, 0) scale(calc(var(--scale-min) + 0.04)) rotate(0deg); }
                    25% { transform: translate3d(calc(var(--ax) * -1), var(--ay), 0) scale(var(--scale-max)) rotate(calc(var(--rot) * -1)); }
                    50% { transform: translate3d(var(--ax2), calc(var(--ay2) * -0.5), 0) scale(var(--scale-min)) rotate(var(--rot2)); }
                    75% { transform: translate3d(calc(var(--ax) * -0.35), calc(var(--ay) * -1), 0) scale(calc(var(--scale-max) - 0.04)) rotate(calc(var(--rot2) * -0.6)); }
                }
                @keyframes driftSoft {
                    0%, 100% { transform: translate3d(0, 0, 0) scale(calc(var(--scale-min) + 0.05)); }
                    33% { transform: translate3d(var(--ax), calc(var(--ay) * -0.7), 0) scale(var(--scale-max)); }
                    66% { transform: translate3d(calc(var(--ax2) * 0.8), var(--ay2), 0) scale(var(--scale-min)); }
                }
                @keyframes pulseSoft {
                    0%, 100% { transform: scale(var(--scale-min)); opacity: 0.58; }
                    50% { transform: scale(calc(var(--scale-max) + 0.1)); opacity: 0.98; }
                }
                @keyframes floatSoft {
                    0%, 100% { transform: translate3d(0, 0, 0) scale(calc(var(--scale-min) + 0.08)); }
                    50% { transform: translate3d(0, calc(var(--ay) * -1), 0) scale(var(--scale-max)); }
                }
                @keyframes spiralSoft {
                    0% { transform: translate3d(0, 0, 0) scale(var(--scale-min)) rotate(0deg); }
                    30% { transform: translate3d(var(--ax), calc(var(--ay) * -0.5), 0) scale(var(--scale-max)) rotate(var(--rot)); }
                    60% { transform: translate3d(calc(var(--ax2) * 0.8), var(--ay2), 0) scale(calc(var(--scale-min) + 0.1)) rotate(var(--rot2)); }
                    100% { transform: translate3d(0, 0, 0) scale(var(--scale-min)) rotate(360deg); }
                }
                @keyframes morphRandom {
                    0%, 100% { border-radius: var(--radius-a); }
                    33% { border-radius: var(--radius-b); }
                    66% { border-radius: var(--radius-c); }
                }
                @keyframes logoHover {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-4px); }
                }

                @media (prefers-reduced-motion: reduce) {
                    .remix-bg,
                    .remix-logo,
                    .remix-ambient,
                    .remix-stage-glow,
                    .remix-core,
                    .remix-ring,
                    .remix-piece,
                    .remix-spark {
                        animation: none !important;
                    }
                }
            `}</style>
        </LoadMaskWrapper>
    );
};
