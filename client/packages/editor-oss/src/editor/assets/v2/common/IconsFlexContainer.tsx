import {debounce} from "lodash";
import React, {useCallback, useEffect, useState} from "react";
import styled from "styled-components";

import OutOfDateBadge from "./OutOfDateBadge";
import {Tooltip} from "./Tooltip";
import {flexCenter} from "../../../../assets/style";
import global from "@stem/editor-oss/global";
import historyIcon from "../AssetsLibrary/images/manage-history.svg";
import {confirmRevisionRollback} from "../AssetsLibrary/RevisionSection/RevisionList";
import deleteIcon from "../icons/delete-icon-new.svg";
import editIcon from "../icons/edit-icon.svg";

export interface IList {
    icon?: any;
    text: string;
    name: string;
    id?: string;
    revisionId?: string;
    headRevisionId?: string;
    disabled?: boolean;
    disabledTooltip?: string;
}

export interface ItemActionsArgs {
    id: string;
    name: string;
}

interface Props {
    list: IList[];
    onSelectItem: (item: IList) => void;
    disableSelection?: boolean;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent<HTMLDivElement>, item: IList) => void;
    assetWithRevision?: boolean;
    onAssetRevisionChange?: (assetId: string, revisionId: string) => void;
    onDelete?: (args: ItemActionsArgs) => void;
    onEdit?: (args: ItemActionsArgs) => void;
}

export const IconsFlexContainer = (props: Props) => {
    return (
        <IconsList>
            {props.list.map((item, index) => 
                <SingleIcon key={`${item.text}${index}`}
                    item={item}
                    props={props}
                />,
            )}
        </IconsList>
    );
};

const SingleIcon = ({item, props}: {item: IList; props: Props}) => {
    const [selected, setSelected] = useState<string[]>([]);
    const [hovered, setHovered] = useState(false);
    const {
        onSelectItem,
        disableSelection,
        draggable,
        onDragStart,
        assetWithRevision,
        onAssetRevisionChange,
        onDelete,
        onEdit,
    } = props;
    const {text, icon, name, disabled, disabledTooltip} = item;
    const indexOf = selected.indexOf(name);
    const currentIsSelected = indexOf !== -1;
    const editor = global.app?.editor;

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: IList) => {
        if (draggable && onDragStart) {
            onDragStart(e, item);
        }
    };

    const openRevisionPanel = (assetId: string, currentRevisionId: string) => {
        editor?.component?.openRevisionPopup({
            assetId,
            getLoadActions: ({revision, isCurrent, isOlderThanCurrent}) =>
                isCurrent
                    ? []
                    : [{
                        key: "load",
                        tooltip: isOlderThanCurrent ? "Roll back to this revision" : "Switch to this revision",
                        icon: "apply",
                        onClick: () => {
                            confirmRevisionRollback(revision, isOlderThanCurrent, () => {
                                onAssetRevisionChange?.(assetId, revision.id);
                                editor?.component?.updatePopupRevisionId(revision.id);
                            });
                        },
                    }],
            currentRevisionId,
            showDiffOption: false,
        });
    };

    const handleClick = useCallback(
        debounce((item: IList) => {
            const {name} = item;
            setSelected(prev => [...prev, name]);
            onSelectItem(item);
        }, 200),
        [],
    );

    useEffect(() => {
        return () => {
            handleClick.cancel();
        };
    }, [handleClick]);

    const revisionItemCondition = assetWithRevision && item.id && item.revisionId;

    const content =
        <SingleIconContainer
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => !disabled && handleClick(item)}
            draggable={!!draggable && !disabled}
            onDragStart={e => handleDragStart(e, item)}
            $disabled={disabled}
            data-testid={`icon-item-${(item.name ?? item.text ?? "").toLowerCase().replace(/\s+/g, "-")}`}
        >
            <IconWrapper>
                {icon && 
                    <IconImg
                        className={`${!disableSelection && currentIsSelected && "icon-img-selected"} icon-img`}
                        src={icon}
                        alt=""
                    />
                }
                {revisionItemCondition && item.headRevisionId !== item.revisionId && <OutOfDateBadge />}
                {hovered &&
                    <ItemMenu>
                        {revisionItemCondition &&
                            <Tooltip text="Version History"
                                height="auto"
                            >
                                <Icon className="reset-css"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        openRevisionPanel(item.id!, item.revisionId!);
                                    }}
                                >
                                    <img className="revisionsIcon"
                                        src={historyIcon}
                                        alt="see revisions"
                                    />
                                </Icon>
                            </Tooltip>
                        }
                        {onDelete &&
                            <Tooltip text="Delete"
                                height="auto"
                            >
                                <Icon className="reset-css"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onDelete({id: item.id!, name: item.name});
                                    }}
                                >
                                    <img className="deleteIcon"
                                        src={deleteIcon}
                                        alt="delete"
                                    />
                                </Icon>
                            </Tooltip>
                        }
                        {onEdit &&
                            <Tooltip text="Edit"
                                height="auto"
                            >
                                <Icon className="reset-css"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onEdit({id: item.id!, name: item.name});
                                    }}
                                >
                                    <img className="editIcon"
                                        src={editIcon}
                                        alt="edit"
                                    />
                                </Icon>
                            </Tooltip>
                        }
                    </ItemMenu>
                }
            </IconWrapper>
            <MainText
                className={`${!disableSelection && currentIsSelected && "icon-text-selected"} icon-text`}
                dangerouslySetInnerHTML={{__html: text}}
            />
        </SingleIconContainer>
    ;

    if (disabled && disabledTooltip) {
        return <Tooltip text={disabledTooltip}>{content}</Tooltip>;
    }

    return content;
};

const SingleIconContainer = styled.div<{$disabled?: boolean}>`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    row-gap: 8px;
    cursor: ${({$disabled}) => $disabled ? "not-allowed" : "pointer"};
    width: 108px;
    opacity: ${({$disabled}) => $disabled ? 0.5 : 1};

    &:hover {
        .icon-text {
            color: ${({$disabled}) => $disabled ? "var(--theme-font-unselected-color)" : "var(--theme-font-main-selected-color)"};
        }
        .icon-img {
            filter: ${({$disabled}) => $disabled ? "none" : "unset"};
        }
    }
`;

const IconWrapper = styled.div`
    background: var(--theme-editor-box-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease-in-out;
    width: 108px;
    height: 108px;
    border-radius: 8px;
    position: relative;

    &:hover > .icon-img {
        filter: brightness(0) invert(1);
        z-index: 11;
    }
`;

const ItemMenu = styled.div`
    ${flexCenter};
    gap: 8px;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 12;
    background-color: rgba(63, 63, 70, 0.85);
    font-size: var(--theme-font-size-s);
    padding: 6px;
    border-radius: 8px;
`;

const Icon = styled.button`
    height: 13px;
    ${flexCenter};
    img {
        width: auto;
        height: 13px;
    }
`;

// .icon-img
const IconImg = styled.img`
    width: auto;
    height: auto;
`;

// .icon-text
const MainText = styled.div`
    font-size: var(--theme-font-size-extra-small);
    line-height: 120%;
    font-weight: var(--theme-font-regular);
    color: var(--theme-font-unselected-color);
    text-align: center;
    transition: all 0.2s;
`;

const IconsList = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    justify-content: space-between;
    align-content: start;
    align-items: flex-start;
    box-sizing: border-box;
    row-gap: 6px;
    column-gap: 8px;
    width: 100%;
    padding-bottom: 12px;

    &::-webkit-scrollbar-track {
        border-radius: 0;
        background: var(--theme-container-secondary-dark);
    }

    &::-webkit-scrollbar-thumb {
        border-radius: 0px;
        background-color: var(--theme-scroll-list-thumb);
    }

    > div:nth-child(even) {
        margin-right: auto;
    }

    > div:nth-child(odd) {
        margin-left: auto;
    }
`;
