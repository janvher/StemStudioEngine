import {useCallback, useEffect, useState} from "react";

import {BehaviorsWrapper, Container, PlusIcon} from "./SelectedBehaviorsList.style";
import {SingleBehavior} from "./SingleBehavior";
import EngineRuntime from '@stem/editor-oss/EngineRuntime';
import BehaviorData from "../../../../../../../behaviors/BehaviorData";
import global from "@stem/editor-oss/global";
import {isTemplateScene} from "@stem/editor-oss/utils/isTemplateScene";
import {StyledButton} from "../../../../common/StyledButton";

type Props = {
    setIsBehaviorsListDisplayed: (value: boolean) => void;
    selectedBehavior: any;
    setSelectedBehavior: (behavior: any) => void;
    copyAllBehaviors: () => void;
    pasteBehavior: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
};

export const SelectedBehaviorsList = ({
    setIsBehaviorsListDisplayed,
    setSelectedBehavior,
    selectedBehavior,
    copyAllBehaviors,
    pasteBehavior,
}: Props) => {
    const [data, setData] = useState<any>({});

    const app = global.app as EngineRuntime | null | undefined;
    const editor = app?.editor;
    const behaviorDataManager = editor?.behaviorDataManager;

    const updateUI = useCallback(() => {
        const selected = editor?.selected;
        setData(selected ? {[(selected as any).id]: selected} : {});
    }, [editor]);

    const handleObjectSelected = useCallback(() => {
        updateUI();
        setSelectedBehavior(null);
    }, [updateUI, setSelectedBehavior]);

    useEffect(() => {
        if (!app) return;

        updateUI();
        app.on(`objectChanged.SelectedBehaviorsList`, updateUI);
        app.on(`objectRemoved.SelectedBehaviorsList`, updateUI);
        app.on(`objectSelected.SelectedBehaviorsList`, handleObjectSelected);

        return () => {
            app.on(`objectChanged.SelectedBehaviorsList`, null);
            app.on(`objectRemoved.SelectedBehaviorsList`, null);
            app.on(`objectSelected.SelectedBehaviorsList`, null);
        };
    }, [app, updateUI, handleObjectSelected]);

    const handleRemoveBehaviorByUUID = (uuid: string) => {
        if (!app) return;
        const selected = editor?.selected;
        if (!selected || Array.isArray(selected)) return;

        if (selectedBehavior?.uuid === uuid) {
            setSelectedBehavior(null);
        }
        const behaviorData = editor.removeBehaviorFromObject(selected, uuid);

        if (behaviorData) {
            app?.game?.removeBehaviorByUUID(behaviorData.uuid);
        }

        app.call(`objectChanged`, app.editor, app.editor?.selected);
    };

    const getAllBehaviors = (userData: any): BehaviorData[] => {
        return (userData?.behaviors || []) as BehaviorData[];
    };

    const selected = editor?.selected;
    const selectedObject = selected && !Array.isArray(selected) ? selected : null;
    const isTemplate = isTemplateScene(editor?.sceneID);
    const canAddBehaviors = !isTemplate && Boolean(
        selectedObject &&
        behaviorDataManager?.canAddBehaviorsToObject(selectedObject),
    );

    return Object.keys(data).map(id => {
        const allBehaviors = getAllBehaviors(data[id].userData);
        return (
            <Container key={id}>
                <StyledButton
                    isBlue
                    onClick={() => setIsBehaviorsListDisplayed(true)}
                    disabled={!canAddBehaviors}
                >
                    <PlusIcon>+</PlusIcon> <span>Add Behavior</span>
                </StyledButton>
                <BehaviorsWrapper>
                    {allBehaviors.map((behaviorData: BehaviorData) =>
                        <SingleBehavior
                            key={behaviorData.uuid}
                            behaviorData={behaviorData}
                            onRemoveBehaviorById={handleRemoveBehaviorByUUID}
                            setSelectedBehavior={setSelectedBehavior}
                            copyAllBehaviors={copyAllBehaviors}
                            pasteBehavior={pasteBehavior}
                            allBehaviors={allBehaviors}
                        />,
                    )}
                </BehaviorsWrapper>
            </Container>
        );
    });
};
