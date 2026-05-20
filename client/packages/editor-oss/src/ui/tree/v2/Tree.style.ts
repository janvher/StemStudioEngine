import styled from "styled-components";

import {flexCenter, regularFont} from "../../../assets/style";

export const TreeWrapV2 = styled.div`
    position: relative;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0;
    font-weight: var(--theme-font-regular);
`;

export const StyledList = styled.ul`
    height: 100%;
    list-style: none;
    min-width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    line-height: 18px;
    font-size: var(--theme-font-size-s);
    float: left;
    --icon-plus: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAJCAMAAADXT/YiAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpCNzY5QkUzNTgzNzVFOTExOEU2NkEzOTNDMkUxQ0UzNiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpGNjVEQzExQzc2NDYxMUU5OEMxN0UxQ0QyRDMwMjk0NyIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpGNjVEQzExQjc2NDYxMUU5OEMxN0UxQ0QyRDMwMjk0NyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M2IChXaW5kb3dzKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkI4NjlCRTM1ODM3NUU5MTE4RTY2QTM5M0MyRTFDRTM2IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkI3NjlCRTM1ODM3NUU5MTE4RTY2QTM5M0MyRTFDRTM2Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+GSEyxQAAAI1QTFRFCQsNxr6u39vSDhIWExgca4ehM0FNIyw1Q1Rla4egZYCZTmN11tHG2NPJKzdBZH6WPU5cX3iPSl5wWHCF9fXxFBofDREUUmd7z8i7VWyBRlhp6unjHCQqGSAmLTpF7e3nHygw5eHaXXaMJzE5CAoM0sy/5OHZ3NjP8PDswrio/f379/f1////AAAA////NGgXgAAAAC90Uk5T/////////////////////////////////////////////////////////////wBapTj3AAAAWUlEQVR42iTBBxKCQBAEwAExIYiIBFGScIFd9/7/POqKbrhjnBf18+Jw/e9OyIhIiPiOHzML2+mM90u88IubtYN8tCnRapNKopoDHipYPcD189hF1eI2AQYAwn4J7uCjPfoAAAAASUVORK5CYII=);
    --icon-minus: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAJCAMAAADXT/YiAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpCNzY5QkUzNTgzNzVFOTExOEU2NkEzOTNDMkUxQ0UzNiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDowRTM3OTM2RDc2NDcxMUU5OUYyREZCNzdBMzZGQTU0QSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDowRTM3OTM2Qzc2NDcxMUU5OUYyREZCNzdBMzZGQTU0QSIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M2IChXaW5kb3dzKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkI4NjlCRTM1ODM3NUU5MTE4RTY2QTM5M0MyRTFDRTM2IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkI3NjlCRTM1ODM3NUU5MTE4RTY2QTM5M0MyRTFDRTM2Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+7URHdgAAAHtQTFRFDxMW9fXxJC01KzdBJC42XHWLTWFzXHSLb4yoTWF0DhIWdJSw6unjVWt/KzhBNEFOVGt/xr6uz8i7dJOvNEJO5eHab42n39vSFRof7e3nHCMqY32W0sy/5OHZ3NjPPExaaoaf8PDs2NPJwrio/f379/f1AAAA////////MX4KXQAAACl0Uk5T/////////////////////////////////////////////////////wBS9CCHAAAATUlEQVR42iTBBRKAIAAEwLO7i1ZQlP+/0EF34ar84ElfOEzPb8d6feyMw3p6icCD29tCZFpTWkvF0EhljBEjQSqG0yvh9q6NGYF7BRgAle0Iqns528wAAAAASUVORK5CYII=);
    --icon-node: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAPCAMAAADjyg5GAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpCNzY5QkUzNTgzNzVFOTExOEU2NkEzOTNDMkUxQ0UzNiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo2MTQyNjRFRDc2NDYxMUU5QTdGRjlBOUM1MTgxQUEyNCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo2MTQyNjRFQzc2NDYxMUU5QTdGRjlBOUM1MTgxQUEyNCIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M2IChXaW5kb3dzKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkI4NjlCRTM1ODM3NUU5MTE4RTY2QTM5M0MyRTFDRTM2IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkI3NjlCRTM1ODM3NUU5MTE4RTY2QTM5M0MyRTFDRTM2Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+2JwdnQAAAUdQTFRF2tra39/f1tbWysrK49zf8vLy3d3dxsbG7OzstbCyz8/P4+Hiz8nMzc3NvL282NjYiIeI+/v78Ors4dvd4dvempaXyMjI1tPV8vDxwry/t7K0xMLD3Nzci4eJycnJ3NXY4uLi8/Pzd3d31tHTcW5vz87Pzs7O0s7QsbGx2dPW6OLl6efo9PPz8ertpqam493gu7u7x8fH4tvegn6A3dfZxcXFpqKjycPG29TX5N3gwcHB1M7R1c/R2dnZ9fT08PDwxsDDvr290NDQwcDA6eLl2tPW19fX0dDQ9u/yxb/C4eHh8Ons19HU7ufq1dXV9Ozvwbu+u7a4ysTG8/Hy29zb/Pz839jbsq2vgX1/5+bnx8HEpqGj0MrMrqiqvb293NbZmJiY8/LztrO0jIyM+ff4zs/O7u7u9O3w7ezt/f39/v7+////////roPGVgAAAG10Uk5T////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AC221EsAAADFSURBVHjaYsgBgqwcbmEhQSCVwwDkZeZwi3j46ORkg7lZOdpG6WHiIEkgNytH1dPfWspcAqw4KycjQiUg0MFGPgWoGshNNIvmjIpxddGyy8lmABoULBnEo2npyxOZkwUymdVd2YLFO14aZFR2GoMfn6O+rkmSEz9HNgMvKwO7RrIoS3iCgZu9HAObKSMDM6exrIAeF6MVE9AoNeYQ9VilOAVeQ0WQRTkyYqnOTBzsTEDngh2ZY8vGwBWK8EKOFyNYOAcgwADsYjo583VUugAAAABJRU5ErkJggg==);
    color: var(--theme-font-unselected-color);
    max-width: 100%;
    max-height: 100%;

    .drag {
        border: 1px dashed #999 !important;
    }
    .dragTop {
        border-top: 1px dashed #999 !important;
    }
    .dragBottom {
        border-bottom: 1px dashed #999 !important;
    }

    .dragging {
        opacity: 0.5;
    }
`;

export const ListItem = styled.li<{$selected: boolean}>`
    background: transparent;
    box-sizing: content-box;
    word-break: keep-all;
    text-overflow: ellipsis;
    white-space: nowrap;
    ${({$selected}) =>
        $selected &&
        `
    background: var(--theme-grey-bg);
    .text {
        color: #fff;
    }
    .itemIcon {
        filter: brightness(100);
    }
    `};
`;

export const ListItemContent = styled.span`
    padding: 7px 0 7px 33px;
    display: flex;
    align-items: center;
    pointer-events: none;
    position: relative;
    text-overflow: ellipsis;
    white-space: nowrap;

    img {
        vertical-align: middle;
        pointer-events: all;
    }

    .CheckBox {
        margin: 2px -2px 2px 4px;
        vertical-align: middle;
    }
`;

export const Line = styled.span<{$top?: boolean; $bottom?: boolean; $middle?: boolean}>`
    height: 10px;
    width: 1px;
    background: #52525b;
    position: absolute;
    left: 17px;
    ${({$top}) => $top && `top: 0;`};
    ${({$bottom}) => $bottom && `bottom: 0;`};
    ${({$middle}) =>
        $middle &&
        `    
        top: 50%;
        transform: translateY(-50%);
        height: 14px;
        `};
`;

export const ExpandItemButton = styled.span<{$open: boolean; $selected: boolean}>`
    width: 16px;
    height: 16px;
    border-radius: 4px;
    cursor: pointer;
    pointer-events: all;
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    border: 1px solid #5c5c5c;
    ${flexCenter};
    img {
        filter: brightness(10);
    }
    &:hover {
        border: 1px solid white;
    }

    ${({$open}) =>
        $open &&
        `
    transform: translateY(-50%) rotate(90deg);
    border: 1px solid white;
    `};

    ${({$selected}) =>
        $selected &&
        `
    border: 1px solid white;
    `};
`;

export const SelectedItemIconWrapper = styled.div<{
    $rightPosition: string;
    $selected: boolean;
}>`
    position: absolute;
    right: ${({$rightPosition}) => $rightPosition};
    top: 50%;
    transform: translateY(-25%);
    display: ${({$selected}) => ($selected ? "inline-block" : "none")};
`;

export const SelectedItemIcon = styled.img<{
    $rightPosition: string;
    $isLocked?: boolean;
    $selected: boolean;
    $disabledPrefab?: boolean;
}>`
    cursor: ${({$disabledPrefab}) => ($disabledPrefab ? "not-allowed" : "pointer")};
    position: absolute;
    right: ${({$rightPosition}) => $rightPosition};
    ${({$isLocked}) => $isLocked && `filter: brightness(100);`}
    display: ${({$selected}) => ($selected ? "inline-block" : "none")};
`;

export const TypeImgWrapper = styled.div`
    height: 100%;
    width: 10px;
    position: relative;
    margin-left: 1px;
`;

export const TypeImg = styled.img<{$selected: boolean; $emphasized: boolean; $isPrefab?: boolean}>`
    cursor: pointer;
    pointer-events: none;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.4);

    .behaviors {
        transform: translate(-50%, -50%) scale(0.9);
    }
    ${({$emphasized, $isPrefab}) => $emphasized && `transform: translate(-50%, -50%) scale(${$isPrefab ? 0.55 : 0.9})`};
    ${({$selected}) => $selected && `filter: brightness(100)`};
`;

export const Text = styled.a<{$selected: boolean; $noMaxWidth?: boolean}>`
    max-width: calc(100% - 110px);
    margin-left: 7px;
    color: #b4b0b0;
    text-decoration: none;
    display: inline-block;
    pointer-events: none;
    overflow: hidden;
    text-overflow: ellipsis;
    ${({$selected}) => $selected && `color: #fff`};
    ${({$noMaxWidth}) => $noMaxWidth && `max-width: unset`};
`;

export const SubList = styled.ul<{$collapse: boolean}>`
    margin: 0 0 0 24px;
    padding: 0;
    background: transparent;
    list-style: none;
    transition: all 0.2s;
    ${({$collapse}) =>
        $collapse &&
        ` height: 0 !important;
          overflow-y: hidden;
        `}
`;

export const RenameInput = styled.input`
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
    color: #f8fafc;
    border: none;
    background: transparent;
    outline: none;
    width: 135px;
    border-bottom: 1px solid #a3a3a3;
    padding-bottom: 4px;
    margin-bottom: -4px;
    margin-left: 7px;
`;
