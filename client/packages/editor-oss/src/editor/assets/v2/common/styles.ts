import {css} from "styled-components";

/**
 * Standard modal/dialog container styles using theme variables.
 * Used by MissingTextureDialog, TextureVariantDialog, ImportProgress,
 * ImportSettingsChoice, RemixPickerModal, SceneDetailsPopup, and more.
 */
export const modalContainerStyles = css`
    background: var(--theme-dialog-bg);
    border-radius: var(--theme-dialog-border-radius);
    box-shadow: var(--theme-dialog-shadow);
    color: var(--theme-font-main-selected-color);
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

/**
 * Card hover lift effect with translateY and box-shadow transition.
 */
export const cardHoverStyles = css`
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
`;
