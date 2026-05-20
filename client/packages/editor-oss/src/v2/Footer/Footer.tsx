import {useTranslation} from "react-i18next";
import {useMediaQuery} from "usehooks-ts";

import {
    FOOTER_MOBILE_QUERY,
    InsideColumn,
    LeftColumn,
    MidColumn,
    MobileColumn,
    RightColumn,
    ShadowContainer,
    StyledFooter,
    MobileRow,
} from "./Footer.style";
import {ROUTES} from "@web-shared/routes";
import discord from "../assets/discord-grey.svg";
import logo from "../assets/logo-white.svg";
import stemStudioLogo from "../../editor/assets/v2/HUD/HUDView/FloatingNav/AppVersion/stem-studio-alpha.png";
import {Shadow} from "../common/Shadow/Shadow.style";
import {ABOUT_LINK, BLOG_LINK, DISCORD_LINK, FORUM_LINK} from "../pages/constants";
import {IS_OSS} from "../../mode/buildMode";

const COPYRIGHT_HOLDER = "StemStudio";

interface IColumns {
    label: string;
    options: {
        text: string;
        href: string;
        target?: string;
    }[];
}

export const Footer = () => {
    const {t} = useTranslation();
    const isMobile = useMediaQuery(FOOTER_MOBILE_QUERY);

    const playColumn: IColumns = {
        label: t("Play"),
        // OSS has no public game library to explore.
        options: IS_OSS ? [] : [{text: t("Explore"), href: ROUTES.BROWSE}],
    };
    const createColumn: IColumns = {label: t("Create"), options: [{text: t("Studio"), href: ROUTES.HOME}]};
    const communityColumn: IColumns = {
        label: t("Community"),
        options: [
            BLOG_LINK ? {text: t("Blog"), href: BLOG_LINK, target: "_blank"} : null,
            FORUM_LINK ? {text: t("Forum"), href: FORUM_LINK, target: "_blank"} : null,
        ].filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    };
    // OSS has no hosted operator, so About/Contact/ToS/Privacy don't
    // apply. Open-source licenses still ship and stay visible.
    const companyColumn: IColumns = {
        label: t("Company"),
        options: IS_OSS
            ? []
            : [
                {text: t("About"), href: ABOUT_LINK || ROUTES.ABOUT, target: ABOUT_LINK ? "_blank" : undefined},
                {text: t("Contact"), href: ROUTES.CONTACT_US},
            ],
    };
    const legalColumn: IColumns = {
        label: t("Legal"),
        options: IS_OSS
            ? [{text: t("Open Source Licenses"), href: ROUTES.THIRD_PARTY_ATTRIBUTIONS}]
            : [
                {text: t("Terms of Service"), href: ROUTES.TERMS_OF_SERVICE},
                {text: t("Privacy Policy"), href: ROUTES.PRIVACY_POLICY},
                {text: t("Open Source Licenses"), href: ROUTES.THIRD_PARTY_ATTRIBUTIONS},
            ],
    };

    const INSIDE_COLUMNS: IColumns[] = [
        playColumn,
        createColumn,
        communityColumn,
        companyColumn,
        legalColumn,
    ].filter(col => col.options.length > 0);

    const MOBILE_INSIDE_COLUMNS: IColumns[][] = [
        [playColumn, createColumn],
        [communityColumn],
        [companyColumn, legalColumn],
    ].map(group => group.filter(col => col.options.length > 0))
     .filter(group => group.length > 0);

    const renderInsideColumn = ({label, options}: IColumns) => (
        <InsideColumn key={label}>
            <div className="label">{label}</div>
            {options.map(({text, href, target}) =>
                <Link text={text}
                    href={href}
                    target={target}
                    key={text}
                />,
            )}
        </InsideColumn>
    );

    return (
        <StyledFooter id="footer">
            <ShadowContainer>
                <Shadow $left
                    $bottom
                />
            </ShadowContainer>
            {isMobile ?
                <>
                    <MobileRow>
                        <img src={IS_OSS ? stemStudioLogo : logo}
                            alt="StemStudio"
                            style={IS_OSS ? {height: 28} : undefined}
                        />
                        <DiscordButton />
                    </MobileRow>
                    <MidColumn $mobileGrid>
                        {MOBILE_INSIDE_COLUMNS.map((columns) =>
                            <MobileColumn key={columns.map(({label}) => label).join("-")}>
                                {columns.map(renderInsideColumn)}
                            </MobileColumn>,
                        )}
                    </MidColumn>
                    <MobileRow>
                        <span className="copyright">© {new Date().getFullYear()} {COPYRIGHT_HOLDER}</span>
                        <span className="copyright">{t("All Rights Reserved")}</span>
                    </MobileRow>
                </>
             :
                <>
                    <LeftColumn>
                        <img src={IS_OSS ? stemStudioLogo : logo}
                            alt="StemStudio"
                            style={IS_OSS ? {height: 28} : undefined}
                        />
                        <span className="copyright">© {new Date().getFullYear()} {COPYRIGHT_HOLDER}</span>
                    </LeftColumn>
                    <MidColumn>
                        {INSIDE_COLUMNS.map(renderInsideColumn)}
                    </MidColumn>
                    <RightColumn>
                        <DiscordButton />
                        <span className="copyright">{t("All Rights Reserved")}</span>
                    </RightColumn>
                </>
            }
        </StyledFooter>
    );
};

interface LinkProps {
    text: string;
    href: string;
    target?: string;
}
const Link = ({text, href, target}: LinkProps) => {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (window.location.pathname === href) {
            e.preventDefault();
            const container = document.getElementById("container");
            container?.scrollTo({top: 0, behavior: "smooth"});
        }
    };

    return (
        <a
            className={href ? "option" : "option disabled"}
            href={href ? href : undefined}
            target={target}
            rel="noopener noreferrer"
            onClick={handleClick}
        >
            {text}
        </a>
    );
};

export const DiscordButton = () => {
    if (!DISCORD_LINK) return null;
    return (
        <button
            className="reset-css"
            onClick={() => {
                window.open(DISCORD_LINK, "_blank");
            }}
        >
            <img src={discord}
                alt="Discord"
            />
        </button>
    );
};
