import {type FormEvent, useCallback, useEffect, useMemo, useRef, useState} from "react";
import i18n from "i18next";
import {useNavigate} from "react-router-dom";
import {ClipLoader} from "react-spinners";
import {useMediaQuery} from "usehooks-ts";

import createNewGameProjectPreview from "./assets/create-new-game-project-preview.png";
import createProjectCardPlaceholder from "./assets/create-project-card-placeholder.png";
import createPromptBackground from "./assets/create-prompt-background.png";
import magicAiIcon from "./assets/magic-ai-dark.svg";
import {BaseGamePickerModal} from "./BaseGamePickerModal";
import {savePickerPrompt, readPickerPrompt, clearPickerPrompt, readPickerPromptAutoStart} from "./baseGamePickerStorage";
import {
    CarouselIndicator,
    CarouselButton,
    CreateDashboardWrapper,
    EmptyProjects,
    InlineTools,
    PlaceholderCard,
    PrimaryButton,
    ProjectCardsGrid,
    PromptForm,
    PromptInput,
    Section,
    SectionActions,
    SectionHeader,
    SectionTitle,
    SecondaryButton,
    StarterCard,
    StarterCardHeader,
    StarterSubtitle,
    StarterTitle,
    StartingProjectsLayout,
    TemplateCard,
    TemplateCardBody,
    TemplateCarouselTrack,
    TemplateCarouselViewport,
    TemplatesEmpty,
    WelcomeBlock,
    WelcomeSubtitle,
    WelcomeTitle,
} from "./CreateDashboardView.style";
import {extractKeywords, getPromptMatchedTemplates} from "./templateMatching";
import {getSceneBatch, getStartersStats, updateStarterStats} from "@stem/network/api/scene";
import {cloneScene} from "@stem/network/api/scene/v2";
import {useTemplateIds} from "@stem/network/api/templates/hooks";
import {addLikedGame} from "@stem/network/api/updateUser";
import {ROUTES} from "@web-shared/routes";
import {useAppGlobalContext, useAuthorizationContext, useHomepageContext} from "@stem/editor-oss/context";
import {writePendingProjectAdvancedModePreference} from "@stem/editor-oss/context/advancedModeStorage";
import {getThumbnail} from "@stem/editor-oss/services";
import {IS_OSS} from "@stem/editor-oss/mode/buildMode";
import {getOSSPersistenceMode} from "@stem/editor-oss/persistence";
import {showToast} from "@stem/editor-oss/showToast";
import {isStripeCreditsPurchasingEnabled} from "@stem/editor-oss/utils/featureFlags";
import {PRODUCT_ANALYTICS_EVENTS, trackProductEvent} from "@stem/editor-oss/utils/productAnalytics";
import {HeartIcon} from "../../../../../v2/pages/Home/PlayPage/HeartIcon";
import {openEditorRoute} from "../../../../../v2/pages/editorHandoff";
import {generateProjectLink} from "../../../../../v2/pages/links";
import {
    prepareBlankCopilotWorkspaceEntry,
    prepareCreateFromPromptCopilotEntry,
    prepareRemixCopilotEntry,
} from "../../AiCopilot/copilotWorkspaceEntry";
import {CreditsPurchaseModal} from "../../CreditsPurchaseModal/CreditsPurchaseModal";
import arrowLeftIcon from "../../icons/arrow-left.svg";
import {ImportIcon} from "../../TemplatePanel/ImportIcon";
import {TEMPLATES} from "../../TemplatePanel/constants/templates";
import {FileData} from "../../types/file";
import {ProgressiveImage} from "../../common/ProgressiveImage/ProgressiveImage";
import {
    CardStatsRow as CompactFooter,
    CardStat as CompactStat,
    CardThumbnail as CompactMedia,
    CardGradientOverlay,
    CardTitleOverlay,
    CardOverlayTitle,
} from "../common/GameCard.style";
import {MOBILE_DASHBOARD_BREAKPOINT} from "../DashboardLayout/DashboardHeader/DashboardHeader.style";
import {getKeywordMatchedPlaceholder, getRandomPlaceholderIdentifier} from "../GameOverview/placeholderThumbnails";
import {CreateHomepageHero} from "../CreateHomepageHero/CreateHomepageHero";
import heartOutlineIcon from "../icons/heart-outline.svg";
import playStatIcon from "../icons/play-stat.svg";
import remixStatIcon from "../icons/remix-stat.svg";
import shareStatIcon from "../icons/share-stat.svg";
import zeroCountIcon from "../icons/zero-count.svg";
import {getNextProjectPageFetcher} from "../projectPagination";
import {Filters} from "../SceneList/GamesSections/SectionHeader/Filters/Filters";
import {SceneListItem} from "../SceneList/SceneListItem";

const filterProjectsBySearch = (projects: FileData[], search: string) => {
    if (!search) return projects;

    const query = search.toLowerCase();
    return projects.filter(project => {
        if (project.Name.toLowerCase().includes(query)) return true;

        if (!project.Tags) return false;

        try {
            const tagsArray = JSON.parse(project.Tags);
            return Array.isArray(tagsArray) && tagsArray.some((tag: string) => tag.toLowerCase().includes(query));
        } catch {
            return false;
        }
    });
};

const SANDBOX_STARTER_TEMPLATE_ID = "__sandbox_starter__";

type DashboardTemplate = FileData & {
    starterType?: "sandbox";
};

type Props = {
    hasAnyProjects: boolean;
    projects: FileData[];
    view?: "create" | "projects";
};

const formatMetricValue = (value?: number) => {
    const safeValue = value ?? 0;
    if (safeValue >= 1_000_000) {
        const compact = Math.round((safeValue / 1_000_000) * 10) / 10;
        return `${compact}M`;
    }
    if (safeValue >= 1000) {
        const compact = Math.round((safeValue / 1000) * 10) / 10;
        return `${compact}k`;
    }
    return `${safeValue}`;
};

const MarqueeTitle = ({children}: {children: string}) => {
    const ref = useRef<HTMLHeadingElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (el) setIsOverflowing(el.scrollWidth > el.clientWidth);
    }, [children]);

    return (
        <CardOverlayTitle
            ref={ref}
            className={isOverflowing ? "overflowing" : ""}
        >
            <span>{children}</span>
        </CardOverlayTitle>
    );
};

const LikeStat = ({scene, noHover}: {scene: FileData; noHover?: boolean}) => {
    const {setDbUser, handleGetLikedGames, likedGamesIds} = useAuthorizationContext();
    const navigate = useNavigate();
    const [localLikes, setLocalLikes] = useState(scene.Likes ?? 0);
    const [loadingLike, setLoadingLike] = useState(false);
    const userLikedGame = likedGamesIds?.includes(scene.ID) ?? false;

    useEffect(() => {
        setLocalLikes(scene.Likes ?? 0);
    }, [scene.Likes]);

    const handleClick = useCallback(
        async (e: React.MouseEvent) => {
            e.stopPropagation();
            setLoadingLike(true);
            const res = await addLikedGame(scene.ID, setDbUser, () =>
                navigate(ROUTES.LOGIN, {state: {from: location.pathname}}),
            );
            await handleGetLikedGames();
            if (res) setLocalLikes(res.likes);
            setLoadingLike(false);
        },
        [scene.ID, setDbUser, handleGetLikedGames, navigate],
    );

    return (
        <CompactStat
            as="div"
            $noHover={noHover}
            onClick={handleClick}
            style={{cursor: "pointer"}}
        >
            {loadingLike ? (
                <ClipLoader
                    loading
                    size={14}
                    color="#0284c7"
                />
            ) : userLikedGame ? (
                <HeartIcon
                    userLikedGame
                    variant="dashboard"
                />
            ) : (
                <img
                    src={heartOutlineIcon}
                    alt="like"
                />
            )}
            <span>{formatMetricValue(localLikes)}</span>
        </CompactStat>
    );
};

export const CreateDashboardView = ({hasAnyProjects, projects, view = "create"}: Props) => {
    const {search, myGamesSection, collaborativeGamesSection, archivedGamesSection} = useHomepageContext();
    const {setMainLoaderState, setAdvancedMode} = useAppGlobalContext();
    const {data: templateIds = [], isLoading: isLoadingTemplateIds} = useTemplateIds();
    const isPhonePortrait = useMediaQuery("(max-width: 480px)");
    const isMobileLandscape = useMediaQuery(`(max-width: ${MOBILE_DASHBOARD_BREAKPOINT})`);
    const isTablet = useMediaQuery("(max-width: 1280px)");
    const [copilotPrompt, setCopilotPrompt] = useState("");
    const [templates, setTemplates] = useState<FileData[]>([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
    const [starterStats, setStarterStats] = useState({blankProjectCount: 0, sandboxStarterCount: 0});
    const [activeTemplateIndex, setActiveTemplateIndex] = useState(0);
    const [busyAction, setBusyAction] = useState<"copilot" | "engine" | "template" | null>(null);
    const [showBaseGamePicker, setShowBaseGamePicker] = useState(false);
    const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
    const [pendingPromptDecision, setPendingPromptDecision] = useState<string | null>(null);
    const [showCreditsPurchaseModal, setShowCreditsPurchaseModal] = useState(false);
    const {aiCredits, dbUser, isAuthorized} = useAuthorizationContext();
    const navigate = useNavigate();
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

    // Grid cols: 4 (default) → 2 (≤1280) → 1 (≤480). Capped at 4 on wide
    // viewports — 5 narrowed cards enough to ellipsis their action buttons.
    // Templates = grid cols - 2 starter cards (min 1)
    const gridColumns = isPhonePortrait ? 1 : isTablet ? 2 : 4;
    const visibleTemplateCount = isPhonePortrait ? 1 : isMobileLandscape ? 2 : Math.max(1, gridColumns - 2);
    const rowCardCount = gridColumns;
    const filteredProjects = useMemo(() => filterProjectsBySearch(projects, search), [projects, search]);

    // DOT-7545: depend on pagination *scalar* fields only. The section
    // objects themselves are recreated every time their `scenes` array
    // changes, which happens each time a new page lands — including when
    // React Query refetches in response to scenePublished / shouldRefresh.
    // Using the full section object as a dep made this effect self-fire on
    // every page-return, racing with refetch() and producing duplicate /
    // out-of-order pages in the infinite-query cache. Depending only on
    // hasNextPage / isFetchingNextPage keeps the "auto-load all my
    // projects" behaviour while preventing the recursive self-trigger.
    const myHasNext = myGamesSection.hasNextPage;
    const myFetching = myGamesSection.isFetchingNextPage;
    const collabHasNext = collaborativeGamesSection.hasNextPage;
    const collabFetching = collaborativeGamesSection.isFetchingNextPage;
    const archivedHasNext = archivedGamesSection.hasNextPage;
    const archivedFetching = archivedGamesSection.isFetchingNextPage;
    useEffect(() => {
        if (view !== "projects") return;
        const fetchNextProjectPage = getNextProjectPageFetcher([
            myGamesSection,
            collaborativeGamesSection,
            archivedGamesSection,
        ]);
        if (!fetchNextProjectPage) return;

        fetchNextProjectPage();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, myHasNext, myFetching, collabHasNext, collabFetching, archivedHasNext, archivedFetching]);

    useEffect(() => {
        if (isLoadingTemplateIds) return;
        if (templateIds.length === 0) {
            setTemplates([]);
            setIsLoadingTemplates(false);
            return;
        }

        let cancelled = false;
        void (async () => {
            try {
                const response = await getSceneBatch(templateIds);
                if (!cancelled) setTemplates(response || []);
            } catch (error: any) {
                if (!cancelled) {
                    console.error("[CreateDashboardView] Failed to load templates:", error);
                    showToast({type: "error", title: error.message || "Failed to load templates."});
                }
            } finally {
                if (!cancelled) setIsLoadingTemplates(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isLoadingTemplateIds, templateIds]);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const response = await getStartersStats();
                if (!cancelled && response) {
                    setStarterStats(response);
                }
            } catch (error: any) {
                if (!cancelled) {
                    console.error("[CreateDashboardView] Failed to load starter stats:", error);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const dashboardTemplates = useMemo<DashboardTemplate[]>(() => {
        const sandboxTemplate = TEMPLATES.find(template => template.IsSandbox);
        const syntheticSandbox: DashboardTemplate[] = sandboxTemplate
            && isLocalhost
            ? [
                  {
                      ID: SANDBOX_STARTER_TEMPLATE_ID,
                      publishRevisionId: "",
                      AssetID: null,
                      Name: sandboxTemplate.Name,
                      Description: "",
                      Thumbnail: sandboxTemplate.Thumbnail || "",
                      PlayCount: 0,
                      RemixCount: starterStats.sandboxStarterCount,
                      ShareCount: 0,
                      Likes: 0,
                      Tags: JSON.stringify(sandboxTemplate.Tags),
                      Url: "",
                      UpdateTime: "",
                      IsPublic: false,
                      IsSandbox: true,
                      IsCloneable: true,
                      IsPublished: false,
                      UserID: "",
                      starterType: "sandbox",
                  },
              ]
            : [];

        return [...syntheticSandbox, ...templates];
    }, [isLocalhost, starterStats.sandboxStarterCount, templates]);

    useEffect(() => {
        const maxIndex = Math.max(0, dashboardTemplates.length - visibleTemplateCount);
        setActiveTemplateIndex(prev => Math.min(prev, maxIndex));
    }, [dashboardTemplates.length, visibleTemplateCount]);

    const canShowPreviousTemplates = activeTemplateIndex > 0;
    const canShowMoreTemplates = activeTemplateIndex + visibleTemplateCount < dashboardTemplates.length;
    const isBusy = busyAction !== null;
    const isTemplateMatchingReady = !isLoadingTemplateIds && !isLoadingTemplates;
    const myProjectPlaceholders = Math.max(0, rowCardCount - filteredProjects.length);
    const templateCarouselPages = Math.max(1, dashboardTemplates.length - visibleTemplateCount + 1);
    const visibleCarouselIndicators = Math.min(3, templateCarouselPages);
    const matchingPickerTemplates = useMemo(
        () => pendingPrompt ? getPromptMatchedTemplates(templates, pendingPrompt) : [],
        [pendingPrompt, templates],
    );

    const renderStats = (project: FileData) => {
        const remixCount = project.RemixCount ?? 0;
        return [
            {icon: shareStatIcon, value: "0", disabled: false},
            ...(remixCount === 0
                ? [{icon: remixStatIcon, value: null, disabled: true, zeroIcon: zeroCountIcon}]
                : [{icon: remixStatIcon, value: formatMetricValue(remixCount), disabled: false}]),
            {icon: playStatIcon, value: formatMetricValue(project.PlayCount), disabled: false},
        ];
    };

    const startBlankProject = async (options?: {prompt?: string}) => {
        const trimmedPrompt = options?.prompt?.trim();
        trackProductEvent(PRODUCT_ANALYTICS_EVENTS.CREATE_BLANK_STARTED, {
            source: trimmedPrompt ? "prompt" : "blank",
            prompt_length: trimmedPrompt?.length ?? 0,
        });
        if (!isAuthorized) {
            if (trimmedPrompt) {
                savePickerPrompt(trimmedPrompt, {autoStart: true});
            }
            void navigate(ROUTES.LOGIN, {state: {from: ROUTES.HOME}});
            return;
        }
        setBusyAction(trimmedPrompt ? "copilot" : "engine");

        try {
            await updateStarterStats("BlankProject");

            const placeholderThumbnail = trimmedPrompt
                ? getKeywordMatchedPlaceholder(extractKeywords(trimmedPrompt))
                : getRandomPlaceholderIdentifier();

            // "Start from scratch" (no prompt) opens the full editor in advanced
            // mode. The prompt-driven flow stays in default/copilot mode.
            // openEditorRoute triggers a hard page navigation (window.location.assign),
            // so React state is lost — we persist the preference via session storage
            // so the next page boot reads it through resolveAdvancedModePreferenceForProject.
            const wantsAdvanced = !trimmedPrompt;
            setAdvancedMode(wantsAdvanced);
            writePendingProjectAdvancedModePreference(wantsAdvanced);

            if (trimmedPrompt) {
                prepareCreateFromPromptCopilotEntry({prompt: trimmedPrompt, placeholderThumbnail});
            } else {
                prepareBlankCopilotWorkspaceEntry();
            }

            openEditorRoute(generateProjectLink(), {autoCreate: true});
        } catch (error: any) {
            console.error("[CreateDashboardView] Failed to create blank project:", error);
            showToast({type: "error", title: error.message || "Failed to create project."});
            setBusyAction(null);
        }
    };

    const continuePromptCreation = (prompt: string) => {
        const matchingTemplates = getPromptMatchedTemplates(templates, prompt);
        if (matchingTemplates.length === 0) {
            setShowBaseGamePicker(false);
            setPendingPrompt(null);
            clearPickerPrompt();
            void startBlankProject({prompt});
            return;
        }

        setPendingPrompt(prompt);
        setShowBaseGamePicker(true);
    };

    useEffect(() => {
        if (view !== "create") return;
        if (!pendingPromptDecision) return;
        if (!isTemplateMatchingReady) return;

        const prompt = pendingPromptDecision;
        setPendingPromptDecision(null);
        continuePromptCreation(prompt);
        // `continuePromptCreation` intentionally reads the latest loaded templates.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, pendingPromptDecision, isTemplateMatchingReady, templates]);

    useEffect(() => {
        if (view !== "create") return;
        if (!isAuthorized) return;
        if (pendingPromptDecision) return;
        if (pendingPrompt || showBaseGamePicker) return;
        const saved = readPickerPrompt();
        if (!saved) return;

        setCopilotPrompt(saved);

        if (readPickerPromptAutoStart()) {
            clearPickerPrompt();
            void startBlankProject({prompt: saved});
            return;
        }

        if (!isTemplateMatchingReady) {
            setPendingPromptDecision(saved);
            return;
        }

        continuePromptCreation(saved);
        // `continuePromptCreation` intentionally reads the latest loaded templates.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, isAuthorized, isTemplateMatchingReady, pendingPromptDecision, pendingPrompt, showBaseGamePicker]);

    const startSandboxProject = async () => {
        setBusyAction("engine");

        try {
            await updateStarterStats("SandboxStarter");
            openEditorRoute(generateProjectLink(), {autoCreate: true, sandboxStarter: true});
        } catch (error: any) {
            console.error("[CreateDashboardView] Failed to create sandbox project:", error);
            showToast({type: "error", title: error.message || "Failed to create sandbox project."});
            setBusyAction(null);
        }
    };

    const beginPromptCreation = (prompt: string) => {
        const trimmed = prompt.trim();
        if (!trimmed || isBusy) return;
        trackProductEvent(PRODUCT_ANALYTICS_EVENTS.CREATE_PROMPT_SUBMITTED, {
            prompt_length: trimmed.length,
        });
        if (!isAuthorized) {
            savePickerPrompt(trimmed, {autoStart: true});
            void navigate(ROUTES.LOGIN, {state: {from: ROUTES.HOME}});
            return;
        }

        if (aiCredits !== null && aiCredits <= 0 && isStripeCreditsPurchasingEnabled()) {
            setShowCreditsPurchaseModal(true);
            return;
        }

        savePickerPrompt(trimmed);
        setCopilotPrompt(trimmed);

        if (!isTemplateMatchingReady) {
            setPendingPromptDecision(trimmed);
            return;
        }

        continuePromptCreation(trimmed);
    };

    const handleCopilotSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        beginPromptCreation(copilotPrompt);
    };

    const handlePickerSelectGame = async (gameId: string) => {
        if (!pendingPrompt) return;
        setBusyAction("template");
        trackProductEvent(PRODUCT_ANALYTICS_EVENTS.TEMPLATE_REMIX_STARTED, {
            scene_id: gameId,
            source: "base_game_picker",
            prompt_length: pendingPrompt.length,
        });

        try {
            // Prompt-driven remix also goes to the AI-focused layout. See
            // startBlankProject for why we write the preference directly in
            // addition to calling setAdvancedMode.
            setAdvancedMode(false);
            const result = await cloneScene(gameId);
            if (!result?.newSceneId) {
                throw new Error("Remix did not return a new project.");
            }
            const sourceScene = matchingPickerTemplates.find(template => template.ID === gameId);
            prepareRemixCopilotEntry({
                newSceneId: result.newSceneId,
                sourceScene,
                prompt: pendingPrompt,
            });
            clearPickerPrompt();
            setShowBaseGamePicker(false);
            setPendingPrompt(null);
            openEditorRoute(generateProjectLink(result.newSceneId));
        } catch (error: any) {
            console.error("[CreateDashboardView] Failed to remix for picker:", error);
            showToast({type: "error", title: error.message || i18n.t("Failed to remix project.")});
            setBusyAction(null);
        }
    };

    const handlePickerBlankProject = () => {
        setShowBaseGamePicker(false);
        clearPickerPrompt();
        const prompt = pendingPrompt;
        setPendingPrompt(null);
        void startBlankProject({prompt: prompt || undefined});
    };

    const handlePickerClose = () => {
        setShowBaseGamePicker(false);
        clearPickerPrompt();
        setPendingPrompt(null);
    };

    const handleTemplateSelect = async (template: DashboardTemplate) => {
        if (isBusy || !template.ID) return;

        if (template.starterType === "sandbox") {
            trackProductEvent(PRODUCT_ANALYTICS_EVENTS.CREATE_BLANK_STARTED, {
                source: "sandbox_starter",
            });
            await startSandboxProject();
            return;
        }

        setBusyAction("template");
        trackProductEvent(PRODUCT_ANALYTICS_EVENTS.TEMPLATE_REMIX_STARTED, {
            scene_id: template.ID,
            source: "create_template",
        });
        setMainLoaderState({
            visible: true,
            message: "Remixing scene, this may take a moment...",
        });

        try {
            const result = await cloneScene(template.ID);
            if (!result?.newSceneId) {
                throw new Error("Template remix did not return a new project.");
            }

            setAdvancedMode(false);
            prepareRemixCopilotEntry({
                newSceneId: result.newSceneId,
                sourceScene: template,
            });
            openEditorRoute(generateProjectLink(result.newSceneId));
        } catch (error: any) {
            console.error("[CreateDashboardView] Failed to remix template:", error);
            showToast({type: "error", title: error.message || "Failed to remix project."});
            setBusyAction(null);
            setMainLoaderState({
                visible: false,
                message: "",
            });
        }
    };

    return (
        <CreateDashboardWrapper data-testid={view === "create" ? "create-dashboard" : "my-projects-dashboard"}>
            {view === "create" ? (
                <CreateHomepageHero
                    onPromptSubmit={beginPromptCreation}
                    onScratchStart={() => void startBlankProject()}
                    isBusy={isBusy}
                />
            ) : (
                <Section>
                    <SectionHeader style={{justifyContent: "flex-start", gap: "12px"}}>
                        <SectionTitle>{i18n.t("My Projects")}</SectionTitle>
                        <InlineTools>
                            <ImportIcon />
                            <Filters />
                        </InlineTools>
                    </SectionHeader>

                    {filteredProjects.length === 0 ? (
                        <EmptyProjects>
                            {search
                                ? i18n.t("No matching projects found.")
                                : (IS_OSS && getOSSPersistenceMode() === "filesystem")
                                  ? i18n.t(
                                        "No saved projects in this folder yet. Create one from the Create tab and click Save Project, or import a stemscript folder.",
                                    )
                                  : i18n.t("No projects yet.")}
                        </EmptyProjects>
                    ) : (
                        <ProjectCardsGrid $columns={rowCardCount}>
                            {filteredProjects.map(project => (
                                <SceneListItem
                                    key={project.ID}
                                    item={project}
                                    routeKind="dashboard"
                                    showVisibilityState
                                />
                            ))}
                            {Array.from({length: myProjectPlaceholders}).map((_, index) => (
                                <PlaceholderCard key={`placeholder-${index}`} />
                            ))}
                        </ProjectCardsGrid>
                    )}
                </Section>
            )}
            {view === "create" && showBaseGamePicker && pendingPrompt && matchingPickerTemplates.length > 0 && (
                <BaseGamePickerModal
                    prompt={pendingPrompt}
                    templates={matchingPickerTemplates}
                    onSelectGame={handlePickerSelectGame}
                    onBlankProject={handlePickerBlankProject}
                    onClose={handlePickerClose}
                    isBusy={isBusy}
                />
            )}

            {view === "create" && showCreditsPurchaseModal && (
                <CreditsPurchaseModal onClose={() => setShowCreditsPurchaseModal(false)} />
            )}
        </CreateDashboardWrapper>
    );
};
