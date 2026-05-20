import {useCallback} from "react";

import {
    FTUEContainer,
    Header,
    Title,
    Content,
    IconFrame,
    Description,
    Footer,
    Pagination,
    Dot,
    NextButton,
    ButtonText,
} from "./FTUE.style";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import {useFTUE} from "@stem/editor-oss/context/FTUEContext";
import global from "@stem/editor-oss/global";
import CameraIcon from "../../../../icons/camera-icon.svg";
import CreatingIcon from "../../../../icons/creating-icon.svg";
import MovementIcon from "../../../../icons/movement-icon.svg";
import WelcomeIcon from "../../../../icons/welcome-icon.svg";


interface OnboardingStep {
    headerText: string;
    iconSrc: string;
    text: string;
    step: number;
    emphasis?: string;
}

const steps: OnboardingStep[] = [
    {
        headerText: "Welcome!",
        iconSrc: WelcomeIcon,
        text: "This is Erth Sandbox",
        step: 0,
    },
    {
        headerText: "Movement",
        iconSrc: MovementIcon,
        text: "Move with",
        emphasis: "WASD",
        step: 1,
    },
    {
        headerText: "Camera",
        iconSrc: CameraIcon,
        text: "Adjust camera with",
        emphasis: "left-click",
        step: 2,
    },
    {
        headerText: "Creating",
        iconSrc: CreatingIcon,
        text: "Create with",
        emphasis: "right-click",
        step: 3,
    },
];

export const FTUE = ({width, height}: {width: string; height: string}) => {
    const {isFTUEVisible, hideFTUE, currentStep, setCurrentStep} = useFTUE();
    const app = global.app as EngineRuntime;
    const userId = app?.userId;

    const handleNext = useCallback(() => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            const finishedUsers = JSON.parse(localStorage.getItem("finishedFTUEUsers") || "[]");
            if (userId && !finishedUsers.includes(userId)) {
                finishedUsers.push(userId);
                localStorage.setItem("finishedFTUEUsers", JSON.stringify(finishedUsers));
            }
            hideFTUE();
        }
    }, [currentStep, hideFTUE, userId]);

    const handleDotClick = (index: number) => {
        setCurrentStep(index);
    };

    const currentStepData = steps[currentStep]!;

    return (
        isFTUEVisible &&
            <FTUEContainer $width={width}
                $height={height}
            >
                <Header>
                    <Title>{currentStepData.headerText}</Title>
                </Header>
                <Content>
                    <IconFrame>
                        <img src={currentStepData.iconSrc} />
                    </IconFrame>
                    <Description>
                        {currentStepData.text}
                        {currentStepData.emphasis &&
                            <>
                                {" "}
                                <b>{currentStepData.emphasis}</b>
                            </>
                        }
                    </Description>
                </Content>
                <Footer>
                    <Pagination>
                        {steps.map(({step}) => 
                            <Dot
                                key={step}
                                $active={currentStep === step}
                                style={{order: step}}
                                onClick={() => handleDotClick(step)}
                            />,
                        )}
                    </Pagination>
                    <NextButton onClick={handleNext}>
                        <ButtonText>{currentStep === steps.length - 1 ? "Finish" : "Next"}</ButtonText>
                    </NextButton>
                </Footer>
            </FTUEContainer>
        
    );
};
