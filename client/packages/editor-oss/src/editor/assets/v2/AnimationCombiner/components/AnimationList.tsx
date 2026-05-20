import React, {useEffect, useState, ChangeEvent, KeyboardEvent, useCallback} from "react";
import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../assets/style";
import {useModelAnimationCombinerContext} from "@stem/editor-oss/context";
import playIcon from "../assets/play.svg";
import trashIcon from "../assets/trash.svg";

const Section = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;

    gap: 16px;
    box-sizing: border-box;
    padding: 12px 8px 0;
    max-height: calc(100% - 180px);

    .IconButton {
        outline: none;
        border: none;
        color: white;
        &:hover {
            color: white;
        }
    }
`;

const Title = styled.div`
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
    color: #fff;
`;

const ItemsWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    overflow-y: auto;
    box-sizing: border-box;
`;

const CollectionItem = styled.div`
    display: flex;
    align-items: center;
    padding: 8px;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    background-color: var(--theme-grey-bg);
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-regular);
    color: var(--theme-font-unselected-tertiary-color);
    border-radius: 8px;

    &:hover {
        color: white;
        background-color: var(--theme-container-main-blue);
    }

    .play-icon {
        display: none;
    }

    &.playing {
        color: white;
        background-color: var(--theme-container-main-blue);
        .play-icon {
            display: inline-block;
        }
    }
`;

const NoAnimations = styled(CollectionItem)`
    background-color: #d32f2f;
    color: #fff;
    ${flexCenter};
    pointer-events: none;
`;

const AnimationInput = styled.input`
    display: flex;
    align-items: center;
    padding: 8px;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    background-color: var(--theme-container-main-blue);
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-regular);
    color: white;
    border-radius: 8px;
    outline: none;
    border: none;
    height: 32px;
`;

export const AnimationList: React.FC = () => {
    const {animations, mixer, changeName, deleteAnimation, action, setAction} = useModelAnimationCombinerContext();

    const [playing, setPlaying] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState<string>("");

    useEffect(() => {
        setTimeout(() => {
            const item = document.querySelectorAll<HTMLLIElement>(".collection-item")[4];
            if (item) item.click();
        }, 10000);
    }, []);

    const playAnimation = useCallback(
        (animation: any) => {
            if (action) action.stop();
            if (animation.uuid === playing) {
                setPlaying(null);
                return;
            }
            if (!mixer) return;
            const newAction = mixer.clipAction(animation);
            newAction.play();
            setAction(newAction);
            setPlaying(animation.uuid);
        },
        [playing, action, mixer],
    );

    const changeAnimationName = (animation: any) => {
        if (name.length) {
            animation.name = name;
            changeName(animation);
        }
        setEditingId(null);
    };

    const removeAnimation = (animationId: string) => {
        if (action && action.getClip().uuid === animationId) action.stop();
        deleteAnimation(animationId);
    };

    const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
        setName(e.target.value);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, item: any) => {
        if (e.key === "Enter") changeAnimationName(item);
    };

    useEffect(() => {
        return () => {
            if (action) action.stop();
        };
    }, [action]);

    return (
        <Section>
            <Title>Animations ({animations.length})</Title>

            {!animations.length && 
                <NoAnimations onClick={() => action && action.stop()}>
                    <span>No animations found</span>
                </NoAnimations>
            }
            <ItemsWrapper>
                {animations.length > 0 &&
                    animations.map((item, index) =>
                        item.uuid === editingId ? 
                            <AnimationInput
                                key={`${item.uuid}-${index}`}
                                type="text"
                                placeholder="Rename"
                                onChange={handleNameChange}
                                onKeyDown={e => handleKeyDown(e, item)}
                                onBlur={() => changeAnimationName(item)}
                                defaultValue={item.name}
                                autoFocus
                            />
                         : 
                            <CollectionItem
                                key={`${item.uuid}-${index}`}
                                onClick={() => playAnimation(item)}
                                onDoubleClick={() => setEditingId(item.uuid)}
                                className={item.uuid === playing ? "playing" : ""}
                            >
                                <img className="play-icon"
                                    style={{marginRight: "8px"}}
                                    src={playIcon}
                                    alt="playing"
                                />
                                <span>{item.name}</span>
                                <img
                                    className="deleteIcon"
                                    style={{color: "red", marginLeft: "auto"}}
                                    onClick={() => removeAnimation(item.uuid)}
                                    src={trashIcon}
                                    alt="delete"
                                />
                            </CollectionItem>
                        ,
                    )}
            </ItemsWrapper>
        </Section>
    );
};
