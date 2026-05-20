import React, {useState, useRef, useCallback, useMemo} from "react";
import styled from "styled-components";
import {PiecewiseBezier} from "three.quarks";

interface BezierCurveEditorProps {
    value: PiecewiseBezier;
    onChange?: (value: PiecewiseBezier) => void;
    width: number;
    height: number;
    padding?: Array<number>;
    className?: string;
    background?: string;
    gridColor?: string;
    curveColor?: string;
    handleColor?: string;
    controlHandleColor?: string;
    curveWidth?: number;
    handleRadius?: number;
    handleStroke?: number;
    readOnly?: boolean;
    style?: React.CSSProperties;
    pointers?: React.CSSProperties;
    textStyle?: React.CSSProperties;
}

const EditorContainer = styled.div`
    position: relative;
    user-select: none;
`;

const defaultProps = {
    padding: [0, 0, 0, 0],
    handleRadius: 4,
};

const ZOOM_POW = Math.sqrt(Math.sqrt(2));

export const BezierCurveEditor: React.FC<BezierCurveEditorProps> = props => {
    const {
        width,
        height,
        curveWidth = 1,
        curveColor = "#000",
        handleRadius = defaultProps.handleRadius,
        handleColor = "#f00",
        controlHandleColor = "#a0f",
        handleStroke = 1,
        background = "#fff",
        value,
        onChange,
    } = props;

    const [currentValue, setCurrentValue] = useState(new PiecewiseBezier(value.functions));
    const [curveIndex, setCurveIndex] = useState(-1);
    const [hoverHandle, setHoverHandle] = useState(-1);
    const [downHandle, setDownHandle] = useState(-1);
    const [viewBox, setViewBox] = useState({x: 0, y: -height, w: width, h: height});
    const [zoom, setZoom] = useState({x: 1, y: 1});
    const [lastMousePos, setLastMousePos] = useState<{x: number; y: number} | null>(null);

    const rootRef = useRef<HTMLDivElement>(null);

    const getViewportPositionFromEvent = useCallback((e: React.MouseEvent): [number, number] => {
        if (rootRef.current) {
            const rect = rootRef.current.getBoundingClientRect();
            return [e.clientX - rect.left, e.clientY - rect.top];
        } else {
            return [0, 0];
        }
    }, []);

    const getPositionFromEvent = useCallback(
        (e: React.MouseEvent): [number, number] => {
            if (rootRef.current) {
                const rect = rootRef.current.getBoundingClientRect();
                return [
                    (e.clientX - rect.left + viewBox.x) / viewBox.w,
                    -(e.clientY - rect.top + viewBox.y) / viewBox.h / zoom.y,
                ];
            } else {
                return [0, 0];
            }
        },
        [viewBox, zoom],
    );

    const onMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (e.button !== 2 && curveIndex === -1) {
                const [x, y] = getViewportPositionFromEvent(e);
                setLastMousePos({x, y});
            }
        },
        [curveIndex, getViewportPositionFromEvent],
    );

    const onDownMove = useCallback(
        (e: React.MouseEvent) => {
            if (lastMousePos) {
                e.preventDefault();
                const [x, y] = getViewportPositionFromEvent(e);
                const newViewBox = {...viewBox};
                newViewBox.x -= x - lastMousePos.x;
                newViewBox.y -= y - lastMousePos.y;
                setViewBox(newViewBox);
                setLastMousePos({x, y});
            } else if (downHandle >= 0 && curveIndex >= 0) {
                e.preventDefault();
                const [x, y] = getPositionFromEvent(e);

                const curve = currentValue.getFunction(curveIndex);
                if (downHandle === 0) {
                    const old = curve.p[0]!;
                    curve.p[0] = y;
                    curve.p[1]! += curve.p[0] - old;
                    currentValue.setStartX(curveIndex, x);
                    if (curveIndex - 1 >= 0) {
                        const pCurve = currentValue.getFunction(curveIndex - 1);
                        pCurve.p[3] = y;
                        pCurve.p[2]! += curve.p[0] - old;
                        currentValue.setFunction(curveIndex - 1, currentValue.getFunction(curveIndex - 1).clone());
                    }
                    currentValue.setFunction(curveIndex, curve.clone());
                }
                if (downHandle === 3) {
                    const old = curve.p[3]!;
                    curve.p[3] = y;
                    curve.p[2]! += curve.p[3] - old;
                    currentValue.setEndX(curveIndex, x);
                    if (curveIndex + 1 < currentValue.numOfFunctions) {
                        const nCurve = currentValue.getFunction(curveIndex + 1);
                        nCurve.p[0] = y;
                        nCurve.p[1]! += curve.p[3] - old;
                        currentValue.setFunction(curveIndex + 1, currentValue.getFunction(curveIndex + 1).clone());
                    }
                    currentValue.setFunction(curveIndex, curve.clone());
                }
                if (downHandle === 1) {
                    curve.p[1] = y;
                    currentValue.setFunction(curveIndex, curve.clone());
                }
                if (downHandle === 2) {
                    curve.p[2] = y;
                    currentValue.setFunction(curveIndex, curve.clone());
                }
                const newValue = new PiecewiseBezier(currentValue.functions);
                setCurrentValue(newValue);
                if (onChange) {
                    onChange(newValue);
                }
            }
        },
        [
            curveIndex,
            downHandle,
            lastMousePos,
            getViewportPositionFromEvent,
            getPositionFromEvent,
            currentValue,
            onChange,
            viewBox,
        ],
    );

    const onDownLeave = useCallback(
        (e: React.MouseEvent) => {
            if (downHandle >= 0) {
                onDownMove(e);
            }
            // Don't reset downHandle here - let onMouseUp handle it
        },
        [downHandle, onDownMove],
    );

    const onMouseUp = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            if (e.button === 2 && hoverHandle === -1) {
                const [x, y] = getPositionFromEvent(e);

                const cIndex = currentValue.findFunction(x);
                const curve = currentValue.getFunction(cIndex);
                const endX = currentValue.getEndX(cIndex);
                const startX = currentValue.getStartX(cIndex);

                const nCurve1 = curve.clone();
                const nCurve2 = curve.clone();

                nCurve1.p[1] = curve.p[0]! + curve.getSlope(startX) / (endX - startX) * (x - startX) / 3;
                nCurve1.p[2] = y - curve.getSlope(x) / (endX - startX) * (x - startX) / 3;
                nCurve1.p[3] = y!;
                nCurve2.p[0] = y!;
                nCurve2.p[1] = y + curve.getSlope(x) / (endX - startX) * (endX - x) / 3;
                nCurve2.p[2] = curve.p[3]! - curve.getSlope(endX) / (endX - startX) * (endX - x) / 3;

                currentValue.insertFunction(x, nCurve2);
                currentValue.setFunction(cIndex, nCurve1);

                setCurveIndex(cIndex + 1);
                setHoverHandle(0);
                const newValue = new PiecewiseBezier(currentValue.functions);
                setCurrentValue(newValue);
                if (onChange) {
                    onChange(newValue);
                }
            } else {
                setHoverHandle(-1);
                setDownHandle(-1);
                setCurveIndex(-1);
                setLastMousePos(null);
            }
        },
        [hoverHandle, currentValue, getPositionFromEvent, onChange],
    );

    const onMouseWheel = useCallback(
        (e: React.WheelEvent) => {
            setZoom({x: zoom.x, y: zoom.y * Math.pow(ZOOM_POW, e.deltaY / 100)});
        },
        [zoom],
    );

    const onEnterHandle = (c: number, h: number) => {
        if (downHandle < 0) {
            setCurveIndex(c);
            setHoverHandle(h);
        }
    };

    const onUpHandle = (c: number, h: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.button === 2) {
            if (h === 0 && c > 0) {
                const nextC = currentValue.removeFunction(c);
                const curve = currentValue.getFunction(c - 1);
                curve.p[2] = nextC.p[2]!;
                curve.p[3] = nextC.p[3]!;
                currentValue.setFunction(c - 1, curve.clone());
                const newValue = new PiecewiseBezier(currentValue.functions);
                setCurrentValue(newValue);
                if (onChange) {
                    onChange(newValue);
                }
            } else if (h === 3 && c < currentValue.numOfFunctions - 1) {
                const nextC = currentValue.removeFunction(c + 1);
                const curve = currentValue.getFunction(c);
                curve.p[2] = nextC.p[2]!;
                curve.p[3] = nextC.p[3]!;
                currentValue.setFunction(c, curve.clone());
                const newValue = new PiecewiseBezier(currentValue.functions);
                setCurrentValue(newValue);
                if (onChange) {
                    onChange(newValue);
                }
            }
        }
        // Always reset drag state on mouse up
        setDownHandle(-1);
        setHoverHandle(-1);
        setCurveIndex(-1);
        setLastMousePos(null);
    };

    const onDownHandle = (c: number, h: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.button === 2) {
            // Right click handling is in onUpHandle
        } else {
            setDownHandle(h);
            setHoverHandle(-1);
            setCurveIndex(c);
        }
    };

    const onLeaveHandle = () => {
        if (downHandle < 0) {
            setHoverHandle(-1);
            setCurveIndex(-1);
        }
    };

    // Generate curve paths and handles
    const curves = [];
    for (let i = 0; i < currentValue.numOfFunctions; i++) {
        const x1 = currentValue.getStartX(i);
        const x2 = currentValue.getEndX(i);
        const curve = currentValue.getFunction(i);
        const slope0 = curve.getSlope(0);
        const slope1 = curve.getSlope(1);

        // Create curve path using the CurveComponent logic
        const pathPoints = [];
        const steps = 50;
        for (let j = 0; j <= steps; j++) {
            const t = j / steps;
            const x = x1 + (x2 - x1) * t;
            const y = curve.genValue(t);
            pathPoints.push(`${x * width},${-y * height * zoom.y}`);
        }

        curves.push(
            <g key={`curve-${i}`}>
                <polyline points={pathPoints.join(" ")}
                    fill="none"
                    stroke={curveColor}
                    strokeWidth={curveWidth}
                />

                {/* Control lines - connect control handles to curve points */}
                <line
                    x1={x1 * width}
                    y1={-curve.p[0]! * height * zoom.y}
                    x2={x1 * width + 1.0 / 3 * (x2 - x1) * width}
                    y2={-(curve.p[0]! + 1.0 / 3 * slope0) * height * zoom.y}
                    stroke={controlHandleColor}
                    strokeWidth={1}
                    strokeDasharray="2,2"
                />
                <line
                    x1={x2 * width}
                    y1={-curve.p[3]! * height * zoom.y}
                    x2={x2 * width - 1.0 / 3 * (x2 - x1) * width}
                    y2={-(curve.p[3]! - 1.0 / 3 * slope1) * height * zoom.y}
                    stroke={controlHandleColor}
                    strokeWidth={1}
                    strokeDasharray="2,2"
                />

                {/* Handle 0 - start point */}
                <circle
                    cx={x1 * width}
                    cy={-curve.p[0]! * height * zoom.y}
                    r={handleRadius}
                    fill={curveIndex === i && (hoverHandle === 0 || downHandle === 0) ? "#fff" : handleColor}
                    stroke={handleColor}
                    strokeWidth={handleStroke}
                    style={{cursor: "pointer"}}
                    onMouseEnter={() => onEnterHandle(i, 0)}
                    onMouseLeave={onLeaveHandle}
                    onMouseDown={e => onDownHandle(i, 0, e)}
                    onMouseUp={e => onUpHandle(i, 0, e)}
                />

                {/* Handle 1 - first control point */}
                <circle
                    cx={x1 * width + 1.0 / 3 * (x2 - x1) * width}
                    cy={-(curve.p[0]! + 1.0 / 3 * slope0) * height * zoom.y}
                    r={handleRadius}
                    fill={curveIndex === i && (hoverHandle === 1 || downHandle === 1) ? "#fff" : controlHandleColor}
                    stroke={controlHandleColor}
                    strokeWidth={handleStroke}
                    style={{cursor: "pointer"}}
                    onMouseEnter={() => onEnterHandle(i, 1)}
                    onMouseLeave={onLeaveHandle}
                    onMouseDown={e => onDownHandle(i, 1, e)}
                    onMouseUp={e => onUpHandle(i, 1, e)}
                />

                {/* Handle 2 - second control point */}
                <circle
                    cx={x2 * width - 1.0 / 3 * (x2 - x1) * width}
                    cy={-(curve.p[3]! - 1.0 / 3 * slope1) * height * zoom.y}
                    r={handleRadius}
                    fill={curveIndex === i && (hoverHandle === 2 || downHandle === 2) ? "#fff" : controlHandleColor}
                    stroke={controlHandleColor}
                    strokeWidth={handleStroke}
                    style={{cursor: "pointer"}}
                    onMouseEnter={() => onEnterHandle(i, 2)}
                    onMouseLeave={onLeaveHandle}
                    onMouseDown={e => onDownHandle(i, 2, e)}
                    onMouseUp={e => onUpHandle(i, 2, e)}
                />

                {/* Handle 3 - end point */}
                <circle
                    cx={x2 * width}
                    cy={-curve.p[3]! * height * zoom.y}
                    r={handleRadius}
                    fill={curveIndex === i && (hoverHandle === 3 || downHandle === 3) ? "#fff" : handleColor}
                    stroke={handleColor}
                    strokeWidth={handleStroke}
                    style={{cursor: "pointer"}}
                    onMouseEnter={() => onEnterHandle(i, 3)}
                    onMouseLeave={onLeaveHandle}
                    onMouseDown={e => onDownHandle(i, 3, e)}
                    onMouseUp={e => onUpHandle(i, 3, e)}
                />
            </g>,
        );
    }

    // Scale text for zoom reference
    const scaleText = useMemo(() => {
        const texts = [];
        for (let i = 0; i < 10; i++) {
            texts.push(
                <text key={i}
                    x={-40}
                    y={-i * 80}
                    fontSize="12"
                    fill="#666"
                >
                    {Math.round(i * 80 / height / zoom.y * 100) / 100}
                </text>,
            );
        }
        return texts;
    }, [zoom, height]);

    return (
        <EditorContainer
            ref={rootRef}
            onContextMenu={e => {
                e.preventDefault();
            }}
        >
            <svg
                width={width}
                height={height}
                viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
                preserveAspectRatio="none"
                onMouseDown={onMouseDown}
                onMouseMove={onDownMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onDownLeave}
                onWheel={onMouseWheel}
                style={{
                    backgroundColor: background,
                    cursor: downHandle >= 0 ? "grabbing" : lastMousePos ? "grab" : "default",
                }}
            >
                {/* Grid pattern */}
                <defs>
                    <pattern id="smallGrid"
                        width="8"
                        height="8"
                        patternUnits="userSpaceOnUse"
                    >
                        <path d="M 8 0 L 0 0 0 8"
                            fill="none"
                            stroke="gray"
                            strokeWidth="0.5"
                        />
                    </pattern>
                    <pattern id="grid"
                        width="80"
                        height="80"
                        patternUnits="userSpaceOnUse"
                        y={0}
                    >
                        <rect width="80"
                            height="80"
                            fill="url(#smallGrid)"
                        />
                        <path d="M 80 0 L 0 0 0 80"
                            fill="none"
                            stroke="gray"
                            strokeWidth="1"
                        />
                    </pattern>
                </defs>
                <rect y={-800}
                    width="100%"
                    height="1600"
                    fill="url(#grid)"
                />

                {scaleText}

                {/* Main axis line */}
                <path d={`M 0 0 L ${width} 0`}
                    fill="none"
                    stroke="black"
                    strokeWidth="2"
                />

                {curves}
            </svg>
        </EditorContainer>
    );
};
