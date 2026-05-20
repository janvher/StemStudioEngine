import {useRef, useState, useEffect, useCallback, RefObject} from "react";
import {createPortal} from "react-dom";
import styled from "styled-components";
import {useOnClickOutside} from "usehooks-ts";

import {AllBehaviorsList} from "./AllBehaviorsList/AllBehaviorsList";
import {SelectedBehaviorsList} from "./SelectedBehaviorsList/SelectedBehaviorsList";
import { BehaviorConfig } from "../../../../../behaviors/BehaviorConfig";

interface Props {
    selectedBehavior: any;
    setSelectedBehavior: React.Dispatch<any>;
    copyAllBehaviors: () => void;
    pasteBehavior: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    setIsBehaviorsListDisplayed: React.Dispatch<React.SetStateAction<boolean>>;
    isBehaviorsListDisplayed: boolean;
    addNewBehavior: (type: string) => void;
    behaviorConfigs: BehaviorConfig[];
}

export const MainView = ({
    selectedBehavior,
    setSelectedBehavior,
    copyAllBehaviors,
    pasteBehavior,
    setIsBehaviorsListDisplayed,
    isBehaviorsListDisplayed,
    addNewBehavior,
    behaviorConfigs,
}: Props) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const [listPosition, setListPosition] = useState({ top: 0, left: 0 });

    useOnClickOutside(
        [containerRef, listRef] as unknown as RefObject<HTMLElement>[],
        () => setIsBehaviorsListDisplayed(false),
    );

    const updatePosition = useCallback(() => {
        if (buttonRef.current && isBehaviorsListDisplayed) {
            const rect = buttonRef.current.getBoundingClientRect();
            setListPosition({
                top: rect.top,
                left: rect.left - 208, // 200px width + 8px gap
            });
        }
    }, [isBehaviorsListDisplayed]);

    useEffect(() => {
        updatePosition();
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);
        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [updatePosition]);

    return (
        <Container>
            <BehaviorSectionWrapper ref={containerRef}>
                <div ref={buttonRef}>
                    <SelectedBehaviorsList
                        setIsBehaviorsListDisplayed={setIsBehaviorsListDisplayed}
                        setSelectedBehavior={setSelectedBehavior}
                        selectedBehavior={selectedBehavior}
                        copyAllBehaviors={copyAllBehaviors}
                        pasteBehavior={pasteBehavior}
                    />
                </div>

                {isBehaviorsListDisplayed &&
                    createPortal(
                        <AllBehaviorsList
                            ref={listRef}
                            addNewBehavior={addNewBehavior}
                            behaviorConfigs={behaviorConfigs}
                            style={{
                                position: "fixed",
                                top: listPosition.top,
                                left: listPosition.left,
                            }}
                        />,
                        document.body,
                    )
                }
            </BehaviorSectionWrapper>
        </Container>
    );
};

const Container = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 11px;
    box-sizing: border-box;
    overflow-y: auto;
`;

const BehaviorSectionWrapper = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
`;
