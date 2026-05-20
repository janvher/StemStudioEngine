import {Trans} from "react-i18next";
import {useLocation, useNavigate} from "react-router-dom";
import styled from "styled-components";

import {ROUTES} from "@web-shared/routes";
import {flexCenter, regularFont} from "../../../../assets/style";
import {Checkbox} from "../../../../ui/common/Checkbox";

interface Props {
    setTOSAccepted: React.Dispatch<React.SetStateAction<boolean>>;
    TOSAccepted: boolean;
}

export const AcceptTOS = ({setTOSAccepted, TOSAccepted}: Props) => {
    const navigate = useNavigate();
    const location = useLocation();
    const navigationOptions = {state: {from: location.pathname}};

    return (
        <Wrapper>
            <Checkbox
                checked={TOSAccepted}
                onChange={() => setTOSAccepted(prev => !prev)}
                customId="TOS-checkbox"
                customBG="linear-gradient(90deg, #9730ff 0%, #eb1bb2 100.33%)"
                customStyle={{borderRadius: "50%", margin: "0"}}
            />
            <Trans
                i18nKey="I have read and agree to the StemStudio <terms>Terms of Service</terms> and <privacy>Privacy Policy</privacy>"
                components={{
                    terms: (
                        <button
                            className="link reset-css"
                            onClick={() => navigate(ROUTES.TERMS_OF_SERVICE, navigationOptions)}
                        />
                    ),
                    privacy: (
                        <button
                            className="link reset-css"
                            onClick={() => navigate(ROUTES.PRIVACY_POLICY, navigationOptions)}
                        />
                    ),
                }}
            />
        </Wrapper>
    );
};

const Wrapper = styled.div`
    ${regularFont("s")};
    color: #fff;
    text-align: left;
    ${flexCenter};
    justify-content: flex-start;

    input:after,
    input {
        width: 20px;
        height: 20px;
    }

    input:checked:after {
        border: none;
    }

    .checkbox {
        margin-right: 12px;
        width: 20px;
        height: 20px;
        overflow: hidden;
    }

    label {
        margin: 0;
    }

    .link {
        margin: 0 4px;
        color: inherit;
    }
`;
