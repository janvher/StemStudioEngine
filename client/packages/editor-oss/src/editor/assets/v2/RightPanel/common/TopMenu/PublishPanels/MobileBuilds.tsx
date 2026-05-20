import {Description, Heading} from "./style";
import {showToast} from "@stem/editor-oss/showToast";
import {StyledButton} from "../../../../common/StyledButton";
import {SelectionOfButtons} from "../../SelectionOfButtons";
import {Separator} from "../../Separator";

export const MobileBuilds = () => {
    return (
        <>
            <Separator margin="12px auto 8px" />
            <Heading>
                <div className="label">Mobile Builds</div>
            </Heading>
            <Description>Build and deploy your game to mobile app stores</Description>
            <SelectionOfButtons>
                <StyledButton
                    isGreySecondary
                    onClick={() => showToast({type: "info", title: "App Store build coming soon!"})}
                    width="100%"
                    height="32px !important"
                >
                    <span>App Store</span>
                </StyledButton>
                <StyledButton
                    isGreySecondary
                    onClick={() => showToast({type: "info", title: "Play Store build coming soon!"})}
                    width="100%"
                    height="32px !important"
                >
                    <span>Play Store</span>
                </StyledButton>
            </SelectionOfButtons>
        </>
    );
};
