import {ReactNode, useEffect, useState} from "react";
import {
    HiOutlineArrowDownTray,
    HiOutlineArrowsRightLeft,
    HiOutlineArrowUpTray,
    HiOutlineEye,
} from "react-icons/hi2";
import styled from "styled-components";

import {AssetRevision} from "@stem/network/api/asset";
import {flexCenter, regularFont} from "../../../../../assets/style";
import {useAuthorizationContext} from "@stem/editor-oss/context";
import {IEditorUser} from "../../../../../v2/pages/types";
import {Avatar} from "../../Avatar/Avatar";
import {Tooltip} from "../../common/Tooltip";

/** Icon names supported by revision row actions. */
export type RevisionActionIcon = "apply" | "open" | "publish" | "diff";

const ICONS: Record<RevisionActionIcon, ReactNode> = {
    apply: <HiOutlineArrowDownTray size={16} />,
    open: <HiOutlineEye size={16} />,
    publish: <HiOutlineArrowUpTray size={16} />,
    diff: <HiOutlineArrowsRightLeft size={16} />,
};

/**
 * A single action button rendered on a revision row. Callers (and the
 * built-in Publish/Diff handlers in {@link RevisionList}) build these to
 * declare what a user can do with a given revision.
 */
export type RevisionAction = {
    key: string;
    /** Tooltip text shown on hover. Required since the button has no visible label. */
    tooltip: string;
    icon: RevisionActionIcon;
    onClick: (event: React.MouseEvent) => void;
};

type RevisionItemProps = {
    revision: AssetRevision;
    isCurrentRevision?: boolean;
    /**
     * True when this row is the revision the scene is currently running, AND
     * that revision is distinct from the editor's current view. Only meaningful
     * for the inline-Behavior-Creator context where the editor and the scene
     * can diverge; the popup contexts leave this unset.
     */
    isSceneRevision?: boolean;
    showPublishButton?: boolean;
    onDiffClick?: (event: React.MouseEvent) => void;
    onPublishClick?: (event: React.MouseEvent) => void;
    showDiffOption?: boolean;
    /** Caller-supplied actions (e.g. "Load", "Open in editor"). */
    loadActions?: RevisionAction[];
};

export const RevisionItem = ({
    revision,
    isCurrentRevision,
    isSceneRevision,
    showPublishButton,
    onDiffClick,
    onPublishClick,
    showDiffOption,
    loadActions,
}: RevisionItemProps) => {
    const createTime = new Date(revision.createTime);
    const {getUser} = useAuthorizationContext();
    const [author, setAuthor] = useState<IEditorUser>();

    useEffect(() => {
        const getOwner = async () => {
            if (revision.userId) {
                const response = await getUser(revision.userId);
                if (response) {
                    setAuthor(response);
                }
            }
        };

        getOwner().catch(console.error);
    }, []);

    return (
        <ItemContainer $current={isCurrentRevision}>
            <Header>
                <Timestamp>{createTime.toLocaleString()}</Timestamp>
                <ButtonContainer>
                    {loadActions?.map(action =>
                        <Tooltip key={action.key}
                            text={action.tooltip}
                            height="auto"
                        >
                            <IconBtn onClick={action.onClick}
                                aria-label={action.tooltip}
                            >
                                {ICONS[action.icon]}
                            </IconBtn>
                        </Tooltip>,
                    )}
                    {showPublishButton &&
                        <Tooltip text="Publish revision"
                            height="auto"
                        >
                            <IconBtn onClick={onPublishClick}
                                aria-label="Publish revision"
                            >
                                {ICONS.publish}
                            </IconBtn>
                        </Tooltip>
                    }
                    {!isCurrentRevision && showDiffOption &&
                        <Tooltip text="Compare with current"
                            height="auto"
                        >
                            <IconBtn onClick={onDiffClick}
                                aria-label="Compare with current"
                            >
                                {ICONS.diff}
                            </IconBtn>
                        </Tooltip>
                    }
                </ButtonContainer>
            </Header>
            {!!revision.description?.trim() && <Label style={{marginBottom: "4px"}}>{revision.description}</Label>}
            <Label>
                {author && 
                    <>
                        <Avatar name={author?.username || author?.name}
                            image={author?.avatar}
                            size={18}
                        />
                        {author?.username || author?.name}
                    </>
                }
                {isCurrentRevision && ` (Current)`}
                {isSceneRevision && ` (Scene)`}
                {revision.release && 
                    <Version>
                        {revision.release.versionMajor}.{revision.release.versionMinor}.{revision.release.versionPatch}
                    </Version>
                }
            </Label>
        </ItemContainer>
    );
};

const ItemContainer = styled.div<{$current?: boolean}>`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 12px;
    background-color: ${({$current}) => $current ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.01)"};
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
        background-color: rgba(255, 255, 255, 0.05);
    }
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const Timestamp = styled.span`
    ${regularFont("s")};
`;

const Label = styled.label`
    ${flexCenter};
    justify-content: flex-start;
    column-gap: 4px;
    ${regularFont("s")};
    color: #a1a1aa;
`;

export const Description = styled.div`
    ${flexCenter};
    justify-content: flex-start;
    column-gap: 4px;
    font-size: var(--theme-font-size-extra-small);
    color: #a1a1aa;
    line-height: 120%;
    margin-bottom: 4px;
`;

const Version = styled.label`
    justify-content: flex-end;
    column-gap: 4px;
    ${regularFont("s")};
    color: #a1a1aa;
`;

const ButtonContainer = styled.div`
    display: flex;
    flex-direction: row;
    gap: 4px;
`;

const IconBtn = styled.button`
    ${flexCenter};
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.1);
    color: var(--theme-font-main-selected-color);
    transition: filter 0.15s;

    &:hover {
        filter: brightness(1.4);
    }
`;
