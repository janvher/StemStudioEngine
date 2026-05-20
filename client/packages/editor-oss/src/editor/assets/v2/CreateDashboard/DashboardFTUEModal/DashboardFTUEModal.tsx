import styled from "styled-components";

import {
    Body,
    ChecklistCard,
    ChecklistGrid,
    Eyebrow,
    Footer,
    FooterActions,
    Header,
    HeroBadge,
    Modal,
    Overlay,
    Panel,
    PanelHero,
    SkipButton,
} from "./DashboardFTUEModal.style";
import createHero from "./images/create-hero.svg";
import docsHero from "./images/docs-hero.svg";
import playHero from "./images/play-hero.svg";
import remixHero from "./images/remix-hero.svg";
import i18n from "@stem/editor-oss/i18n/config";
import {useEscapeDismiss} from "../../common/hooks/useEscapeDismiss";
import {StyledButton} from "../../common/StyledButton";
import closeIcon from "../../icons/close-panel.svg";

export type DashboardFTUEAction = "community" | "create" | "collaborative" | "docs";

type DashboardFTUEStep = {
    badge: string;
    title: string;
    description: string;
    whereToClick: string[];
    whatToKnow: string[];
    actionLabel: string;
    action: DashboardFTUEAction;
    accent: string;
    artwork: string;
};

const steps: DashboardFTUEStep[] = [
    {
        badge: "Play",
        title: "Jump into worlds fast",
        description: "Looking for something to play? Start in Community and open any world that catches your eye.",
        whereToClick: [
            "Open Community from the left side to browse public worlds.",
            "Double-click a card to jump in fast.",
            "Use the card menu when you want more options.",
        ],
        whatToKnow: [
            "Dashboard shows your recent stuff plus a quick Community preview.",
            "Search filters whatever section you are in.",
            "Community is the best place to find playable public projects.",
        ],
        actionLabel: "Open Community",
        action: "community",
        accent: "#4ac7ff",
        artwork: playHero,
    },
    {
        badge: "Create",
        title: "Start building",
        description: "When you want to make something new, use New Experience in the top bar.",
        whereToClick: [
            "Click New Experience to start a fresh project.",
            "Open My Experiences to see everything you own.",
            "Use the menu on a project card for more actions.",
        ],
        whatToKnow: [
            "My Experiences is your main home for projects you are building.",
            "You can also import from the same New Experience menu.",
            "If you want a clean start, the top-right button is the fastest path.",
        ],
        actionLabel: "Create New Experience",
        action: "create",
        accent: "#ff7b5c",
        artwork: createHero,
    },
    {
        badge: "Remix",
        title: "Remix what inspires you",
        description: "See something cool? Clone it, remix it, and make it yours without touching the original.",
        whereToClick: [
            "Check Shared with Me for projects other creators invited you into.",
            "Browse Community for projects you want to learn from.",
            "Use Duplicate or Clone Project from the card menu when available.",
        ],
        whatToKnow: [
            "Shared projects stay separate until you make your own copy.",
            "The menu only shows clone actions when that project supports it.",
            "Remixing is one of the fastest ways to learn how things are built.",
        ],
        actionLabel: "Open Shared with Me",
        action: "collaborative",
        accent: "#8f7cff",
        artwork: remixHero,
    },
    {
        badge: "Docs",
        title: "Need help? Hit the docs",
        description:
            "This guide gets you moving. The docs go deeper when you want publishing, collaboration, or editor walkthroughs.",
        whereToClick: [
            "Open the docs when you want a step-by-step guide.",
            "Use Guide in the header anytime you want this quick refresher again.",
            "Jump to docs before publishing or setting up collaboration.",
        ],
        whatToKnow: [
            "The docs cover both the dashboard and the editor.",
            "This guide is short on purpose.",
            "If you are ever stuck, docs are the next stop.",
        ],
        actionLabel: "Open Docs",
        action: "docs",
        accent: "#6fe4b2",
        artwork: docsHero,
    },
];

interface DashboardFTUEModalProps {
    currentStep: number;
    onStepChange: (step: number) => void;
    onClose: () => void;
    onAction: (action: DashboardFTUEAction) => void;
}

export const DashboardFTUEModal = ({currentStep, onStepChange, onClose, onAction}: DashboardFTUEModalProps) => {
    const step = steps[currentStep] ?? steps[0]!;
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === steps.length - 1;
    useEscapeDismiss({onEscape: onClose});

    return (
        <Overlay>
            <Modal>
                <Header>
                    <Eyebrow>{i18n.t("Welcome to Stem Studio")}</Eyebrow>
                    <HeaderActions>
                        <SkipButton onClick={onClose}>{i18n.t("Skip")}</SkipButton>
                        <CloseButton
                            className="reset-css"
                            onClick={onClose}
                        >
                            <img
                                src={closeIcon}
                                alt={i18n.t("close")}
                            />
                        </CloseButton>
                    </HeaderActions>
                </Header>

                <Body>
                    <Panel>
                        <PanelHero
                            $accent={step.accent}
                            $artwork={step.artwork}
                        >
                            <HeroBadge $accent={step.accent}>{i18n.t(step.badge)}</HeroBadge>
                            <h3>{i18n.t(step.title)}</h3>
                            <p>{i18n.t(step.description)}</p>
                        </PanelHero>

                        <ChecklistGrid>
                            <ChecklistCard>
                                <h4>{i18n.t("Where to click")}</h4>
                                <ul>
                                    {step.whereToClick.map(item => (
                                        <li key={item}>{i18n.t(item)}</li>
                                    ))}
                                </ul>
                            </ChecklistCard>

                            <ChecklistCard>
                                <h4>{i18n.t("What to know")}</h4>
                                <ul>
                                    {step.whatToKnow.map(item => (
                                        <li key={item}>{i18n.t(item)}</li>
                                    ))}
                                </ul>
                            </ChecklistCard>
                        </ChecklistGrid>
                    </Panel>
                </Body>

                <Footer>
                    <FooterActions>
                        <StyledButton
                            isGrey
                            width="110px"
                            onClick={() => onStepChange(Math.max(0, currentStep - 1))}
                            disabled={isFirstStep}
                        >
                            {i18n.t("Back")}
                        </StyledButton>
                        <StyledButton
                            isGreySecondary
                            width={step.action === "create" ? "190px" : "170px"}
                            onClick={() => onAction(step.action)}
                        >
                            {i18n.t(step.actionLabel)}
                        </StyledButton>
                        <StyledButton
                            isBlue
                            width="120px"
                            onClick={() => (isLastStep ? onClose() : onStepChange(currentStep + 1))}
                        >
                            {isLastStep ? i18n.t("Finish") : i18n.t("Next")}
                        </StyledButton>
                    </FooterActions>
                </Footer>
            </Modal>
        </Overlay>
    );
};

const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const CloseButton = styled.button`
    position: absolute;
    top: 12px;
    left: 12px;
    img {
        width: 13px;
        height: auto;
    }
`;
