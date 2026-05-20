import { useEffect, useState } from "react";

import { useHUDContext, useHUDGameContext } from "@stem/editor-oss/context";
import { Item } from "../../../../../common/BasicCombobox/BasicCombobox";
import { StyledButton } from "../../../../../common/StyledButton";
import { ColorSelectionRow } from "../../../../../RightPanel/common/ColorSelectionRow";
import { NumericInputRow } from "../../../../../RightPanel/common/NumericInputRow";
import { SelectRow } from "../../../../../RightPanel/common/SelectRow";
import { TextInputRow } from "../../../../../RightPanel/common/TextInputRow";
import { Wrapper } from "../../../commonStyle";
import { FONT_FAMILIES, HUD_TABS, IBannerInterface } from "../../../types";

export const AddBanner = () => {
    const { popupCallback, activeScreen, popupId } = useHUDContext();
    const { gameLayout } = useHUDGameContext();

    const [obj, setObj] = useState<IBannerInterface | undefined>();
    const [UITag, setUITag] = useState(obj?.UITag || "Game Over");
    const [extraUITag, setExtraUITag] = useState(obj?.extraUITags?.[0] || "Death");
    const [extraUITag2, setExtraUITag2] = useState(obj?.extraUITags?.[1] || "Win");
    const [fontFamily, setFontFamily] = useState<string>(obj?.fontFamily || FONT_FAMILIES.ROBOTO);
    const [fontSize, setFontSize] = useState(obj?.fontSize || 96);
    const [fontColor, setFontColor] = useState(obj?.fontColor || "#fff");
    const [fontFamilyOptions, setFontFamilyOptions] = useState<Item[]>([]);

    useEffect(() => {
        let buttonData;
        if (activeScreen === HUD_TABS.GAME_HUD && popupId) {
            buttonData = gameLayout?.[popupId as keyof typeof gameLayout];
        }
        if (buttonData) {
            setObj(buttonData as IBannerInterface);
        }
    }, [popupId, activeScreen, gameLayout]);

    useEffect(() => {
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

    useEffect(() => {
        if (obj) {
            setUITag(obj?.UITag || "Game Over");
            setExtraUITag(obj?.extraUITags?.[0] || "Death");
            setExtraUITag2(obj?.extraUITags?.[1] || "Win");
            setFontFamily(obj?.fontFamily || FONT_FAMILIES.ROBOTO);
            setFontSize(obj?.fontSize || 96);
            setFontColor(obj?.fontColor || "#fff");
        }
    }, [obj]);

    return (
        <>
            <Wrapper>
                <TextInputRow value={UITag}
                    setValue={setUITag}
                    label="UI Tag"
                />
                <TextInputRow value={extraUITag}
                    setValue={setExtraUITag}
                    label="Extra UI Tag"
                />
                <TextInputRow value={extraUITag2}
                    setValue={setExtraUITag2}
                    label="Extra UI Tag"
                />
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
                                UITag,
                                extraUITags: [extraUITag, extraUITag2],
                                fontFamily: nextFontFamily,
                                fontSize,
                                fontColor,
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
                    popupCallback &&
                        popupCallback({
                            UITag,
                            extraUITags: [extraUITag, extraUITag2],
                            fontFamily,
                            fontSize,
                            fontColor,
                        });
                }}
            >
                Apply
            </StyledButton>
        </>
    );
};
