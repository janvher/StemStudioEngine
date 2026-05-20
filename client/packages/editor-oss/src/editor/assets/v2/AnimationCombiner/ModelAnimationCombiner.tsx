import { useEffect } from "react";
import { ReactFlowProvider } from "reactflow";
import { Object3D } from "three";

import { AnimationGraphEditor } from "./components/AnimationGraphEditor/AnimationGraphEditor";
import { GraphPanel } from "./components/GraphPanel/GraphPanel";
import { ModelViewer } from "./components/ModelViewer";
import { Save } from "./components/Save";
import { Container, GraphEditorWrapper, LeftWrapper, LoadingContainer, Overlay } from "./ModelAnimationCombiner.style";
import { useModelAnimationCombinerContext } from "@stem/editor-oss/context";
import global from "@stem/editor-oss/global";
import GradientSpinner from "@web-shared/player/component/GradientSpinner";
import { backendUrlFromPath } from "@stem/editor-oss/utils/UrlUtils";
import { StyledButton } from "../common/StyledButton";


type Props = {
    model: Object3D | null;
    onClose: () => void;
};

export const ModelAnimationCombiner = ({ model, onClose }: Props) => {
    const app = (global as any).app;
    const { loading, clearState, animationGraph, uploadOptionSelected } = useModelAnimationCombinerContext();

    const handleClose = () => {
        onClose();
        clearState();
        app.call("fetchModels");
    };

    // Graph changes are now handled entirely via context in AnimationGraphEditor

    // Do not create a new graph by default; ModelViewer will load from glTF extension
    // and set it via context once the model is loaded.

    // Sync with context animation graph
    useEffect(() => {
        // no local graph; rely on context animationGraph exclusively
    }, [animationGraph]);

    const getModelUrl = (model: any) => {
        return backendUrlFromPath(model?.Url);
    };

    const getModelExtension = (model: any) => {
        const url = getModelUrl(model);
        return url?.split(".").pop() || "gltf";
    };

    return (
        <Overlay>
            <Container>
                <LeftWrapper>
                    <StyledButton width="50%"
                        isGrey
                        onClick={handleClose}
                    >
                        Close
                    </StyledButton>
                    <Save onSave={() => { }}
                        model={model}
                    />
                </LeftWrapper>
                <ModelViewer model={model}
                    fileExt={getModelExtension(model?.userData)}
                    handleClose={handleClose}
                />

                <GraphEditorWrapper>
                    {uploadOptionSelected && <GraphPanel model={model} />}
                    <ReactFlowProvider>
                        <AnimationGraphEditor />
                    </ReactFlowProvider>
                </GraphEditorWrapper>
            </Container>
            {/* <MotionMap animation={{ name: "WalkLeft" } as any} /> */}
            {loading && 
                <LoadingContainer>
                    <GradientSpinner />
                </LoadingContainer>
            }
        </Overlay>
    );
};
