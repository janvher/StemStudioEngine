import React, { useState, useEffect, useRef } from "react";
import i18n from "i18next";
import styled from "styled-components";

import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import { BehaviorThrottlePriority } from "../../../../../../behaviors/performance/interfaces/IThrottleStrategy";
import global from "@stem/editor-oss/global";

const OverlayContainer = styled.div<{ $isVisible: boolean; $isCompact: boolean }>`
    position: fixed;
    top: 100px;
    right: 20px;
    width: ${props => props.$isCompact ? '200px' : '300px'};
    background: rgba(0, 0, 0, 0.9);
    border: 1px solid #444;
    border-radius: 8px;
    padding: 12px;
    color: white;
    font-family: 'Roboto', sans-serif;
    font-size: 12px;
    z-index: 15000;
    transform: ${props => props.$isVisible ? 'translateX(0)' : `translateX(${props.$isCompact ? '220px' : '320px'})`};
    transition: transform 0.3s ease-in-out;
    max-height: ${props => props.$isCompact ? '200px' : '400px'};
    overflow-y: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    pointer-events: auto;
    
    &:hover {
        border-color: #666;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
    }
    
    @media (max-width: 768px) {
        top: 70px;
        right: 10px;
        left: 10px;
        width: auto;
        max-width: calc(100vw - 20px);
    }
    
    @media (max-height: 600px) {
        top: 60px;
        max-height: calc(100vh - 80px);
    }
`;

const ToggleButton = styled.button<{ $isVisible: boolean }>`
    position: fixed;
    top: 100px;
    right: ${props => props.$isVisible ? '340px' : '20px'};
    width: 40px;
    height: 40px;
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid #444;
    border-radius: 50%;
    color: white;
    font-size: 16px;
    cursor: pointer;
    z-index: 15001;
    transition: right 0.3s ease-in-out, top 0.3s ease-in-out;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

    &:hover {
        background: rgba(0, 0, 0, 0.95);
        border-color: #666;
        transform: scale(1.05);
    }
    
    @media (max-width: 768px) {
        top: 70px;
        right: ${props => props.$isVisible ? '10px' : '10px'};
        width: 35px;
        height: 35px;
        font-size: 14px;
    }
    
    @media (max-height: 600px) {
        top: 60px;
    }
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    border-bottom: 1px solid #333;
    padding-bottom: 8px;
`;

const Title = styled.h3`
    margin: 0;
    font-size: 14px;
    color: #fff;
`;

const CloseButton = styled.button`
    background: none;
    border: none;
    color: #888;
    font-size: 16px;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;

    &:hover {
        color: #fff;
    }
`;

const MetricsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 12px;
`;

const MetricCard = styled.div<{ $color: string }>`
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid ${props => props.$color};
    border-radius: 4px;
    padding: 6px;
    text-align: center;
`;

const MetricValue = styled.div`
    font-size: 16px;
    font-weight: bold;
    color: #fff;
`;

const MetricLabel = styled.div`
    font-size: 9px;
    color: #aaa;
    margin-top: 2px;
`;

const Section = styled.div`
    margin-bottom: 12px;
`;

const SectionTitle = styled.div`
    font-size: 11px;
    color: #ccc;
    margin-bottom: 6px;
    font-weight: bold;
`;

const PriorityBar = styled.div<{ $width: number; $color: string }>`
    height: 16px;
    background: ${props => props.$color};
    width: ${props => props.$width}%;
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    color: white;
    margin: 2px 0;
    min-width: 20px;
`;

const RecommendationCard = styled.div<{ $type: 'info' | 'warning' | 'success' }>`
    background: ${props => 
        props.$type === 'warning' ? 'rgba(255, 165, 0, 0.2)' : 
        props.$type === 'success' ? 'rgba(0, 255, 0, 0.2)' : 'rgba(0, 153, 255, 0.2)'
    };
    border: 1px solid ${props => 
        props.$type === 'warning' ? '#ffa500' : 
        props.$type === 'success' ? '#00ff00' : '#0099ff'
    };
    border-radius: 4px;
    padding: 6px;
    margin: 4px 0;
    font-size: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
`;

const QuickFixButton = styled.button`
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    color: white;
    font-size: 9px;
    padding: 4px 8px;
    cursor: pointer;
    white-space: nowrap;
    font-weight: 500;
    transition: all 0.2s ease;
    min-width: 60px;
    
    &:hover {
        background: rgba(255, 255, 255, 0.25);
        border-color: rgba(255, 255, 255, 0.5);
        transform: translateY(-1px);
    }
    
    &:active {
        transform: translateY(0);
    }
`;

const CompactToggle = styled.button`
    background: none;
    border: none;
    color: #888;
    font-size: 12px;
    cursor: pointer;
    padding: 0;
    margin-left: 8px;

    &:hover {
        color: #fff;
    }
`;

const FPSCounter = styled.div`
    position: fixed;
    top: 100px;
    left: 20px;
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid #444;
    border-radius: 4px;
    padding: 8px 12px;
    color: white;
    font-family: 'Roboto', sans-serif;
    font-size: 14px;
    z-index: 14999;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    pointer-events: none;
    
    @media (max-width: 768px) {
        top: 70px;
        left: 10px;
        font-size: 12px;
        padding: 6px 10px;
    }
    
    @media (max-height: 600px) {
        top: 60px;
    }
`;

interface PerformanceData {
    totalChecks: number;
    culledCount: number;
    throttledCount: number;
    cullingEfficiency: number;
    throttlingEfficiency: number;
    runTimeMs: number;
    behaviorCounts: Record<BehaviorThrottlePriority, number>;
    frameRate: number;
    actualFPS: number;
}

const PerformanceOverlayComponent: React.FC = () => {
    const app = global.app as EngineRuntime;
    const [isVisible, setIsVisible] = useState(() => {
        // Persist overlay visibility state
        const saved = localStorage.getItem('performanceOverlayVisible');
        return saved ? JSON.parse(saved) : false;
    });
    const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
    const [showFPS, setShowFPS] = useState(() => {
        // Persist FPS counter visibility state
        const saved = localStorage.getItem('performanceFPSVisible');
        return saved ? JSON.parse(saved) : true;
    });
    const [isCompactMode, setIsCompactMode] = useState(() => {
        // Persist compact mode state
        const saved = localStorage.getItem('performanceOverlayCompact');
        return saved ? JSON.parse(saved) : false;
    });
    const [appliedActions, setAppliedActions] = useState<Set<string>>(new Set());
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const fpsRef = useRef({ 
        frameCount: 0, 
        lastTime: performance.now(), 
        currentFPS: 0,
        animationFrameId: 0,
    });

    // Persist state changes
    useEffect(() => {
        localStorage.setItem('performanceOverlayVisible', JSON.stringify(isVisible));
    }, [isVisible]);

    useEffect(() => {
        localStorage.setItem('performanceFPSVisible', JSON.stringify(showFPS));
    }, [showFPS]);

    useEffect(() => {
        localStorage.setItem('performanceOverlayCompact', JSON.stringify(isCompactMode));
    }, [isCompactMode]);

    // FPS tracking through animation frame
    const trackFPS = () => {
        const now = performance.now();
        fpsRef.current.frameCount++;
        
        if (now - fpsRef.current.lastTime >= 1000) {
            fpsRef.current.currentFPS = Math.round(fpsRef.current.frameCount * 1000 / (now - fpsRef.current.lastTime));
            fpsRef.current.frameCount = 0;
            fpsRef.current.lastTime = now;
        }
        
        fpsRef.current.animationFrameId = requestAnimationFrame(trackFPS);
    };

    const updatePerformanceData = React.useCallback(() => {
        if (!app?.game?.behaviorManager) return;

        const metrics = app.game.behaviorManager.getPerformanceMetrics();
        if (!metrics) return;

        // Count behaviors by priority from scene objects
        const behaviorCounts = {
            [BehaviorThrottlePriority.CRITICAL]: 0,
            [BehaviorThrottlePriority.HIGH]: 0,
            [BehaviorThrottlePriority.MEDIUM]: 0,
            [BehaviorThrottlePriority.LOW]: 0,
            [BehaviorThrottlePriority.MINIMAL]: 0,
        };

        if (app.editor?.scene) {
            app.editor.scene.traverse((object: any) => {
                if (object.userData?.behaviors && Array.isArray(object.userData.behaviors)) {
                    object.userData.behaviors.forEach((behaviorData: any) => {
                        const priority = behaviorData.throttlePriority || BehaviorThrottlePriority.MEDIUM;
                        if (priority in behaviorCounts) {
                            behaviorCounts[priority as BehaviorThrottlePriority]++;
                        }
                    });
                }
            });
        }

        const estimatedFrameRate = metrics.runTimeMs > 0 ? 
            Math.min(60, Math.round(metrics.totalChecks / (metrics.runTimeMs / 1000))) : 0;

        setPerformanceData({
            ...metrics,
            behaviorCounts,
            frameRate: estimatedFrameRate,
            actualFPS: fpsRef.current.currentFPS,
        });
    }, [app]);

    useEffect(() => {
        // Enable performance reporting when overlay is used
        if (app?.game?.behaviorManager) {
            app.game.behaviorManager.updateThrottlingConfig({
                enablePerformanceReporting: true,
            });
        }

        // Start FPS tracking
        fpsRef.current.animationFrameId = requestAnimationFrame(trackFPS);

        // Start monitoring
        updatePerformanceData();
        intervalRef.current = setInterval(updatePerformanceData, 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (fpsRef.current.animationFrameId) {
                cancelAnimationFrame(fpsRef.current.animationFrameId);
            }
        };
    }, [updatePerformanceData]);

    // Handle keyboard shortcut and custom events
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.shiftKey && event.key === 'P') {
                event.preventDefault();
                setIsVisible(!isVisible);
            }
            if (event.ctrlKey && event.key === 'f') {
                event.preventDefault();
                setShowFPS(!showFPS);
            }
        };

        const handleToggleEvent = (event: Event) => {
            const customEvent = event as CustomEvent;
            const newVisibility = customEvent?.detail?.visible !== undefined ? customEvent.detail.visible : !isVisible;
            setIsVisible(newVisibility);
            
            // Sync with UI checkbox by dispatching an event back
            if (customEvent?.detail?.visible === undefined) {
                const syncEvent = new CustomEvent('syncPerformanceOverlayState', { detail: { visible: newVisibility } });
                window.dispatchEvent(syncEvent);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('togglePerformanceOverlay', handleToggleEvent);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('togglePerformanceOverlay', handleToggleEvent);
        };
    }, [isVisible, showFPS]);

    const getRecommendations = (): Array<{type: 'info' | 'warning' | 'success', message: string, action?: () => void, actionLabel?: string}> => {
        if (!performanceData) return [];

        const recommendations = [];
        const totalBehaviors = Object.values(performanceData.behaviorCounts).reduce((a, b) => a + b, 0);
        const criticalPercentage = totalBehaviors > 0 ? 
            performanceData.behaviorCounts[BehaviorThrottlePriority.CRITICAL] / totalBehaviors * 100 : 0;

        if (performanceData.actualFPS < 30) {
            recommendations.push({
                type: 'warning' as const,
                message: `Low FPS (${performanceData.actualFPS}). Try performance preset.`,
                action: () => applyPerformancePreset('performanceFocused'),
                actionLabel: 'Apply High Performance',
            });
        } else if (performanceData.actualFPS > 55) {
            recommendations.push({
                type: 'success' as const,
                message: `Great FPS (${performanceData.actualFPS})! Performance optimized.`,
            });
        }

        if (criticalPercentage > 30 && !appliedActions.has('openGameSettings')) {
            recommendations.push({
                type: 'warning' as const,
                message: `${criticalPercentage.toFixed(0)}% behaviors are CRITICAL.`,
                action: () => openGameSettings(),
                actionLabel: 'Open Settings',
            });
        }

        if (performanceData.throttlingEfficiency > 40) {
            recommendations.push({
                type: 'success' as const,
                message: `Throttling working well (${performanceData.throttlingEfficiency.toFixed(0)}%).`,
            });
        }

        if (performanceData.throttlingEfficiency < 50 && totalBehaviors > 5 && !appliedActions.has('balanced')) {
            recommendations.push({
                type: 'info' as const,
                message: `Throttling efficiency could be improved (${performanceData.throttlingEfficiency.toFixed(0)}%).`,
                action: () => applyPerformancePreset('balanced'),
                actionLabel: 'Optimize',
            });
        }

        // Always show at least one actionable recommendation for demo purposes
        if (recommendations.length === 1 && recommendations[0]?.type === 'success' && !appliedActions.has('performanceFocused')) {
            recommendations.push({
                type: 'info' as const,
                message: `Want even better performance?`,
                action: () => applyPerformancePreset('performanceFocused'),
                actionLabel: 'Max Performance',
            });
        }

        return recommendations.slice(0, 2); // Limit to 2 recommendations
    };

    const applyPerformancePreset = (presetType: 'balanced' | 'performanceFocused' | 'mobileOptimized') => {
        const presets = {
            balanced: {
                farDistanceSq: 2500,
                veryFarDistanceSq: 10000,
                farThrottleFactor: 3,
                veryFarThrottleFactor: 10,
                enableFrustumCulling: true,
                enableDistanceThrottling: true,
                enablePerformanceReporting: true,
                throttlingEnabled: true,
            },
            performanceFocused: {
                farDistanceSq: 1600,
                veryFarDistanceSq: 6400,
                farThrottleFactor: 4,
                veryFarThrottleFactor: 12,
                enableFrustumCulling: true,
                enableDistanceThrottling: true,
                enablePerformanceReporting: true,
                throttlingEnabled: true,
            },
            mobileOptimized: {
                farDistanceSq: 1225,
                veryFarDistanceSq: 4900,
                farThrottleFactor: 5,
                veryFarThrottleFactor: 15,
                enableFrustumCulling: true,
                enableDistanceThrottling: true,
                enablePerformanceReporting: true,
                throttlingEnabled: true,
            },
        };

        const preset = presets[presetType];
        
        // Apply to behavior manager
        if (app?.game?.behaviorManager) {
            app.game.behaviorManager.updateThrottlingConfig?.(preset);
        }
        
        // Save to scene data
        if (app?.editor?.scene) {
            if (!app.editor.scene.userData.game) {
                app.editor.scene.userData.game = {};
            }
            app.editor.scene.userData.game.behaviorThrottling = preset;
        }
        
        // Track that this action has been applied
        setAppliedActions(prev => new Set([...prev, presetType]));
    };

    const openGameSettings = () => {
        // Dispatch event to open game settings panel
        const event = new CustomEvent('openGameSettingsPanel');
        window.dispatchEvent(event);
        // Track that this action has been used
        setAppliedActions(prev => new Set([...prev, 'openGameSettings']));
    };

    const exportPerformanceData = () => {
        if (!performanceData) return;
        
        const exportData = {
            timestamp: new Date().toISOString(),
            fps: performanceData.actualFPS,
            totalBehaviors,
            behaviorDistribution: performanceData.behaviorCounts,
            cullingEfficiency: performanceData.cullingEfficiency,
            throttlingEfficiency: performanceData.throttlingEfficiency,
            runTimeMs: performanceData.runTimeMs,
            recommendations: getRecommendations().map(r => ({ type: r.type, message: r.message })),
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-report-${new Date().toISOString().slice(0, 16)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const priorityColors = {
        [BehaviorThrottlePriority.CRITICAL]: '#ff4444',
        [BehaviorThrottlePriority.HIGH]: '#ff8800',
        [BehaviorThrottlePriority.MEDIUM]: '#ffcc00',
        [BehaviorThrottlePriority.LOW]: '#88cc00',
        [BehaviorThrottlePriority.MINIMAL]: '#44cc44',
    };

    const totalBehaviors = performanceData ? 
        Object.values(performanceData.behaviorCounts).reduce((a, b) => a + b, 0) : 0;

    return (
        <>
            {/* FPS Counter */}
            {showFPS && 
                <FPSCounter>
                    FPS: {performanceData?.actualFPS || 0}
                </FPSCounter>
            }

            {/* Toggle Button */}
            <ToggleButton 
                $isVisible={isVisible}
                onClick={() => setIsVisible(!isVisible)}
                title={i18n.t("Toggle Performance Monitor ({{shortcut}})", {
                    shortcut: /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? "⌘⇧P" : "Ctrl+Shift+P",
                })}
            >
                📊
            </ToggleButton>

            {/* Performance Overlay */}
            <OverlayContainer $isVisible={isVisible}
                $isCompact={isCompactMode}
            >
                <Header>
                    <Title>{i18n.t("Performance Monitor")}</Title>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <CompactToggle 
                            onClick={exportPerformanceData}
                            title={i18n.t("Export performance data")}
                        >
                            📊
                        </CompactToggle>
                        <CompactToggle 
                            onClick={() => setIsCompactMode(!isCompactMode)}
                            title={isCompactMode ? i18n.t("Expand overlay") : i18n.t("Compact mode")}
                        >
                            {isCompactMode ? '⤢' : '⤡'}
                        </CompactToggle>
                        <CloseButton onClick={() => setIsVisible(false)}>×</CloseButton>
                    </div>
                </Header>

                {performanceData && 
                    <>
                        <MetricsGrid>
                            <MetricCard $color="#00ff88">
                                <MetricValue>{performanceData.cullingEfficiency.toFixed(0)}%</MetricValue>
                                <MetricLabel>{i18n.t("Culling")}</MetricLabel>
                            </MetricCard>
                            
                            <MetricCard $color="#0088ff">
                                <MetricValue>{performanceData.throttlingEfficiency.toFixed(0)}%</MetricValue>
                                <MetricLabel>{i18n.t("Throttling")}</MetricLabel>
                            </MetricCard>
                            
                            <MetricCard $color="#ff8800">
                                <MetricValue>{totalBehaviors}</MetricValue>
                                <MetricLabel>{i18n.t("Behaviors")}</MetricLabel>
                            </MetricCard>
                            
                            <MetricCard $color="#ff4488">
                                <MetricValue>{performanceData.actualFPS}</MetricValue>
                                <MetricLabel>{i18n.t("Real FPS")}</MetricLabel>
                            </MetricCard>
                        </MetricsGrid>

                        {!isCompactMode && 
                            <Section>
                                <SectionTitle>{i18n.t("Priority Distribution")}</SectionTitle>
                                {Object.entries(performanceData.behaviorCounts).map(([priority, count]) => {
                                    const percentage = totalBehaviors > 0 ? count / totalBehaviors * 100 : 0;
                                    return percentage > 0 ? 
                                        <PriorityBar 
                                            key={priority}
                                            $width={Math.max(percentage, 10)}
                                            $color={priorityColors[priority as BehaviorThrottlePriority]}
                                        >
                                            {priority.slice(0, 3)}: {count}
                                        </PriorityBar>
                                     : null;
                                })}
                            </Section>
                        }

                        <Section>
                            <SectionTitle>{i18n.t("Insights")}</SectionTitle>
                            {getRecommendations().map((rec, index) => 
                                <RecommendationCard key={index}
                                    $type={rec.type}
                                >
                                    <span>{rec.message}</span>
                                    {rec.action && rec.actionLabel && 
                                        <QuickFixButton onClick={rec.action}>
                                            {rec.actionLabel}
                                        </QuickFixButton>
                                    }
                                </RecommendationCard>,
                            )}
                            {getRecommendations().length === 0 && 
                                <RecommendationCard $type="info">
                                    <span>{i18n.t("Performance looks good!")}</span>
                                </RecommendationCard>
                            }
                        </Section>

                        <div style={{ fontSize: '9px', color: '#666', textAlign: 'center', marginTop: '8px' }}>
                            {i18n.t("Ctrl+Shift+P: Toggle • Ctrl+F: Toggle FPS")}
                        </div>
                    </>
                }

                {!performanceData && 
                    <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                        {i18n.t("Collecting performance data...")}
                    </div>
                }
            </OverlayContainer>
        </>
    );
};

export const PerformanceOverlay = React.memo(PerformanceOverlayComponent);
