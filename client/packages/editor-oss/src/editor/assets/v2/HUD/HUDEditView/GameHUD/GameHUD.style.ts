import styled from "styled-components";

export const Grid = styled.div<{$fullWidth?: boolean}>`
    color: #fff;
    width: ${({$fullWidth}) => $fullWidth ? "100vw" : "calc(100vw - 240px)"};
    height: 100%;
    display: grid;
    grid-template-columns: minmax(160px, 1fr) 1.5fr minmax(160px, 1fr);
    align-items: start;
    justify-items: center;
    column-gap: 42px;
    padding: 40px 27px 14px;
    position: relative;
    z-index: 2;
    box-sizing: border-box;
    pointer-events: none;
    background: #1a1a1a;
`;

export const ButtonsColumn = styled.div<{$isCenter: boolean}>`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    row-gap: 24px;
    width: 100%;
    height: 100%;
    padding: 32px 0;
    pointer-events: none;
    position: relative;
    box-sizing: border-box;
    .bigButton {
        margin-bottom: 18px;
    }
`;

export const ButtonsRow = styled.div<{
    $gap?: string;
    $isColumn?: boolean;
    $justify?: string;
    $isWeapons?: boolean;
}>`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
    ${({$gap}) => $gap && `gap: ${$gap};`}
    ${({$isColumn}) => $isColumn && `flex-direction: column;`}
  ${({$justify}) => $justify && `justify-content: ${$justify};`}
  ${({$isWeapons}) =>
        $isWeapons &&
        `
    position: absolute;
    bottom: 75px;
    justify-content: flex-end;
    right: 0;
    width: 688px;
    max-width: 60vw;
  `}
`;
