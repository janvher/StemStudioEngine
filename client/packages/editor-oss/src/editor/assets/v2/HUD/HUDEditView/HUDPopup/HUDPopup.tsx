import {AddBanner} from "./Content/AddBanner/AddBanner";
import {Container, Content, Header} from "./HUDPopup.style";
import {
    useHUDContext,
    useHUDGameContext,
    useHUDInGameMenuContext,
    useHUDStartGameMenuContext,
} from "@stem/editor-oss/context";
import {HUD_TABS, LAYOUT_BUTTON_TYPE} from "../types";
import {AddComponent} from "./Content/AddComponent/AddComponent";
import {AddItemButton} from "./Content/AddItemButton/AddItemButton";
import {AddLogo} from "./Content/AddLogo/AddLogo";
import {AddMenuBg} from "./Content/AddMenuBg/AddMenuBg";
import {AddMiniMap} from "./Content/AddMiniMap/AddMiniMap";
import {GameButton} from "./Content/GameButton/GameButton";
import {CloseIconWrapper} from "../../../common/UploadField/UploadField.style";
import trashIcon from "../../../icons/trash.svg";

export const HUDPopup = () => {
    const {popupType, activeScreen, popupId} = useHUDContext();
    const {setInGameMenuLayout, inGameMenuLayout} = useHUDInGameMenuContext();
    const {startGameMenuLayout, setStartGameMenuLayout} = useHUDStartGameMenuContext();
    const {gameLayout, setGameLayout} = useHUDGameContext();

    const handleDelete = () => {
        if (activeScreen === HUD_TABS.IN_GAME_MENU && popupId) {
            const {[popupId]: _, ...newLayout} = inGameMenuLayout as Record<string, any>;
            setInGameMenuLayout(newLayout);
        } else if (activeScreen === HUD_TABS.GAME_START_MENU && popupId) {
            const {[popupId]: _, ...newLayout} = startGameMenuLayout as Record<string, any>;
            setStartGameMenuLayout(newLayout);
        } else if (activeScreen === HUD_TABS.GAME_HUD && popupId) {
            const {[popupId]: _, ...newLayout} = gameLayout as Record<string, any>;
            setGameLayout(newLayout || {});
        }
    };

    return (
        <Container>
            <Header>
                {popupType}
                <CloseIconWrapper className="deleteIcon"
                    onClick={handleDelete}
                >
                    <img src={trashIcon}
                        alt="remove file"
                    />
                </CloseIconWrapper>
            </Header>
            <Content>
                {popupType === LAYOUT_BUTTON_TYPE.ADD_GAME_LOGO && <AddLogo />}
                {popupType === LAYOUT_BUTTON_TYPE.ADD_MENU_BG && <AddMenuBg />}
                {popupType === LAYOUT_BUTTON_TYPE.ADD_GAME_BUTTON && <GameButton />}
                {popupType === LAYOUT_BUTTON_TYPE.ADD_COMPONENT && <AddComponent />}
                {popupType === LAYOUT_BUTTON_TYPE.ADD_RIGHT_MINI_MAP && <AddMiniMap />}
                {popupType === LAYOUT_BUTTON_TYPE.ADD_LEFT_MINI_MAP && <AddMiniMap />}
                {popupType === LAYOUT_BUTTON_TYPE.ADD_BANNER && <AddBanner />}
                {popupType === LAYOUT_BUTTON_TYPE.ADD_ITEM_BUTTON && <AddItemButton />}
            </Content>
        </Container>
    );
};
