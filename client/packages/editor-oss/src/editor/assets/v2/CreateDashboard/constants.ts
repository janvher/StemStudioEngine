import type {IconType} from "react-icons";
import {
    HiOutlineAcademicCap,
    HiOutlineChartPie,
    HiOutlineChatBubbleLeftRight,
    HiOutlineCog6Tooth,
    HiOutlineGlobeAlt,
    HiOutlineNewspaper,
    HiOutlinePlayCircle,
    HiOutlineQuestionMarkCircle,
    HiOutlineShieldCheck,
    HiOutlineSparkles,
    HiOutlineWrenchScrewdriver,
} from "react-icons/hi2";

export enum PAGES {
    DASHBOARD = "Create",
    PROJECTS = "My Projects",
    AVATARS = "My Avatars",
    DISCOVER = "Browse",
    // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
    BROWSE = "Browse",
    REMIX = "Remix",
    TUTORIALS = "Tutorials",
    FORUM = "Forum",
    NEWS = "News",
    LEARN = "Learn",
    ABOUT = "About",
    INFO = "Info",
    SETTINGS = "Settings",
    PROFILE = "Profile",
    PLAY = "Play",
    ADMIN_PANEL = "Admin",
}

export interface DashboardMenuItem {
    label: PAGES;
    icon: IconType;
}

export const DASHBOARD_MENU: DashboardMenuItem[] = [
    {label: PAGES.DASHBOARD, icon: HiOutlineSparkles},
    {label: PAGES.REMIX, icon: HiOutlineWrenchScrewdriver},
    {label: PAGES.BROWSE, icon: HiOutlineGlobeAlt},
    {label: PAGES.TUTORIALS, icon: HiOutlinePlayCircle},
    {label: PAGES.FORUM, icon: HiOutlineChatBubbleLeftRight},
    {label: PAGES.NEWS, icon: HiOutlineNewspaper},
    {label: PAGES.LEARN, icon: HiOutlineAcademicCap},
    {label: PAGES.ABOUT, icon: HiOutlineChartPie},
    {label: PAGES.INFO, icon: HiOutlineQuestionMarkCircle},
];

export const DASHBOARD_BOTTOM_MENU: DashboardMenuItem[] = [
    {label: PAGES.SETTINGS, icon: HiOutlineCog6Tooth},
    {label: PAGES.ADMIN_PANEL, icon: HiOutlineShieldCheck},
];
