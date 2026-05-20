import styled from "styled-components";

import {Animation} from "@stem/editor-oss/context/ModelAnimationCombinerContext";

const directionMap = {
    WalkForward: [
        {x: 0, y: -1},
        {x: 0, y: -2},
        {x: 0, y: -3},
    ],
    WalkBackward: [
        {x: 0, y: 1},
        {x: 0, y: 2},
        {x: 0, y: 3},
    ],
    WalkLeft: [
        {x: -1, y: 0},
        {x: -2, y: 0},
        {x: -3, y: 0},
    ],
    WalkRight: [
        {x: 1, y: 0},
        {x: 2, y: 0},
        {x: 3, y: 0},
    ],
    WalkDiagonal: [
        {x: -1, y: -1},
        {x: -2, y: -2},
        {x: 1, y: -1},
        {x: 2, y: -2},
        {x: -1, y: -2},
        {x: 1, y: -2},
    ],
    Idle: [{x: 0, y: 0}],
    Die: [],
} as const;

interface Props {
    animation: Animation;
}

export const MotionMap = ({animation}: Props) => {
    const directions = directionMap[animation.name as keyof typeof directionMap] ?? [];
    const spacing = 27; // px between points

    return (
        <MapContainer>
            {directions.map((point, i) => 
                <Dot
                    key={i}
                    style={{
                        left: `calc(50% + ${point.x * spacing}px)`,
                        top: `calc(50% + ${point.y * spacing}px)`,
                    }}
                />,
            )}
        </MapContainer>
    );
};

const MapContainer = styled.div`
    position: absolute;
    bottom: 8px;
    left: 8px;
    width: 200px;
    height: 200px;
    background: #00000040;
    border-radius: 16px;
`;

const Dot = styled.div`
    position: absolute;
    width: 10px;
    height: 10px;
    background-color: #0284c7;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    transition: background 0.2s;
`;
