import {BackButton, Header} from "./MaterialEditorPanel.style";
import {useAppGlobalContext} from "@stem/editor-oss/context";
import {RIGHT_PANEL_VERSIONS} from "@stem/editor-oss/context/appStateTypes";
import global from "@stem/editor-oss/global";
import {InfoIcon} from "../../../common/InfoCard/InfoIcon";
import goBackIcon from "../../icons/go-back.svg";
import {MainButtonsProps, ModelEditorButtons} from "../../ModelEditorButtons/ModelEditorButtons";
import {ExpandablePanel} from "../Panels/Panels";

export const MaterialEditorPanel = (props: MainButtonsProps) => {
    const editor = global.app!.editor!;
    const {setActiveRightPanel} = useAppGlobalContext();

    const handleGoBack = () => {
        editor.component!.setSelectedMaterialInfo(null);
        setActiveRightPanel(RIGHT_PANEL_VERSIONS.None);
    };

    return (
        <div>
            <Header>
                <BackButton className="reset-css"
                    onClick={handleGoBack}
                >
                    <img src={goBackIcon}
                        alt="go back"
                        className="icon"
                        onClick={handleGoBack}
                    />
                    <span>Back</span>
                </BackButton>
                <InfoIcon transparent
                    setIsCardVisible={() => {}}
                    size={14}
                    disabled
                />
            </Header>
            <ExpandablePanel label="Material ID's"
                renderArrow
                defaultExpanded
            >
                <ModelEditorButtons {...props} />
            </ExpandablePanel>
        </div>
    );
};
