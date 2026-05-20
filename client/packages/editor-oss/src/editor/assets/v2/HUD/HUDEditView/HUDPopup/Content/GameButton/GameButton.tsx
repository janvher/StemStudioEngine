import {useEffect, useState} from "react";

import aidKit from "./icons/aidKit.svg";
import coin from "./icons/coin.svg";
import heart from "./icons/heart.svg";
import lightning from "./icons/lightning.svg";
import play from "./icons/play.svg";
import settings from "./icons/settings.svg";
import shield from "./icons/shield.svg";
import {useHUDContext, useHUDInGameMenuContext, useHUDStartGameMenuContext} from "@stem/editor-oss/context";
import {DEFAULT_BUTTON_CSS} from "@stem/editor-oss/context/HUDStartGameMenuContext";
import {backendUrlFromPath} from "@stem/editor-oss/utils/UrlUtils";
import {Item} from "../../../../../common/BasicCombobox/BasicCombobox";
import {StyledButton} from "../../../../../common/StyledButton";
import {UploadField} from "../../../../../common/UploadField/UploadField";
import {ColorSelectionRow} from "../../../../../RightPanel/common/ColorSelectionRow";
import {NumericInputRow} from "../../../../../RightPanel/common/NumericInputRow";
import {SelectionOfButtons} from "../../../../../RightPanel/common/SelectionOfButtons";
import {SelectRow} from "../../../../../RightPanel/common/SelectRow";
import {FileData} from "../../../../../types/file";
import {FieldWrapper, Wrapper} from "../../../commonStyle";
import {FONT_FAMILIES, HUD_TABS, Icon, IGameButtonInterface, ISound, START_MENU_BUTTON_TYPES} from "../../../types";
import {UIIconSelection} from "../../UIIconSelection/UIIconSelection";

export const ICONS = [
    {src: aidKit, alt: "aid kit"},
    {src: heart, alt: "heart"}, // alt used in HUDGameContext
    {src: shield, alt: "shield"},
    {src: lightning, alt: "lightning"},
    {src: coin, alt: "coin"},
    {src: play, alt: "play", maxWidth: "24px"},
    {src: settings, alt: "settings", maxWidth: "27px"},
];

export const GameButton = () => {
    const {popupCallback, popupId, activeScreen, soundOptions, soundAssets} = useHUDContext();
    const {startGameMenuLayout} = useHUDStartGameMenuContext();
    const {inGameMenuLayout} = useHUDInGameMenuContext();
    const [obj, setObj] = useState<IGameButtonInterface | undefined>();
    const [UIButtonType, setUIButtonType] = useState(obj?.UIButtonType || START_MENU_BUTTON_TYPES.START_GAME);
    const [buttonTypesOptions, setButtonTypesOptions] = useState<Item[]>([]);
    const [fontFamilyOptions, setFontFamilyOptions] = useState<Item[]>([]);
    const [hoverSound, setHoverSound] = useState<ISound | undefined>(obj?.hoverSound);
    const [clickSound, setClickSound] = useState<ISound | undefined>(obj?.clickSound);
    const [fontFamily, setFontFamily] = useState(obj?.fontFamily || DEFAULT_BUTTON_CSS.fontFamily);
    const [fontSize, setFontSize] = useState(obj?.fontSize || DEFAULT_BUTTON_CSS.fontSize);
    const [fontColor, setFontColor] = useState(obj?.fontColor || DEFAULT_BUTTON_CSS.fontColor);
    const [radius, setRadius] = useState(obj?.radius || DEFAULT_BUTTON_CSS.radius);
    const [buttonColor, setButtonColor] = useState(obj?.buttonColor || DEFAULT_BUTTON_CSS.buttonColor);
    const [uploadedButtonImg, setUploadedButtonImg] = useState<FileData | null | string>(
        obj?.uploadedButtonImg || null,
    );
    const [iconSelected, setIconSelected] = useState<Icon | undefined>(obj?.iconSelected);
    const [isCustomButton, setIsCustomButton] = useState(false);

    useEffect(() => {
        let buttonData: IGameButtonInterface | null = null;
        if (activeScreen === HUD_TABS.GAME_START_MENU && popupId) {
            buttonData = startGameMenuLayout?.[popupId as keyof typeof startGameMenuLayout] as IGameButtonInterface;
        } else if (activeScreen === HUD_TABS.IN_GAME_MENU && popupId) {
            buttonData = inGameMenuLayout?.[popupId as keyof typeof inGameMenuLayout] as IGameButtonInterface;
        }
        if (buttonData) {
            setObj(buttonData);
        } else {
            setObj(undefined);
        }
    }, [popupId, activeScreen]);

    useEffect(() => {
        setUIButtonType(obj?.UIButtonType || START_MENU_BUTTON_TYPES.START_GAME);
        setHoverSound(obj?.hoverSound);
        setClickSound(obj?.clickSound);
        setFontFamily(obj?.fontFamily || DEFAULT_BUTTON_CSS.fontFamily);
        setFontSize(obj?.fontSize || DEFAULT_BUTTON_CSS.fontSize);
        setFontColor(obj?.fontColor || DEFAULT_BUTTON_CSS.fontColor);
        setRadius(obj?.radius || DEFAULT_BUTTON_CSS.radius);
        setButtonColor(obj?.buttonColor || DEFAULT_BUTTON_CSS.buttonColor);
        setUploadedButtonImg(obj?.uploadedButtonImg || null);
        setIconSelected(obj?.iconSelected);
    }, [obj]);

    useEffect(() => {
        if (!isCustomButton) {
            setUploadedButtonImg(null);
        }
    }, [isCustomButton]);

    useEffect(() => {
        const buttonTypesValues = Object.values(START_MENU_BUTTON_TYPES);
        setButtonTypesOptions(
            buttonTypesValues.map((option: string, index: number) => {
                return {
                    key: `${index + 1}`,
                    value: option,
                };
            }),
        );
        const fontFamilyValues = Object.values(FONT_FAMILIES);
        setFontFamilyOptions(
            fontFamilyValues.map((option: string, index: number) => {
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
                    label="UI Button Type"
                    data={buttonTypesOptions}
                    value={buttonTypesOptions.find(item => item.value === UIButtonType) || buttonTypesOptions[0]}
                    onChange={item => setUIButtonType(item.value)}
                />
                <SelectionOfButtons margin="0 auto 0">
                    <StyledButton
                        width="109px"
                        isBlue={!isCustomButton}
                        isActive={isCustomButton}
                        onClick={() => setIsCustomButton(false)}
                    >
                        <span>Default Button</span>
                    </StyledButton>
                    <StyledButton
                        width="109px"
                        isBlue={isCustomButton}
                        isActive={!isCustomButton}
                        onClick={() => setIsCustomButton(true)}
                    >
                        <span>Custom Button</span>
                    </StyledButton>
                </SelectionOfButtons>
                {isCustomButton && 
                    <FieldWrapper>
                        <label className="buttonImageLabel">Upload Button Image &#40;460px x 50px&#41;</label>
                        <UploadField
                            style={{margin: "0 auto", borderRadius: "4px", fontSize: "21px", color: "#fff"}}
                            width="100%"
                            height="29px"
                            uploadedFile={uploadedButtonImg}
                            setUploadedFile={setUploadedButtonImg}
                            size={{minWidth: 460, minHeight: 50}}
                        />
                    </FieldWrapper>
                }
                <SelectRow
                    $margin="0"
                    label="Font Family"
                    data={fontFamilyOptions}
                    value={fontFamilyOptions.find(item => item.value === fontFamily) || fontFamilyOptions[0]}
                    onChange={item => {
                        const nextFontFamily = item.value;
                        setFontFamily(nextFontFamily);
                        popupCallback &&
                            popupCallback({
                                UIButtonType,
                                fontFamily: nextFontFamily,
                                fontSize,
                                fontColor,
                                buttonColor,
                                uploadedButtonImg: backendUrlFromPath(uploadedButtonImg),
                                iconSelected,
                                hoverSound,
                                clickSound,
                            });
                    }}
                />
                <NumericInputRow
                    $margin="0"
                    width="75px"
                    label="Font Size"
                    value={fontSize}
                    setValue={value => setFontSize(value)}
                />
                <ColorSelectionRow $margin="0"
                    value={fontColor}
                    setValue={setFontColor}
                    label="Font Color"
                />
                {!isCustomButton && 
                    <ColorSelectionRow $margin="0"
                        value={buttonColor}
                        setValue={setButtonColor}
                        label="Button Color"
                    />
                }
                <NumericInputRow
                    $margin="0"
                    width="75px"
                    label="Button Roundness"
                    value={radius}
                    setValue={value => setRadius(value)}
                />
                <UIIconSelection icons={ICONS}
                    iconSelected={iconSelected}
                    setIconSelected={setIconSelected}
                />
                <SelectRow
                    $margin="0"
                    label="Hover Sound"
                    data={soundOptions}
                    value={soundOptions.find(item => item.value === hoverSound?.Name) || soundOptions[0]}
                    onChange={item => setHoverSound(soundAssets?.find(el => el.Name === item.value))}
                />
                <SelectRow
                    $margin="0"
                    label="Click Sound"
                    data={soundOptions}
                    value={soundOptions.find(item => item.value === clickSound?.Name) || soundOptions[0]}
                    onChange={item => setClickSound(soundAssets?.find(el => el.Name === item.value))}
                />
            </Wrapper>
            <StyledButton
                margin="16px 0 0"
                isBlue
                onClick={() => {
                    popupCallback &&
                        popupCallback({
                            UIButtonType,
                            fontFamily,
                            fontSize,
                            fontColor,
                            buttonColor,
                            uploadedButtonImg: backendUrlFromPath(uploadedButtonImg),
                            iconSelected,
                            hoverSound,
                            clickSound,
                        });
                }}
            >
                Apply
            </StyledButton>
        </>
    );
};
