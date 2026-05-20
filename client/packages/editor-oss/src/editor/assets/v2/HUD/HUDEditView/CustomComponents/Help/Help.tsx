import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import {useFTUE} from "@stem/editor-oss/context/FTUEContext";
import global from "@stem/editor-oss/global";
import questionMark from "../../../../icons/question-mark-circle.svg";
import {Help, MenuButton} from "../FTUE/FTUE.style";

export const HelpComponent = () => {
    const {showFTUE} = useFTUE();
    const app = global.app as EngineRuntime;
    const userId = app?.userId;

    const handleHelpClick = () => {
        if (!userId) return;

        const finishedUsers = JSON.parse(localStorage.getItem("finishedFTUEUsers") || "[]");
        const updatedUsers = finishedUsers.filter((id: string) => id !== userId);
        localStorage.setItem("finishedFTUEUsers", JSON.stringify(updatedUsers));
        showFTUE();
    };

    return (
        <Help
            onClick={handleHelpClick}
            onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                    handleHelpClick();
                }
            }}
        >
            <MenuButton>
                <img src={questionMark}
                    alt="info"
                    className="info"
                />
            </MenuButton>
        </Help>
    );
};
