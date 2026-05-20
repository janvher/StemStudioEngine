import { useEffect, useState } from "react";

import { MapImgWrapper } from "./AddMiniMap.style";
import blueTriangle from "./icons/blueTriangle.svg";
import greenTriangle from "./icons/greenTriangle.svg";
import purpleTriangle from "./icons/purpleTriangle.svg";
import redEllipse from "./icons/redEllipse.svg";
import whiteEllipse from "./icons/whiteEllipse.svg";
import whiteTriangle from "./icons/whiteTriangle.svg";
import yellowEllipse from "./icons/yellowEllipse.svg";
import yellowTriangle from "./icons/yellowTriangle.svg";
import { useHUDContext, useHUDGameContext } from "@stem/editor-oss/context";
import { backendUrlFromPath } from "@stem/editor-oss/utils/UrlUtils";
import { Item } from "../../../../../common/BasicCombobox/BasicCombobox";
import { StyledButton } from "../../../../../common/StyledButton";
import { UploadField } from "../../../../../common/UploadField/UploadField";
import { ColorSelectionRow } from "../../../../../RightPanel/common/ColorSelectionRow";
import { PanelCheckbox } from "../../../../../RightPanel/common/PanelCheckbox";
import { SelectRow } from "../../../../../RightPanel/common/SelectRow";
import { FileData } from "../../../../../types/file";
import { Wrapper } from "../../../commonStyle";
import { HUD_TABS, Icon, IMiniMapInterface, MINI_MAP_STYLES } from "../../../types";
import { UIIconSelection } from "../../UIIconSelection/UIIconSelection";

const ICONS = [
    { src: whiteEllipse, alt: "whiteEllipse" },
    { src: redEllipse, alt: "redEllipse" },
    { src: yellowEllipse, alt: "yellowEllipse" },
    { src: whiteTriangle, alt: "whiteTriangle" },
    { src: blueTriangle, alt: "blueTriangle" },
    { src: purpleTriangle, alt: "purpleTriangle" },
    { src: yellowTriangle, alt: "yellowTriangle" },
    { src: greenTriangle, alt: "greenTriangle" },
];

export const AddMiniMap = () => {
    const { popupCallback, activeScreen, popupId } = useHUDContext();
    const { gameLayout } = useHUDGameContext();

    const [obj, setObj] = useState<IMiniMapInterface | undefined>();
    const [UIStyle, setUIStyle] = useState(obj?.UIStyle || MINI_MAP_STYLES.DARK_VERSION);
    const [enemyColor, setEnemyColor] = useState(obj?.enemyColor || "#000");
    const [teamColor, setTeamColor] = useState(obj?.teamColor || "#00f");
    const [iconSelected, setIconSelected] = useState<Icon | undefined>(obj?.iconSelected || undefined);
    const [uploadedMapImg, setUploadedMapImage] = useState<FileData | null | string>(obj?.uploadedMapImg || null);
    const [UIStyleOptions, setUIStyleOptions] = useState<Item[]>([]);
    const [useMiniMapCamera, setUseMiniMapCamera] = useState<boolean>(obj ? obj.useMiniMapCamera : false);

    useEffect(() => {
        if (activeScreen === HUD_TABS.GAME_HUD && popupId) {
            const bannerData = gameLayout?.[popupId as keyof typeof gameLayout];
            if (bannerData) {
                setObj(bannerData as IMiniMapInterface);
            } else {
                setObj(undefined);
            }
        }
    }, [popupId, activeScreen]);

    useEffect(() => {
        setUIStyle(obj?.UIStyle || MINI_MAP_STYLES.DARK_VERSION);
        setEnemyColor(obj?.enemyColor || "#000");
        setTeamColor(obj?.teamColor || "#00f");
        setIconSelected(obj?.iconSelected || undefined);
        setUploadedMapImage(obj?.uploadedMapImg || null);
        setUseMiniMapCamera(obj?.useMiniMapCamera || false);
    }, [obj]);

    useEffect(() => {
        const UIStyleValues = Object.values(MINI_MAP_STYLES);
        setUIStyleOptions(
            UIStyleValues.map((option: string, index: number) => {
                return {
                    key: `${index + 1}`,
                    value: option,
                };
            }),
        );
    }, []);

    return (
        <>
            <Wrapper>
                <SelectRow
                    $margin="0"
                    label="Mini Map Theme"
                    data={UIStyleOptions}
                    value={UIStyleOptions.find(item => item.value === UIStyle) || UIStyleOptions[0]}
                    onChange={item => setUIStyle(item.value as MINI_MAP_STYLES)}
                />
                <ColorSelectionRow $margin="0"
                    value={enemyColor}
                    setValue={setEnemyColor}
                    label="Enemy Color"
                />
                <ColorSelectionRow $margin="0"
                    value={teamColor}
                    setValue={setTeamColor}
                    label="Team Color"
                />
                <UIIconSelection icons={ICONS}
                    iconSelected={iconSelected}
                    setIconSelected={setIconSelected}
                />
                <MapImgWrapper>
                    <div className="title">Mini Map Image</div>
                    <UploadField
                        width="100%"
                        height="210px"
                        uploadedFile={uploadedMapImg}
                        setUploadedFile={setUploadedMapImage}
                    />
                </MapImgWrapper>
                <PanelCheckbox
                    text="Use Mini Map Camera"
                    checked={!!useMiniMapCamera}
                    onChange={() => setUseMiniMapCamera(!useMiniMapCamera)}
                />
            </Wrapper>
            <StyledButton
                margin="16px 0 0"
                isBlue
                onClick={() => {
                    popupCallback &&
                        popupCallback({
                            UIStyle,
                            iconSelected,
                            enemyColor,
                            teamColor,
                            uploadedMapImg: backendUrlFromPath(uploadedMapImg),
                        });
                }}
            >
                Apply
            </StyledButton>
        </>
    );
};
