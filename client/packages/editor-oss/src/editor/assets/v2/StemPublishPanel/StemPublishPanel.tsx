import {useRef, useState} from "react";

import {
    FloatingButton,
    Container,
    Config,
    Property,
    Label,
    Input,
    Heading,
    SharingHeading,
    ValidationError,
} from "./StemPublishPanel.style";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import {resolveAssetRevisionId} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import {useAuthorizationContext} from "@stem/editor-oss/context";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import Editor from "../../../../editor/Editor";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import {getVersionString, getItemStatus, STATUS_MAP} from "../AssetsLibrary/services";
import {Tooltip} from "../common";
import {PanelImageSection} from "../common/PanelImageSection/PanelImageSection";
import {StyledButton} from "../common/StyledButton";
import {StyledTextarea} from "../common/StyledTextarea";
import {AssetTagsInput} from "../common/Tags/AssetTagsInput";
import defaultStemIcon from "../icons/assetsTab/prefabs/prefab-placeholder.svg";
import editIcon from "../icons/edit-icon.svg";
import xIcon from "../icons/x-mark.svg";
import {PanelCheckbox} from "../RightPanel/common/PanelCheckbox";
import {TooltipRowWrapper} from "../RightPanel/panels/ProjectSettings/ProjectSettings.style";

const Version_Tooltip = "Current stem version is already released. Version cannot be changed.";

const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

const isValidSemver = (version: string): boolean => {
    return SEMVER_REGEX.test(version.trim());
};

export const StemPublishPanel = () => {
    const app = global.app as EngineRuntime;
    const editor = app.editor as Editor;
    const stem = editor.component!.state.stemPublishPanelData;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {dbUser, isCollaborator} = useAuthorizationContext();
    const {context} = useAssetResolutionContext();
    const revisionId = resolveAssetRevisionId(stem!.id, context) || stem!.headRevisionId;

    const [newThumbnail, setNewThumbnail] = useState<File>();
    const [name, setName] = useState(stem?.name || "");
    const [version, setVersion] = useState(getVersionString(stem?.latestRelease) ?? "0.0.1");
    const [versionTouched, setVersionTouched] = useState(false);
    const versionIsValid = isValidSemver(version);
    const [description, setDescription] = useState(stem?.description || "");
    const [allTags, setAllTags] = useState(stem?.tags || []);

    if (!stem) return;

    const isRealeased = stem?.latestRelease?.revisionId === revisionId;
    const status = getItemStatus(stem, dbUser, isCollaborator);
    const {icon, text} = STATUS_MAP[status];

    return (
        <Container>
            <PanelImageSection
                bgImg={newThumbnail ? URL.createObjectURL(newThumbnail) : stem?.thumbnailUrl || defaultStemIcon}
                isDefaultIcon={!stem?.thumbnailUrl}
            >
                <FloatingButton
                    className="reset-css"
                    onClick={e => {
                        e.stopPropagation();
                        editor.component?.closeStemPublishPanel();
                    }}
                >
                    <img src={xIcon}
                        alt="close"
                        className="xIcon"
                    />
                </FloatingButton>
                <FloatingButton
                    $bottom
                    className="reset-css"
                    onClick={e => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                    }}
                >
                    <img src={editIcon}
                        alt="edit stem thumbnail"
                        className="editIcon"
                    />
                </FloatingButton>

                {/* Hidden file input */}
                <input
                    type="file"
                    accept="image/*"
                    style={{display: "none"}}
                    ref={fileInputRef}
                    onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                            setNewThumbnail(file);
                        }
                    }}
                />
            </PanelImageSection>
            <Config>
                <Heading>
                    Stem Controls{" "}
                    <div className="version">
                        {stem?.latestRelease ? `${getVersionString(stem.latestRelease)}` : "0.0.1"}
                    </div>
                </Heading>
                <Property>
                    <TooltipRowWrapper style={{height: "auto", justifyContent: "flex-start"}}>
                        <Label>Version</Label>
                        {isRealeased && <Tooltip text={Version_Tooltip}
                            width="220px"
                            padding="8px 4px"
                                        />}
                    </TooltipRowWrapper>
                    <Input
                        value={version}
                        setValue={value => {
                            setVersion(value);
                            setVersionTouched(true);
                        }}
                        placeholder="0.0.1"
                        disabled={isRealeased}
                    />
                    {versionTouched && !versionIsValid && 
                        <ValidationError>Version must be numbers only in x.y.z format</ValidationError>
                    }
                </Property>
                <Property>
                    <Label>Name</Label>
                    <Input value={name || ""}
                        setValue={value => setName(value)}
                        placeholder="Enter stem name"
                    />
                </Property>
                <AssetTagsInput
                    tags={allTags}
                    onTagsAdded={setAllTags}
                    onTagDeleted={tag => setAllTags(prev => prev.filter(el => el !== tag))}
                />
                <Property>
                    <Label>Description</Label>
                    <StyledTextarea
                        value={description || ""}
                        setValue={value => setDescription(value)}
                        placeholder="Write a description..."
                        height="121px"
                    />
                </Property>
                <SharingHeading>
                    <img className="statusIcon"
                        src={icon}
                        alt={text}
                    /> Sharing Settings
                </SharingHeading>
                <PanelCheckbox
                    v2
                    isGray
                    regular
                    text="Allow users to Remix"
                    checked={false}
                    onChange={() => {}}
                    isLocked
                />
                <StyledButton
                    isBlue
                    margin="auto 0 0 0"
                    onClick={() => {
                        if (getVersionString(stem.latestRelease) === version && !isRealeased) {
                            showToast({type: "warning", title: "New version is not greater than the latest version"});
                            return;
                        }
                        editor.component!.openAssetPublishConfirmation({
                            asset: {
                                ...stem,
                                name,
                                description,
                                tags: allTags,
                            },
                            assetDefaultIcon: defaultStemIcon,
                            publishNotice:
                                "Once you publish this stem the community will be able to download it and use in their projects. if you toggled on allow remix they will be able to make new variants of your stem.",
                            newVersion: {
                                major: Number(version.split(".")[0]),
                                minor: Number(version.split(".")[1]),
                                patch: Number(version.split(".")[2]),
                            },
                            newThumbnailFile: newThumbnail,
                        });
                    }}
                >
                    Publish
                </StyledButton>
            </Config>
        </Container>
    );
};
