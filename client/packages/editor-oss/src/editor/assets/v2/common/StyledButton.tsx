import classNames from "classnames";
import {debounce} from "lodash";
import React, {useEffect, useMemo, useRef} from "react";
import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../assets/style";
import deleteIcon from "../../../../editor/assets/v2/icons/delete-icon.svg";
import plusIcon from "../../../../editor/assets/v2/icons/plus-icon.svg";
import uploadIcon from "../../../../editor/assets/v2/icons/upload-icon.svg";

type Props = {
    children?: React.ReactNode;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onDoubleClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onContextMenu?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    style?: React.CSSProperties;
    className?: string;
    id?: string;
    disabled?: boolean;
    ref?: React.Ref<HTMLButtonElement>;
    isActive?: boolean;
    isPink?: boolean;
    isPinkGradient?: boolean;
    isBlue?: boolean;
    isBlueTheme?: boolean;
    isGrey?: boolean;
    isGreySecondary?: boolean;
    isGreyTertiary?: boolean;
    isBlueSecondary?: boolean;
    isGreyBlue?: boolean;
    isRed?: boolean;
    width?: string;
    maxWidth?: string;
    height?: string;
    margin?: string;
    customIcon?: string;
    addPlusIcon?: boolean;
    addUploadIcon?: boolean;
    addDeleteIcon?: boolean;
    isGreySecondaryTheme?: boolean;
    isMainDialogBtn?: boolean;
    isSecondaryDialogBtn?: boolean;
    isPurpleDialogBtn?: boolean;
    "data-testid"?: string;
    title?: string;
};

export const StyledButton = ({
    children,
    onClick,
    style,
    className,
    disabled,
    ref,
    id,
    isActive,
    isRed,
    isBlue,
    isMainDialogBtn,
    isSecondaryDialogBtn,
    isPurpleDialogBtn,
    isPink,
    isPinkGradient,
    isBlueSecondary,
    isGreySecondaryTheme,
    isGrey,
    isGreySecondary,
    isGreyTertiary,
    isGreyBlue,
    width,
    maxWidth,
    height,
    margin,
    customIcon,
    addPlusIcon,
    addUploadIcon,
    onDoubleClick,
    onContextMenu,
    addDeleteIcon,
    isBlueTheme,
    "data-testid": dataTestId,
    title,
}: Props) => {
    const onClickRef = useRef(onClick);
    onClickRef.current = onClick;

    const debouncedOnClick = useMemo(
        () =>
            debounce((e: React.MouseEvent<HTMLButtonElement>) => {
                onClickRef.current?.(e);
            }, 200),
        [],
    );

    useEffect(() => {
        return () => {
            debouncedOnClick.cancel();
        };
    }, [debouncedOnClick]);

    return (
        <CommonButton
            onContextMenu={onContextMenu}
            ref={ref}
            className={classNames("StyledButton", className)}
            onClick={debouncedOnClick}
            onDoubleClick={onDoubleClick}
            style={style}
            disabled={disabled}
            id={id}
            data-testid={dataTestId}
            title={title}
            $isActive={isActive}
            $isPink={isPink}
            $isPinkGradient={isPinkGradient}
            $isBlue={isBlue}
            $isMainDialogBtn={isMainDialogBtn}
            $isSecondaryDialogBtn={isSecondaryDialogBtn}
            $isPurpleDialogBtn={isPurpleDialogBtn}
            $isBlueTheme={isBlueTheme}
            $isBlueSecondary={isBlueSecondary}
            $isGrey={isGrey}
            $isGreySecondary={isGreySecondary}
            $isGreySecondaryTheme={isGreySecondaryTheme}
            $isGreyTertiary={isGreyTertiary}
            $isGreyBlue={isGreyBlue}
            $isRed={isRed}
            $width={width}
            $height={height}
            $margin={margin}
            $maxWidth={maxWidth}
        >
            {addUploadIcon && <img src={uploadIcon} />}
            {customIcon && (
                <img
                    src={customIcon}
                    className="customIcon"
                />
            )}
            {addPlusIcon && (
                <img
                    className="plus-icon"
                    src={plusIcon}
                />
            )}
            {addDeleteIcon && <img src={deleteIcon} />}
            {children}
        </CommonButton>
    );
};

export const CommonButton = styled.button<{
    $isActive?: boolean;
    $isPink?: boolean;
    $isPinkGradient?: boolean;
    $isBlue?: boolean;
    $isMainDialogBtn?: boolean;
    $isSecondaryDialogBtn?: boolean;
    $isPurpleDialogBtn?: boolean;
    $isBlueSecondary?: boolean;
    $isGrey?: boolean;
    $isGreySecondary?: boolean;
    $isGreySecondaryTheme?: boolean;
    $isBlueTheme?: boolean;
    $isGreyTertiary?: boolean;
    $isGreyBlue?: boolean;
    $isRed?: boolean;
    $width?: string;
    $margin?: string;
    $maxWidth?: string;
    disabled?: boolean;
    $height?: string;
}>`
    margin: ${({$margin}) => ($margin ? `${$margin}` : 0)};
    background: transparent;
    border: none;
    width: ${({$width}) => $width || "100%"};
    max-width: ${({$maxWidth}) => $maxWidth || "100%"}!important;
    height: ${({$height}) => $height || "32px"};
    padding: 8px;
    border-radius: 8px;
    ${flexCenter};
    column-gap: 4px;
    transition: all 0.2s;
    cursor: pointer;
    ${regularFont("s")};
    color: white;
    pointer-events: all;

    &:disabled {
        cursor: not-allowed !important;
    }

    &:hover {
        background: var(--theme-container-divider);
    }

    ${({$isActive}) =>
        $isActive &&
        `
    background: var(--theme-grey-bg);
  `}

    ${({$isPinkGradient}) =>
        $isPinkGradient &&
        `
background: linear-gradient(90deg, #A855F7 0%, #EC4899 100.33%);
border: none;
&:hover {
    background: linear-gradient(90deg, #9333EA 0%, #DB2777 100.33%);
    border-top: none;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
  }
  &:active {
    background: linear-gradient(90deg, #7C3AED 0%, #BE185D 100.33%);
    border-top: none;
    transform: translateY(0);
    box-shadow: none;
  }
`}

    ${({$isPink}) =>
        $isPink &&
        `
    background: var(--theme-container-main-pink);
    border-top: 1px solid var(--theme-container-main-pink-border);
    &:hover {
      background: var(--theme-container-hover-pink);
      border-top: 1px solid var(--theme-container-hover-pink-border);
    }
    &:active {
      background: var(--theme-container-active-pink);
      border-top: 1px solid var(--theme-container-active-pink-border);
    }
  `}

    ${({$isBlue}) =>
        $isBlue &&
        `
    background: var(--theme-dialog-button-primary);
    border-top: none;
    &:hover {
      background: var(--theme-dialog-button-primary-hover);
    }
    &:active {
      background: var(--theme-dialog-button-primary-active);
    }
  `}
    ${({$isMainDialogBtn}) =>
        $isMainDialogBtn &&
        `
    background: var(--theme-dialog-button-primary);
    border-top: none;
    &:hover {
      background: var(--theme-dialog-button-primary-hover);
    }
    &:active {
      background: var(--theme-dialog-button-primary-active);
    }
  `}

   ${({$isBlueTheme}) =>
        $isBlueTheme &&
        `
    background: var(--theme-container-main-blue);
    border-top: 1px solid var(--theme-container-main-blue-border);
    &:hover {
      background: var(--theme-container-hover-blue);
      border-top: 1px solid var(--theme-container-hover-blue-border);
    }
    &:active {
      background: var(--theme-container-active-blue);
      border-top: 1px solid var(--theme-container-active-blue-border);
    }
  `}

  ${({$isBlueSecondary}) =>
        $isBlueSecondary &&
        `
  background: #2E3A5C;
  border-top: none;
  &:hover {
      background: #384570;
    }
    `}
    
    ${({$isGrey}) =>
        $isGrey &&
        `
    background: var(--theme-grey-bg-button);
    border-top: none;
    &:hover {
        background-color: var(--theme-grey-bg-button-hover) !important;
    }
    &:active {
        background-color: var(--theme-grey-bg-button-active) !important;
    }
  `}

  ${({$isGreySecondary}) =>
        $isGreySecondary &&
        `
    background: var(--theme-dialog-button-secondary);
    border: 1px solid var(--theme-dialog-button-secondary-border);
    &:hover {
        background-color: var(--theme-dialog-button-secondary-hover) !important;
    }
    &:active {
        background-color: var(--theme-dialog-button-secondary-active) !important;
    }
  `}

  ${({$isSecondaryDialogBtn}) =>
        $isSecondaryDialogBtn &&
        `
    background: var(--theme-dialog-button-secondary);
    border: 1px solid var(--theme-dialog-button-secondary-border);
    &:hover {
        background-color: var(--theme-dialog-button-secondary-hover) !important;
    }
    &:active {
        background-color: var(--theme-dialog-button-secondary-active) !important;
    }
  `}

  ${({$isPurpleDialogBtn}) =>
        $isPurpleDialogBtn &&
        `
    background: var(--theme-dialog-button-purple);
    &:hover {
        background-color: var(--theme-dialog-button-purple-hover) !important;
    }
    &:active {
        background-color: var(--theme-dialog-button-purple-active) !important;
    }
  `}

    ${({$isGreySecondaryTheme}) =>
        $isGreySecondaryTheme &&
        `
    background: var(--theme-grey-bg-secondary-button);
     border-top: 1px solid #353952;
    &:hover {
        background-color: var(--theme-grey-bg-secondary-button-hover) !important;
    }
    &:active {
        background-color: var(--theme-grey-bg-secondary-button-active) !important;
    }
  `}

  ${({$isGreyTertiary}) =>
        $isGreyTertiary &&
        `
    background: var(--theme-grey-bg-tertiary-button);
     border-top: none;
    &:hover {
        background-color: var(--theme-grey-bg-tertiary-button-hover) !important;
    }
    &:active {
        background-color: var(--theme-grey-bg-tertiary-button-active) !important;
    }
  `}

  ${({$isRed}) =>
        $isRed &&
        `
    background: var( --theme-red-button);
     border-top: none;
    &:hover {
        background-color: var(--theme-red-button-hover) !important;
    }
    &:active {
        background-color: var(--theme-red-button-active) !important;
    }
  `}


    ${({$isGreyBlue}) =>
        $isGreyBlue &&
        `
    background: var(--theme-grey-bg);
    border-top: none;
    color: var(--theme-font-unselected-tertiary-color);
    &:hover {
        background: var(--theme-container-main-blue) !important;
        color: white;
    }
    &:active {
        background: var(--theme-container-main-blue) !important;
        color: white;
    }
    `}

  ${({disabled}) =>
        disabled &&
        `
    cursor: not-allowed;
    opacity: 0.7;
  `}
`;
