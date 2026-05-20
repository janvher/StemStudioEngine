import { useEffect, useState } from "react";

import { useHUDContext, useHUDGameContext } from "@stem/editor-oss/context";
import { Item } from "../../../../../common/BasicCombobox/BasicCombobox";
import { StyledButton } from "../../../../../common/StyledButton";
import { ColorSelectionRow } from "../../../../../RightPanel/common/ColorSelectionRow";
import { NumericInputRow } from "../../../../../RightPanel/common/NumericInputRow";
import { SelectRow } from "../../../../../RightPanel/common/SelectRow";
import { Wrapper } from "../../../commonStyle";
import { FONT_FAMILIES, HUD_TABS, IItemButtonInterface, UI_ITEM_BUTTON_TYPES } from "../../../types";

export const AddItemButton = () => {
    const { popupCallback, popupId, activeScreen } = useHUDContext();
    const { gameLayout } = useHUDGameContext();

    const [obj, setObj] = useState<IItemButtonInterface | undefined>();
    const [UITag, setUITag] = useState(UI_ITEM_BUTTON_TYPES.WEAPON);
    const [fontFamily, setFontFamily] = useState<string>(obj?.fontFamily || FONT_FAMILIES.ROBOTO);
    const [fontSize, setFontSize] = useState(obj?.fontSize || 20);
    const [maxAmount, setMaxAmount] = useState(obj?.maxAmount ? +obj?.maxAmount : 100);
    const [fontColor, setFontColor] = useState(obj?.fontColor || "#000");
    const [saveEnabled, setSaveEnabled] = useState(false);
    const [UITagOptions, setUITagOptions] = useState<Item[]>([]);
    const [fontFamilyOptions, setFontFamilyOptions] = useState<Item[]>([]);

    useEffect(() => {
        let buttonData;
        if (activeScreen === HUD_TABS.GAME_HUD && popupId) {
            buttonData = gameLayout?.[popupId as keyof typeof gameLayout];
        }
        if (buttonData) {
            setObj(buttonData as IItemButtonInterface);
        } else {
            setObj(undefined);
        }
    }, [popupId, activeScreen, gameLayout]);

    useEffect(() => {
        setUITag(obj?.UITag || UI_ITEM_BUTTON_TYPES.WEAPON);
        setFontFamily(obj?.fontFamily || FONT_FAMILIES.ROBOTO);
        setFontSize(obj?.fontSize || 20);
        setMaxAmount(obj?.maxAmount ? +obj.maxAmount : 100);
        setFontColor(obj?.fontColor || "#000");
    }, [obj]);

    useEffect(() => {
        setSaveEnabled(!!UITag && !!fontSize && !!maxAmount);
    }, [UITag, maxAmount, fontSize]);

    useEffect(() => {
        const UITagsValues = Object.values(UI_ITEM_BUTTON_TYPES);
        setUITagOptions(
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
                    label="UI Button Type"
                    data={UITagOptions}
                    value={UITagOptions.find(item => item.value === UITag) || UITagOptions[0]}
                    onChange={item => setUITag(item.value as UI_ITEM_BUTTON_TYPES)}
                />
                <NumericInputRow
                    $margin="0"
                    width="75px"
                    label="Max Amount"
                    value={maxAmount}
                    setValue={value => setMaxAmount(value)}
                />

                <SelectRow
                    $margin="0"
                    label="Font Family"
                    data={fontFamilyOptions}
                    value={fontFamilyOptions.find(item => item.value === fontFamily) || fontFamilyOptions[0]}
                    onChange={item => {
                        const nextFontFamily = item.value;
                        setFontFamily(nextFontFamily);
                        if (popupCallback)
                            popupCallback({
                                UITag,
                                fontFamily: nextFontFamily,
                                fontSize,
                                fontColor,
                                maxAmount,
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
            </Wrapper>
            <StyledButton
                margin="16px 0 0"
                isBlue
                onClick={() => {
                    if (popupCallback)
                        popupCallback({
                            UITag,
                            fontFamily,
                            fontSize,
                            fontColor,
                            maxAmount,
                        });
                }}
                disabled={!saveEnabled}
            >
                Apply
            </StyledButton>
        </>
    );
};
