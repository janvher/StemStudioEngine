import React from "react";
import * as THREE from "three";

import { MainPanel } from "./MainPanel/MainPanel";
import { PrimitiveViewer } from "./PrimitiveViewer/PrimitiveViewer";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import global from "@stem/editor-oss/global";
import { Container, Overlay } from "../AnimationCombiner/ModelAnimationCombiner.style";
import { MaterialInfo } from "../RightPanel/ModelEditorButtons/ModelEditorButtons";
import {IMaterialSettings} from "../RightPanel/sections/MaterialRenderingSection/types";

type Props = {
    onClose: () => void;
    materialInfo?: MaterialInfo | null;
};

export const MaterialEditor = ({ onClose, materialInfo }: Props) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const cloneRef = React.useRef<THREE.Object3D | null>(null);
    const app = global.app as EngineRuntime;
    const [pendingSettings, setPendingSettings] = React.useState<{settings: IMaterialSettings; pathKey: string} | null>(
        null,
    );

    const handleClose = () => {
        app.call("objectChanged", app.editor, app.editor?.selected);
        onClose();
    };

    return (
        <Overlay>
            <Container ref={ref}>
                <PrimitiveViewer materialInfo={materialInfo}
                    cloneRef={cloneRef}
                    pendingSettings={pendingSettings}
                />
                <MainPanel onClose={handleClose}
                    materialInfo={materialInfo}
                    cloneRef={cloneRef}
                    setPendingSettings={setPendingSettings}
                    pendingSettings={pendingSettings}
                />
            </Container>
        </Overlay>
    );
};
