import {Fragment, useCallback, useEffect, useState} from "react";
import {HiOutlineArrowUpTray} from "react-icons/hi2";
import styled from "styled-components";

import {ExpandButton, Row, RowTitle, ScrollContainer} from "./AssetsRows.style";
import {selectFile} from "./helpers";
import arrowDown from "./icons/arrow-down.svg";
import {AssetType as NEW_API_ASSET_TYPE} from "@stem/network/api/asset";
import {getParticlesList} from "@stem/network/api/particle";
import {flexCenter} from "../../../../../../../assets/style";
import {useAssetsTabContext, useAuthorizationContext, useModelsTabContext} from "@stem/editor-oss/context";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import {
    importBehaviorFile,
    importLambdaFile,
} from "../../../../../../../editor/assets/v2/AssetsLibrary/exportImportUtils";
import {UPLOAD_FILE_TYPE} from "../../../../../../../editor/assets/v2/AssetsLibrary/UploadView/UploadView";
import {useImportStem} from "../../../../../../../editor/prefabs/hooks/exportImportStem";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import {isScriptsEnabled} from "@stem/editor-oss/utils/featureFlags";
import {createAsset, useListEditorAssets} from "../../../../../../asset-management/hooks/assets";
import {createBehavior} from "../../../../../../behaviors/util";
import {useCreateLambda} from "../../../../../../lambdas/hooks/lambdas";
import {updateLambdaRegistries} from "../../../../../../lambdas/util";
import {useCreateScript} from "../../../../../../scripts/hooks/scripts";
import {useImportFromFile} from "../../../../../../scripts/hooks/useImportFromFile";
import {AddImportMenu} from "../../../../common/AddImportMenu/AddImportMenu";
import {ImportPacksPicker} from "../../../../common/AddImportMenu/ImportPacksPicker";
import {GenerateWithAIBox} from "../../../../common/GenerateWithAIBox/GenerateWithAIBox";
import {SearchInput} from "../../../../common/SearchInput";
import {Tooltip} from "../../../../common/Tooltip";
import {UploadButton} from "../../../../common/UploadButton";
import {Separator} from "../../../../RightPanel/common/Separator";
import {TopContainer} from "../AssetsTab.style";
import {AiNpcsTab} from "../SubTabs/AiNpcsTab";
import {BehaviorsTab} from "../SubTabs/BehaviorsTab/BehaviorsTab";
import {FilesTab} from "../SubTabs/FilesTab";
import {useAudioUploader} from "../SubTabs/hooks/useAudioUploader";
import {useImageUploader} from "../SubTabs/hooks/useImageUploader";
import {useVideoUploader} from "../SubTabs/hooks/useVideoUploader";
import {ImagesTab} from "../SubTabs/ImagesTab";
import {LambdasTab} from "../SubTabs/LambdasTab/LambdasTab";
import {MiscTab} from "../SubTabs/MiscTab";
import {ModelsTab} from "../SubTabs/ModelsTab";
import {ParticleEffectsTab} from "../SubTabs/ParticleEffectsTab";
import {PrimitivesTab} from "../SubTabs/PrimitivesTab";
import {ScriptsTab} from "../SubTabs/ScriptsTab";
import {SoundsTab} from "../SubTabs/SoundsTab";
import {StemsTab} from "../SubTabs/StemsTab";
import {VideosTab} from "../SubTabs/VideosTab";

const ImportButton = styled.div.attrs({role: "button"})`
    width: 24px;
    height: 24px;
    ${flexCenter};
    border-radius: 8px;
    cursor: pointer;
    color: #a1a1aa;
    transition: color 0.2s;
    &:hover {
        color: #fff;
    }
`;

export enum PANEL_TYPES {
    PRIMITIVES = "Primitives",
    MODELS = "Models",
    BEHAVIORS = "Behaviors",
    LAMBDAS = "Lambdas",
    SCRIPTS = "Scripts",
    TOOLS = "Tools",
    PREFABS = "Stems",
    PARTICLE_EFFECTS = "Particle Effects",
    AI_NPCS = "AI NPCs",
    SOUNDS = "Sounds",
    IMAGES = "Images",
    VIDEOS = "Videos",
    FILES = "Files",
}

export const AssetsRows = () => {
    const app = global.app;
    const editor = app?.editor;
    const sceneID = editor?.sceneID || undefined;
    const {audioDataForSceneID} = useAssetsTabContext();
    const {modelsForScene} = useModelsTabContext();
    const {data: sceneAssets} = useListEditorAssets({
        types: [
            NEW_API_ASSET_TYPE.Behavior,
            NEW_API_ASSET_TYPE.Prefab,
            NEW_API_ASSET_TYPE.Lambda,
            ...(isScriptsEnabled() ? [NEW_API_ASSET_TYPE.Script] : []),
        ],
        includeThumbnails: true,
        includeLatestRelease: true,
    });
    const {uploadImage} = useImageUploader();
    const {uploadAudio} = useAudioUploader();
    const {uploadVideo} = useVideoUploader();
    const {setAssetRevision} = useAssetResolutionContext();
    const {isAdmin, dbUser} = useAuthorizationContext();
    const createLambda = useCreateLambda();
    const importStem = useImportStem();

    const [search, setSearch] = useState("");
    const [expandedPanels, setExpandedPanels] = useState<PANEL_TYPES[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [particles, setParticles] = useState<any[]>([]);
    const [importMenuAnchor, setImportMenuAnchor] = useState<DOMRect | null>(null);
    const [showPacksPicker, setShowPacksPicker] = useState(false);
    const importFromFile = useImportFromFile();
    const createImport = useCreateScript();


    useEffect(() => {
        const handleFetchParticles = async () => {
            const particles = await getParticlesList();
            setParticles(particles);
        };
        handleFetchParticles().catch(console.error);
    }, []);

    useEffect(() => {
        if (!editor) return;

        const data: any[] = [
            ...(modelsForScene || []),
            ...(audioDataForSceneID || []),
            ...(sceneAssets?.assets || []),
            ...(particles || []),
        ];

        editor.assetsCount = data.length;
    }, [modelsForScene, audioDataForSceneID, sceneAssets, particles, editor]);

    useEffect(() => {
        if (!sceneID) return setExpandedPanels([PANEL_TYPES.PRIMITIVES]);

        const savedPanels = localStorage.getItem(`expandedPanels_${sceneID}`);
        if (savedPanels) {
            setExpandedPanels(JSON.parse(savedPanels));
        } else {
            setExpandedPanels([PANEL_TYPES.PRIMITIVES]);
        }
        setIsLoaded(true);
    }, [sceneID]);

    useEffect(() => {
        if (!sceneID || !isLoaded) return;
        localStorage.setItem(`expandedPanels_${sceneID}`, JSON.stringify(expandedPanels));
    }, [expandedPanels, sceneID]);

    const handleImportButton = useCallback(
        (e: React.MouseEvent, label: PANEL_TYPES) => {
            e.stopPropagation();
            if (label === PANEL_TYPES.BEHAVIORS) {
                selectFile({
                    accept: ".yaml,.yml",
                    multiple: true,
                    onFileSelected: async (file: File) => {
                        try {
                            const {config, code} = await importBehaviorFile(file);

                            // Check for duplicate by name or id
                            const behaviorAssets =
                                sceneAssets?.assets?.filter(a => a.type === NEW_API_ASSET_TYPE.Behavior) || [];
                            const duplicate = behaviorAssets.find(b => b.name === config.name || b.id === config.id);
                            if (duplicate) {
                                const proceed = window.confirm(
                                    `A behavior "${duplicate.name}" (${duplicate.id}) already exists in this scene. Import as duplicate?`,
                                );
                                if (!proceed) return;
                            }

                            await createBehavior({
                                assetSource: global.app?.editor?.assetSource,
                                name: config.name,
                                code,
                                config,
                            });

                            showToast({type: "success", title: `Behavior "${config.name}" imported`});
                        } catch (err: any) {
                            showToast({type: "error", title: err.message || "Failed to import behavior"});
                        }
                    },
                });
            } else if (label === PANEL_TYPES.LAMBDAS) {
                selectFile({
                    accept: ".yaml,.yml",
                    multiple: true,
                    onFileSelected: async (file: File) => {
                        try {
                            const {config, code} = await importLambdaFile(file, dbUser?.username);

                            // Check for duplicate by name or id
                            const lambdaAssets =
                                sceneAssets?.assets?.filter(a => a.type === NEW_API_ASSET_TYPE.Lambda) || [];
                            const duplicate = lambdaAssets.find(a => a.name === config.name);
                            if (duplicate) {
                                const proceed = window.confirm(
                                    `A lambda "${duplicate.name}" already exists in this scene. Import as duplicate?`,
                                );
                                if (!proceed) return;
                            }

                            const newLambda = await createLambda({
                                name: config.name,
                                config: JSON.stringify(config),
                                code,
                            });

                            // Register in local registry so the dropdown updates immediately.
                            updateLambdaRegistries({
                                lambdaId: config.id,
                                config,
                                assetMeta: {assetId: newLambda.id, revisionId: newLambda.headRevisionId},
                            });

                            showToast({type: "success", title: `Lambda "${config.name}" imported`});
                        } catch (err: any) {
                            showToast({type: "error", title: err.message || "Failed to import lambda"});
                        }
                    },
                });
            } else if (label === PANEL_TYPES.PREFABS) {
                selectFile({
                    accept: ".yaml,.yml",
                    multiple: true,
                    onFileSelected: async (file: File) => {
                        try {
                            await importStem(file);
                        } catch (err: any) {
                            showToast({type: "error", title: err.message || "Failed to import stem"});
                        }
                    },
                });
            }
        },
        [sceneID, createBehavior, createLambda, importStem, sceneAssets, editor, app, dbUser?.username],
    );

    const shouldRenderImportButton = (label: PANEL_TYPES) => {
        return label === PANEL_TYPES.BEHAVIORS || label === PANEL_TYPES.LAMBDAS || label === PANEL_TYPES.PREFABS;
    };

    const shouldRenderUploadButton = (label: PANEL_TYPES) => {
        return (
            label === PANEL_TYPES.SOUNDS ||
            label === PANEL_TYPES.MODELS ||
            label === PANEL_TYPES.BEHAVIORS ||
            label === PANEL_TYPES.SCRIPTS ||
            label === PANEL_TYPES.AI_NPCS ||
            label === PANEL_TYPES.IMAGES ||
            label === PANEL_TYPES.PARTICLE_EFFECTS ||
            label === PANEL_TYPES.LAMBDAS ||
            label === PANEL_TYPES.FILES ||
            (label === PANEL_TYPES.VIDEOS && isAdmin)
        );
    };

    const handleUploadButton = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, label: PANEL_TYPES) => {
        e.stopPropagation();
        switch (label) {
            case PANEL_TYPES.SOUNDS: {
                selectFile({
                    accept: ".mp3,.ogg,.m4a,.wav",
                    onFileSelected: async (file: File) => {
                        try {
                            await uploadAudio(file);
                        } catch (err) {
                            console.error("Upload failed:", err);
                        }
                    },
                });
                break;
            }

            case PANEL_TYPES.IMAGES: {
                selectFile({
                    accept: ".jpeg,.png",
                    onFileSelected: async (file: File) => {
                        await uploadImage(file);
                    },
                });
                break;
            }

            case PANEL_TYPES.VIDEOS:
                selectFile({
                    accept: "video/mp4,video/webm,video/quicktime",
                    onFileSelected: async (file: File) => {
                        try {
                            await uploadVideo(file);
                        } catch (err) {
                            console.error("Upload failed:", err);
                        }
                    },
                });
                break;

            case PANEL_TYPES.MODELS:
                app?.editor?.handleUploadView(true, true, UPLOAD_FILE_TYPE.MODEL);
                break;
            case PANEL_TYPES.BEHAVIORS:
                app?.editor?.component?.openCodeEditor({kind: "behavior", id: "", createKind: "behavior"});
                break;
            case PANEL_TYPES.AI_NPCS:
                app?.editor?.component?.openAiNpcCreator();
                break;
            case PANEL_TYPES.PARTICLE_EFFECTS:
                app?.editor?.handleUploadView(true, false, UPLOAD_FILE_TYPE.PARTICLE_EFFECT);
                break;
            case PANEL_TYPES.LAMBDAS:
                app?.editor?.component?.openCodeEditor({kind: "lambda", id: "", createKind: "lambda"});
                break;
            case PANEL_TYPES.SCRIPTS: {
                const target = e.currentTarget as HTMLElement;
                setImportMenuAnchor(target.getBoundingClientRect());
                break;
            }
            case PANEL_TYPES.FILES:
                selectFile({
                    accept: "*/*",
                    multiple: true,
                    onFileSelected: async (file: File) => {
                        const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
                        try {
                            app?.call("fileUploadStarted", null, {id: uploadId, name: file.name});
                            const format = file.name.split(".").pop()?.toLowerCase() || "bin";
                            const contentType = file.type || "application/octet-stream";
                            const asset = await createAsset({
                                assetSource: app?.editor?.assetSource,
                                type: NEW_API_ASSET_TYPE.File,
                                name: file.name,
                                data: file,
                                format,
                                contentType,
                            });
                            setAssetRevision(asset.id, asset.headRevisionId);
                            showToast({type: "success", title: `Uploaded ${file.name}`});
                        } catch (err) {
                            console.error("Upload failed:", err);
                            showToast({type: "error", title: `Failed to upload ${file.name}`});
                        } finally {
                            app?.call("fileUploadFinished", null, {id: uploadId});
                        }
                    },
                });
                break;

            default:
                break;
        }
    };

    const togglePanel = (label: PANEL_TYPES) => {
        setExpandedPanels(prev => (prev.includes(label) ? prev.filter(panel => panel !== label) : [...prev, label]));
    };

    const checkIfSticky = (rowElement: HTMLElement | null, scrollContainer: HTMLElement | null) => {
        if (!rowElement || !scrollContainer) return false;

        const rowRect = rowElement.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        return rowRect.top <= containerRect.top;
    };

    const handleRowOnClick = (rowId: string, label: PANEL_TYPES, rowStickyPosition: number) => {
        const rowElement = document.getElementById(rowId);
        const scrollContainer = document.getElementById("scrollContainer");

        if (
            rowElement &&
            scrollContainer &&
            checkIfSticky(rowElement, scrollContainer) &&
            !expandedPanels.includes(label)
        ) {
            const rowTop = rowElement.offsetTop;

            scrollContainer.scrollTo({
                top: rowTop - (rowStickyPosition + 40),
                behavior: "smooth",
            });
        }
        togglePanel(label);
    };

    useEffect(() => {
        if (expandedPanels.length === 0 && !!search) {
            setExpandedPanels(Object.values(PANEL_TYPES));
        }
    }, [expandedPanels, search]);

    return (
        <>
            <TopContainer
                style={{border: "none"}}
                $searchActive={!!search}
            >
                <SearchInput
                    width="224px"
                    placeholder="Search"
                    onChange={setSearch}
                    value={search}
                    alwaysOpen
                />
                {!!search && (
                    <GenerateWithAIBox
                        addToProject
                        sceneID={sceneID}
                    />
                )}
            </TopContainer>
            <ScrollContainer
                className="hidden-scroll"
                id="scrollContainer"
                $searchActive={!!search}
            >
                {Object.values(PANEL_TYPES)
                    .filter(label => isScriptsEnabled() || label !== PANEL_TYPES.SCRIPTS)
                    .map((label, index) => {
                    const rowId = `row-${label}`;
                    const rowStickyPosition = index * 41;
                    return (
                        <Fragment key={label}>
                            <Row
                                onClick={() => handleRowOnClick(rowId, label, rowStickyPosition)}
                                $stickyTop={rowStickyPosition}
                            >
                                <RowTitle>{label}</RowTitle>
                                <div className="rightButtons">
                                    {shouldRenderImportButton(label) && (
                                        <Tooltip
                                            text="Import"
                                            height="auto"
                                        >
                                            <ImportButton
                                                aria-label={`Import ${label}`}
                                                onClick={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) =>
                                                    handleImportButton(e, label)
                                                }
                                            >
                                                <HiOutlineArrowUpTray
                                                    width={16}
                                                    height={16}
                                                />
                                            </ImportButton>
                                        </Tooltip>
                                    )}
                                    {shouldRenderUploadButton(label) && (
                                        <Tooltip
                                            text="Add New"
                                            height="auto"
                                        >
                                            <UploadButton
                                                aria-label={`Add New ${label}`}
                                                onClick={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) =>
                                                    handleUploadButton(e, label)
                                                }
                                            />
                                        </Tooltip>
                                    )}
                                    <ExpandButton
                                        className="reset-css"
                                        $expanded={expandedPanels.includes(label)}
                                    >
                                        <img
                                            src={arrowDown}
                                            alt="show more"
                                        />
                                    </ExpandButton>
                                </div>
                            </Row>
                            <Content
                                containerId={rowId}
                                panelType={expandedPanels.includes(label) ? label : null}
                                search={search}
                                sceneAssets={sceneAssets?.assets}
                            />
                            <Separator
                                margin="0"
                                width="100%"
                                // style={{
                                //     position: "sticky",
                                //     top: rowStickyPosition + 40,
                                //     zIndex: 3,
                                // }}
                            />
                        </Fragment>
                    );
                })}
            </ScrollContainer>

            <AddImportMenu
                anchor={importMenuAnchor}
                onClose={() => setImportMenuAnchor(null)}
                onBrowsePacks={() => setShowPacksPicker(true)}
                onUploadFile={() => {
                    selectFile({
                        accept: ".js,.mjs,.cjs,.yaml,.yml",
                        onFileSelected: async (file) => {
                            await importFromFile(file, sceneID);
                        },
                    });
                }}
                onNewEmpty={() => {
                    app?.editor?.component?.openCodeEditor({
                        kind: "script",
                        id: "",
                        createKind: "import" as "script",
                    });
                }}
            />

            <ImportPacksPicker
                open={showPacksPicker}
                onClose={() => setShowPacksPicker(false)}
                existingPackNames={
                    sceneAssets?.assets
                        ?.filter(a => a.type === NEW_API_ASSET_TYPE.Script)
                        .map(a => a.name) ?? []
                }
                onAddPack={async (pack) => {
                    await createImport({
                        sceneId: sceneID,
                        name: pack.name,
                        code: pack.code,
                    });
                }}
            />
        </>
    );
};

interface ContentProps {
    panelType: PANEL_TYPES | null;
    search: string;
    containerId: string;
    sceneAssets?: import("@stem/network/api/asset").Asset[];
}

const Content = ({panelType, search, containerId, sceneAssets}: ContentProps) => {
    // Filter assets by type to pass to individual tabs
    const behaviorAssets = sceneAssets?.filter(a => a.type === NEW_API_ASSET_TYPE.Behavior);
    const lambdaAssets = sceneAssets?.filter(a => a.type === NEW_API_ASSET_TYPE.Lambda);
    const importAssets = sceneAssets?.filter(a => a.type === NEW_API_ASSET_TYPE.Script);
    const stemAssets = sceneAssets?.filter(a => a.type === NEW_API_ASSET_TYPE.Prefab);

    return (
        <>
            <div
                id={containerId}
                style={{position: "relative", zIndex: 1}}
            >
                {panelType === PANEL_TYPES.PRIMITIVES && <PrimitivesTab search={search} />}
                {panelType === PANEL_TYPES.MODELS && <ModelsTab search={search} />}
                {panelType === PANEL_TYPES.BEHAVIORS && (
                    <BehaviorsTab
                        search={search}
                        assets={behaviorAssets}
                    />
                )}
                <MiscTab
                    search={search}
                    isOpen={panelType === PANEL_TYPES.TOOLS}
                />
                {panelType === PANEL_TYPES.PREFABS && (
                    <StemsTab
                        search={search}
                        assets={stemAssets}
                    />
                )}
                {panelType === PANEL_TYPES.PARTICLE_EFFECTS && <ParticleEffectsTab search={search} />}
                {panelType === PANEL_TYPES.AI_NPCS && <AiNpcsTab search={search} />}
                {panelType === PANEL_TYPES.SOUNDS && <SoundsTab search={search} />}
                {panelType === PANEL_TYPES.IMAGES && <ImagesTab search={search} />}
                {panelType === PANEL_TYPES.VIDEOS && <VideosTab search={search} />}
                {panelType === PANEL_TYPES.FILES && <FilesTab search={search} />}
                {panelType === PANEL_TYPES.LAMBDAS && (
                    <LambdasTab
                        search={search}
                        assets={lambdaAssets}
                    />
                )}
                {panelType === PANEL_TYPES.SCRIPTS && (
                    <ScriptsTab
                        search={search}
                        assets={importAssets}
                    />
                )}
            </div>
        </>
    );
};
