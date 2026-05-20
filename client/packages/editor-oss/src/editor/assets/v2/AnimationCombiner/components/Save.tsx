import {AnimationClip} from "three";

import {AnimationGraph} from "../../../../../animation/AnimationGraph";
import {EARTHAnimationGraphExporterPlugin} from "../../../../../animation/extensions/EARTHAnimationGraphExporterPlugin";
import {saveScene} from "@stem/network/api/scene";
import {useModelAnimationCombinerContext} from "@stem/editor-oss/context";
import {useSaveModel} from "../../../../models/hooks/models";
import {StyledButton} from "../../common/StyledButton";

type Props = {
    onSave: () => void;
    model: any;
};

export const Save = ({onSave, model}: Props) => {
    const {animations, mainModel, toggleLoading, action, animationGraph} = useModelAnimationCombinerContext();
    const saveModel = useSaveModel();

    const handleSave = async () => {
        if (!model || !mainModel) return;

        // Sync the latest animations onto both the selected scene model
        // and the editor's preview model so the export carries them.
        const selectionTarget = model._obj || model;
        Object.assign(selectionTarget, {animations});
        const previewTarget = mainModel?._obj || mainModel;
        if (previewTarget?.animations) {
            Object.assign(previewTarget.animations, animations);
        }

        const clips: AnimationClip[] = (animations as unknown as AnimationClip[]) || [];

        action?.stop();
        toggleLoading();
        try {
            await saveModel({
                selection: selectionTarget,
                exportSource: mainModel,
                animations: clips,
                // Animation-specific exporter wiring: register the EARTH
                // animation graph extension when there's a graph + clips.
                configureExporter: animationGraph && clips.length > 0
                    ? (exporter) => {
                        exporter.register(writer => {
                            const plugin = new EARTHAnimationGraphExporterPlugin(writer);
                            plugin.setAnimationData(animationGraph as AnimationGraph, clips);
                            return plugin;
                        });
                    }
                    : undefined,
            });
        } finally {
            toggleLoading();
        }
        void saveScene();
        onSave();
    };

    return (
        <StyledButton
            isBlue
            style={{margin: "0 auto"}}
            width="50%"
            onClick={() => { void handleSave(); }}
            className="blueBtn"
        >
            Save
        </StyledButton>
    );
};
