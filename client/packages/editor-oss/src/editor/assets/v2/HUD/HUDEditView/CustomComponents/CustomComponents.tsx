import React from "react";

import {IComponentInterface, UI_COMPONENT_TYPES} from "../types";
import {Collectable} from "./Collectable/Collectable";
import {Health} from "./Health/Health";
import {Lives} from "./Lives/Lives";
import {Score} from "./Score/Score";
import {Timer} from "./Timer/Timer";
import {InGameData} from "../../HUDView/types";

type Props = {
    customStyle?: IComponentInterface;
    width: string;
    height: string;
    maxWidth?: string;
    onClick?: () => void;
    gameData?: InGameData;
    children?: React.ReactNode;
};

export const CustomComponent = ({customStyle, width, height, maxWidth, onClick, gameData, children}: Props) => {
    const handleClick = () => {
        onClick && onClick();
    };

    const getComponent = () => {
        if (!customStyle) return <div />;

        if (customStyle.UIType === UI_COMPONENT_TYPES.Collectable) {
            return (
                <Collectable
                    onClick={handleClick}
                    customStyle={customStyle}
                    width={width}
                    height={height}
                    maxWidth={maxWidth}
                />
            );
        }
        if (customStyle.UIType === UI_COMPONENT_TYPES.Health) {
            return (
                <Health
                    onClick={handleClick}
                    customStyle={customStyle}
                    width={width}
                    height={height}
                    maxWidth={maxWidth}
                    currentLives={gameData ? +gameData.health : 100}
                    totalLives={gameData ? +gameData.initialHealth : 100}
                />
            );
        }

        if (customStyle.UIType === UI_COMPONENT_TYPES.Score) {
            return (
                <Score
                    onClick={handleClick}
                    customStyle={customStyle}
                    width={width}
                    height={height}
                    maxWidth={maxWidth}
                    score={gameData ? +gameData.score : 125}
                />
            );
        }

        if (customStyle.UIType === UI_COMPONENT_TYPES.Lives) {
            return (
                <Lives
                    onClick={handleClick}
                    customStyle={customStyle}
                    width={width}
                    height={height}
                    maxWidth={maxWidth}
                    currentLives={gameData ? +gameData.currentLives : 3}
                    totalLives={gameData ? +gameData.totalLives : 4}
                />
            );
        }

        if (customStyle.UIType === UI_COMPONENT_TYPES.Timer) {
            return (
                <Timer
                    onClick={handleClick}
                    customStyle={customStyle}
                    width={width}
                    height={height}
                    maxWidth={maxWidth}
                    time={gameData ? gameData.timeRemaining : "00:00:00"}
                />
            );
        }
    };

    return (
        <>
            {getComponent()}
            {children}
        </>
    );
};
