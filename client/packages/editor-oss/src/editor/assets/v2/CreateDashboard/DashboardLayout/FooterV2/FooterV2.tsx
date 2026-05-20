import styled from "styled-components";

import {ROUTES} from "@web-shared/routes";

import {DOCS_LINK} from "../../../../../../v2/pages/constants";

const COPYRIGHT_HOLDER = "StemStudio";

export const FooterV2 = () => {
    return (
        <StyledFooter>
            <span className="copyright">© {new Date().getFullYear()} {COPYRIGHT_HOLDER}</span>
            <div className="flex">
                {DOCS_LINK &&
                    <a href={DOCS_LINK}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Docs
                    </a>
                }
                <a href={ROUTES.TERMS_OF_SERVICE}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Terms of Service
                </a>
                <a href={ROUTES.PRIVACY_POLICY}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Privacy Policy
                </a>
                <a href={ROUTES.THIRD_PARTY_ATTRIBUTIONS}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Open Source Licenses
                </a>
            </div>
        </StyledFooter>
    );
};

const StyledFooter = styled.footer`
    width: 100vw;
    min-height: 56px;
    padding: 16px 12px;
    box-sizing: border-box;

    display: flex;
    justify-content: space-between;
    align-items: center;

    border-top: 1px solid #ffffff1a;
    backdrop-filter: blur(4px);

    * {
        color: #ffffffcc;
        font-size: var(--theme-font-size-s);
    }
    .flex {
        display: flex;
        justify-content: center;
        align-items: center;
        column-gap: 16px;
    }
    a {
        text-decoration: underline;
    }

    @media only screen and (max-width: 480px) {
        flex-direction: column;
        row-gap: 8px;
        padding: 12px;
        min-height: auto;

        .flex {
            flex-wrap: wrap;
            column-gap: 12px;
            row-gap: 4px;
        }
    }

    @media only screen and (max-height: 500px) {
        min-height: auto;
        padding: 8px 12px;
    }

    @media only screen and (orientation: landscape) and (max-height: 500px) {
        * {
            font-size: 11px;
        }

        .flex {
            flex-wrap: wrap;
            justify-content: center;
            column-gap: 12px;
            row-gap: 4px;
        }
    }
`;
