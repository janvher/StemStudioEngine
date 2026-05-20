import styled from "styled-components";

import {InGameData} from "../../HUDView/types";
import {IItemButtonInterface, UI_ITEM_BUTTON_TYPES} from "../types";
import defaultImage from "./default-image.png";

export const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
    justify-content: center;
    position: relative;
    pointer-events: all;
`;

export const KeyNumber = styled.div<{$customStyle: IItemButtonInterface}>`
    color: white;
    text-stroke:
        -1px 0 black,
        0 1px black,
        1px 0 black,
        0 -1px black;
    font-size: 20px;
    position: absolute;
    top: calc(100% + 16px);
    ${({$customStyle}) =>
        $customStyle &&
        `
    font-size: ${$customStyle.fontSize}px;
    font-family: "${$customStyle.fontFamily}";
    * {
    font-family: "${$customStyle.fontFamily}" ;
    }
    color: ${$customStyle.fontColor};
  `}
`;

export const AmountWrapper = styled.div<{$customStyle: IItemButtonInterface}>`
    text-shadow:
        -1px 0 black,
        0 1px black,
        1px 0 black,
        0 -1px black;
    ${({$customStyle}) =>
        $customStyle &&
        `
  font-size: ${$customStyle.fontSize}px;
  font-family: "${$customStyle.fontFamily}";
  * {
  font-family: "${$customStyle.fontFamily}" ;
}
  color: ${$customStyle.fontColor};
`}
    position: absolute;
    bottom: 8px;
    right: 8px;
    display: flex;
    align-items: center;
`;

const SelectBorder = styled.div`
    width: 114px;
    height: 114px;
    border: 3px solid #ffffff;
    box-sizing: border-box;
    position: absolute;
    top: -3px;
    left: 50%;
    transform: translateX(-50%);
`;

export const ItemButton = styled.div<{
    $customStyle: IItemButtonInterface;
    width: string;
    height: string;
    $maxWidth?: string;
    $image?: string;
}>`
    position: relative;
    width: ${({width}) => width};
    height: ${({height}) => height};
    max-width: ${({$maxWidth}) => $maxWidth ? $maxWidth : "100%"};
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    white-space: nowrap;
    pointer-events: all;
    text-shadow:
        -1px 0 black,
        0 1px black,
        1px 0 black,
        0 -1px black;
    background-image: url("${defaultImage}");
    background-repeat: no-repeat;
    background-size: cover;
    background-position: center;

    ${({$image}) =>
        $image &&
        `
      background-image: url('${$image}');
      
  `}

    ${({$customStyle}) =>
        $customStyle &&
        `
    font-size: ${$customStyle.fontSize}px;
    font-family: "${$customStyle.fontFamily}";
    * {
    font-family: "${$customStyle.fontFamily}" ;
}
    color: ${$customStyle.fontColor};
  `}
`;

type Props = {
    customStyle?: IItemButtonInterface;
    itemKey: number;
    width: string;
    height: string;
    maxWidth?: string;
    onClick?: () => void;
    children?: any;
    id?: string;
    amount?: number;
    gameData?: InGameData;
    weaponIndex?: number;
};

export const CustomItemButton = ({
    customStyle,
    width,
    height,
    maxWidth,
    onClick,
    children,
    itemKey,
    id,
    amount,
    gameData,
    weaponIndex,
}: Props) => {
    const weapons = gameData?.playerWeapons;
    const currentItem = gameData?.pickedWeaponOrItem;

    if (!customStyle) return <div />;

    const isWeaponButton = customStyle.UITag === UI_ITEM_BUTTON_TYPES.WEAPON;

    const buttonWeapon = weaponIndex !== undefined ? weapons?.[weaponIndex] : undefined;

    const weaponImage = isWeaponButton && buttonWeapon?.hudImage;
    const isActive = currentItem?.userData.ID && currentItem?.userData.ID === buttonWeapon?.userData.ID;

    return (
        <Wrapper>
            <ItemButton
                onClick={onClick}
                $customStyle={customStyle}
                $image={weaponImage}
                width={width}
                height={height}
                $maxWidth={maxWidth}
                id={id}
            >
                {children}
                <AmountWrapper $customStyle={customStyle}>
                    <span data-name="amount">{amount}</span>
                    {customStyle.maxAmount && <>/{customStyle.maxAmount}</>}
                </AmountWrapper>
            </ItemButton>
            {isActive && <SelectBorder />}
            <KeyNumber $customStyle={customStyle}>{itemKey}</KeyNumber>
        </Wrapper>
    );
};
