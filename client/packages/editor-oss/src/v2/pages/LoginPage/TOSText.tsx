import {Trans} from "react-i18next";
import {useNavigate} from "react-router-dom";
import styled from "styled-components";

import {ROUTES} from "@web-shared/routes";

const TermsText = styled.div`
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-regular);
    line-height: 120%;
    color: #fff;
    text-align: center;
    text-align: left;
    width: 259px;

    .link {
        z-index: 1;
        text-decoration: underline;
        color: inherit;
        font-size: inherit;
    }

    @media only screen and (orientation: landscape) and (max-height: 500px) {
        font-size: 11px;
        line-height: 140%;
    }
`;

interface Props {
    navigationOptions: {
        state: {
            from: ROUTES;
        };
    };
}

export const TOSText = ({navigationOptions}: Props) => {
    const navigate = useNavigate();

    return (
        <TermsText>
            <Trans
                i18nKey={
                    "By clicking Sign in and using our platfom, you hereby agree to our <terms>Terms of Service</terms> and <privacy>Privacy Policy</privacy>."
                }
                components={{
                    br: <br />,
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
        </TermsText>
    );
};
