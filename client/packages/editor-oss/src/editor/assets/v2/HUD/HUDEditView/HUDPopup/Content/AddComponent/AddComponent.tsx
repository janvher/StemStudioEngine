import { useEffect, useState } from "react";


import aidKit from "./icons/aidKit.svg";
import coin from "./icons/coin.svg";
import heart from "./icons/heart.svg";
import lightning from "./icons/lightning.svg";
import shield from "./icons/shield.svg";
import timer from "./icons/timer.svg";
import whiteHeart from "./icons/whiteHeart.svg";
import whiteStar from "./icons/whiteStar.svg";
import { FileData } from "../../../../..//types/file";
import { useHUDContext, useHUDGameContext } from "@stem/editor-oss/context";
import { Item } from "../../../../../common/BasicCombobox/BasicCombobox";
import { StyledButton } from "../../../../../common/StyledButton";
import { UploadField } from "../../../../../common/UploadField/UploadField";
import { ColorSelectionRow } from "../../../../../RightPanel/common/ColorSelectionRow";
import { NumericInputRow } from "../../../../../RightPanel/common/NumericInputRow";
import { SelectionOfButtons } from "../../../../../RightPanel/common/SelectionOfButtons";
import { SelectRow } from "../../../../../RightPanel/common/SelectRow";
import { FieldWrapper, Wrapper } from "../../../commonStyle";
import { FONT_FAMILIES, HUD_TABS, IComponentInterface, Icon, UI_COMPONENT_TYPES } from "../../../types";
import { UIIconSelection } from "../../UIIconSelection/UIIconSelection";

const ICONS = [
    { src: aidKit, alt: "aid kit" },
    { src: heart, alt: "heart" },
    { src: shield, alt: "shield" },
    { src: lightning, alt: "lightning" },
    { src: coin, alt: "coin" },
    { src: whiteHeart, alt: "whiteHeart" },
    { src: whiteStar, alt: "whiteStar" },
    { src: timer, alt: "timer" },
];

export const AddComponent = () => {
    const { popupCallback, activeScreen, popupId } = useHUDContext();
    const { gameLayout } = useHUDGameContext();

    const [obj, setObj] = useState<IComponentInterface | undefined>();
    const [variable, setVariable] = useState(obj?.variable || UI_COMPONENT_TYPES.Collectable);
    const [UIType, setUIType] = useState(obj?.UIType || UI_COMPONENT_TYPES.Collectable);
    const [fontFamily, setFontFamily] = useState<string>(obj?.fontFamily || FONT_FAMILIES.ROBOTO);
    const [fontSize, setFontSize] = useState(obj?.fontSize || 12);
    const [fontColor, setFontColor] = useState(obj?.fontColor || "#fff");
    const [barColor, setBarColor] = useState(obj?.barColor || "#000");
    const [statBarColor, setStatBarColor] = useState(obj?.statBarColor || "#BCE8AD");
    const [iconSelected, setIconSelected] = useState<Icon | undefined>(obj?.iconSelected);
    const [isCustomButton, setIsCustomButton] = useState(false);
    const [uploadedButtonImg, setUploadedButtonImg] = useState<FileData | null | string>(
        obj?.uploadedButtonImg || null,
    );
    const [radius, setRadius] = useState(obj?.radius || 8);
    const [UITypeOptions, setUITypeOptions] = useState<Item[]>([]);
    const [fontFamilyOptions, setFontFamilyOptions] = useState<Item[]>([]);

    useEffect(() => {
        let buttonData;
        if (activeScreen === HUD_TABS.GAME_HUD && popupId) {
            buttonData = gameLayout?.[popupId as keyof typeof gameLayout];
        }
        if (buttonData) {
            setObj(buttonData as IComponentInterface);
        } else {
            setObj(undefined);
        }
    }, [popupId, activeScreen]);

    useEffect(() => {
        setVariable(obj?.variable || UI_COMPONENT_TYPES.Collectable);
        setUIType(obj?.UIType || UI_COMPONENT_TYPES.Collectable);
        setFontFamily(obj?.fontFamily || FONT_FAMILIES.ROBOTO);
        setFontSize(obj?.fontSize || 12);
        setFontColor(obj?.fontColor || "#fff");
        setBarColor(obj?.barColor || "#000");
        setStatBarColor(obj?.statBarColor || "#BCE8AD");
        setIconSelected(obj?.iconSelected);
        setUploadedButtonImg(obj?.uploadedButtonImg || null);
        setRadius(obj?.radius || 8);
    }, [obj]);

    useEffect(() => {
        if (!isCustomButton) {
            setUploadedButtonImg(null);
        }
    }, [isCustomButton]);

    useEffect(() => {
        const UITagsValues = Object.values(UI_COMPONENT_TYPES);
        setUITypeOptions(
            UITagsValues.map((option: string, index: number) => {
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
                    label="UI Type"
                    data={UITypeOptions}
                    value={UITypeOptions.find(item => item.value === UIType) || UITypeOptions[0]}
                    onChange={item => {
                        setUIType(item.value as UI_COMPONENT_TYPES);
                        setVariable(item.value);
                    }}
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
                            style={{ margin: "0 auto", borderRadius: "4px", fontSize: "21px", color: "#fff" }}
                            width="100%"
                            height="29px"
                            uploadedFile={uploadedButtonImg}
                            setUploadedFile={setUploadedButtonImg}
                            size={{ minWidth: 460, minHeight: 50 }}
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
                                UIType,
                                variable,
                                iconSelected,
                                fontFamily: nextFontFamily,
                                fontSize,
                                fontColor,
                                barColor,
                                radius,
                                uploadedButtonImg,
                                statBarColor,
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
                {!isCustomButton && UIType !== UI_COMPONENT_TYPES.Score && UIType !== UI_COMPONENT_TYPES.Lives && 
                    <ColorSelectionRow $margin="0"
                        value={barColor}
                        setValue={setBarColor}
                        label="Bar Color"
                    />
                }
                <ColorSelectionRow $margin="0"
                    value={statBarColor}
                    setValue={setStatBarColor}
                    label="Stat Bar Color"
                />
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
            </Wrapper>
            <StyledButton
                isBlue
                onClick={() => {
                    popupCallback &&
                        popupCallback({
                            UIType,
                            variable,
                            iconSelected,
                            fontFamily,
                            fontSize,
                            fontColor,
                            barColor,
                            radius,
                            uploadedButtonImg,
                            statBarColor,
                        });
                }}
            >
                Apply
            </StyledButton>
        </>
    );
};
