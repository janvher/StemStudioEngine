import {useEffect, useRef} from "react";
import {ClipLoader} from "react-spinners";

import {MobileBuilds} from "./MobileBuilds";
import {CopyURLContainer, Description, Heading, MainHeading, PostPublishHeading, PublishPanelContainer} from "./style";
import {useAppGlobalContext, useAuthorizationContext} from "@stem/editor-oss/context";
import {showToast} from "@stem/editor-oss/showToast";
import {truncateName} from "../../../../../../../v2/pages/services";
import {Overlay} from "../../../../common/AppMenu/AppMenu.style";
import {StyledButton} from "../../../../common/StyledButton";
import {StyledSwitch} from "../../../../common/StyledSwitch";
import checkedIcon from "../../../icons/checked.svg";
import copyIcon from "../../../icons/copy.svg";
import closeIcon from "../../../icons/x.svg";
import {SelectionOfButtons} from "../../SelectionOfButtons";
import {Separator} from "../../Separator";
import {PublishAction} from "../TopMenu";

interface Props {
    handleSettingsSave: (action?: PublishAction) => void;
    closePanel: () => void;
    isPublic: boolean;
    isCloneable: boolean;
    isPublished: boolean;
    isAssetPack: boolean;
    isTopPick: boolean;
    setIsPublic: React.Dispatch<React.SetStateAction<boolean>>;
    setIsCloneable: React.Dispatch<React.SetStateAction<boolean>>;
    setIsAssetPack: React.Dispatch<React.SetStateAction<boolean>>;
    setIsTopPick: React.Dispatch<React.SetStateAction<boolean>>;
    /** The asset revision id pinned as the publicly playable revision. */
    publishRevisionId: string;
    /** The asset revision id currently loaded in the editor. */
    sceneRevisionId: string | null;
    /** True when at least one panel toggle differs from the editor's persisted state. */
    canUpdate: boolean;
    /** True when the saved head revision differs from the pinned publish revision. */
    canRepublish: boolean;
    isLoading: boolean;
    canSave: boolean;
}

export const PublishPanel = ({
    handleSettingsSave,
    closePanel,
    isPublic,
    isCloneable,
    setIsPublic,
    setIsCloneable,
    isPublished,
    publishRevisionId,
    sceneRevisionId,
    canUpdate,
    canRepublish,
    isLoading,
    canSave,
    isAssetPack,
    setIsAssetPack,
    isTopPick,
    setIsTopPick,
}: Props) => {
    // True when the scene has been saved since it was last published, i.e.
    // players are still seeing an older revision than what's in the editor.
    // Only meaningful when the scene was published via the new flow (so we
    // have a publishRevisionId to compare against).
    const hasUnpublishedChanges =
        isPublished
        && publishRevisionId !== ""
        && sceneRevisionId !== null
        && publishRevisionId !== sceneRevisionId;
    const panelRef = useRef<HTMLDivElement>(null);
    const {publishedURL} = useAppGlobalContext();
    const {isAdmin} = useAuthorizationContext();

    useEffect(() => {
        if (panelRef.current) {
            const handleClickOutside = (event: MouseEvent) => {
                if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                    closePanel();
                }
            };

            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [panelRef, closePanel]);

    return (
        <PublishPanelContainer ref={panelRef}>
            {isLoading && (
                <Overlay>
                    <ClipLoader
                        loading
                        size={40}
                        color="#0284c7"
                        aria-label="Loading Spinner"
                    />
                </Overlay>
            )}
            <MainHeading>
                <div className="label">Settings</div>
                <button
                    className="reset-css"
                    onClick={closePanel}
                >
                    <img
                        src={closeIcon}
                        alt="close"
                    />
                </button>
            </MainHeading>
            <Separator />
            {isPublished && (
                <>
                    <PostPublishHeading>
                        <img
                            src={checkedIcon}
                            alt=""
                        />
                        <Heading>
                            <div className="label">Your game is live!</div>
                        </Heading>
                    </PostPublishHeading>
                    <Description>
                        Your game is publicly playable. Copy the direct link below to share with friends!
                    </Description>
                    <CopyURLContainer>
                        <div className="url">{truncateName(publishedURL, 27)}</div>
                        <StyledButton
                            isGrey
                            width="auto"
                            onClick={() => {
                                navigator.clipboard.writeText(publishedURL);
                                showToast({type: "success", title: "Copied to clipboard!"});
                            }}
                            className="regularWeight"
                        >
                            <img
                                src={copyIcon}
                                alt=""
                            />
                        </StyledButton>
                    </CopyURLContainer>
                    {hasUnpublishedChanges && (
                        <>
                            <Separator />
                            <Heading>
                                <div className="label">Unpublished changes</div>
                            </Heading>
                            <Description>
                                You&apos;ve saved changes since this scene was last published. Players are still
                                seeing the previously published version. Click <strong>Republish</strong> to push
                                your latest changes live.
                            </Description>
                        </>
                    )}
                    <Separator />
                </>
            )}
            {isAdmin && (
                <>
                    <Heading>
                        <div className="label">Is an Asset Pack?</div>
                        <StyledSwitch
                            checked={isAssetPack}
                            onChange={() => setIsAssetPack(prev => !prev)}
                        />
                    </Heading>
                    <Description>
                        Make your game visible in libraries as an Asset Pack. All assets in that scene will be
                        published.
                    </Description>
                    <Separator />
                    <Heading>
                        <div className="label">Is a Top Pick?</div>
                        <StyledSwitch
                            checked={isTopPick}
                            onChange={() => setIsTopPick(prev => !prev)}
                        />
                    </Heading>
                    <Description>Make your game appear in the Top Picks section on the dashboard.</Description>
                    <Separator />
                </>
            )}
            <Heading>
                <div className="label">Is public?</div>
                <StyledSwitch
                    checked={isPublic}
                    onChange={() => setIsPublic(!isPublic)}
                />
            </Heading>
            <Description>
                Let others open your game in the editor in read-only mode to inspect how it was built
            </Description>
            <Separator />
            <Heading>
                <div className="label">Allow remixing?</div>
                <StyledSwitch
                    checked={isCloneable}
                    onChange={() => setIsCloneable(!isCloneable)}
                />
            </Heading>
            <Description>Allow others to remix this project and make it their own</Description>
            <Separator margin="12px auto 8px" />
            {isPublished ? (
                <SelectionOfButtons>
                    <StyledButton
                        isGreySecondary
                        onClick={() => canSave && handleSettingsSave("unpublish")}
                        disabled={!canSave}
                        width="auto"
                        height="32px !important"
                    >
                        <span>Unpublish</span>
                    </StyledButton>
                    <StyledButton
                        disabled={!canSave || !canUpdate}
                        isGreySecondary
                        onClick={() => canSave && canUpdate && handleSettingsSave()}
                        width="auto"
                        height="32px !important"
                    >
                        <span>Update</span>
                    </StyledButton>
                    <StyledButton
                        disabled={!canSave || !canRepublish}
                        isBlue
                        onClick={() => canSave && canRepublish && handleSettingsSave("republish")}
                        width="auto"
                        height="32px !important"
                    >
                        <span>Republish</span>
                    </StyledButton>
                </SelectionOfButtons>
            ) : (
                <StyledButton
                    disabled={!canSave}
                    isBlue
                    onClick={() => {
                        handleSettingsSave("publish");
                    }}
                    height="32px !important"
                >
                    <span>Publish</span>
                </StyledButton>
            )}
            <MobileBuilds />
        </PublishPanelContainer>
    );
};
