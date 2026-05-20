import {useMemo} from "react";
import {HiOutlineArrowTopRightOnSquare, HiOutlineBookOpen} from "react-icons/hi2";

import {
    ExternalIcon,
    KindIcon,
    ResultDescription,
    ResultItem,
    ResultText,
    ResultTitle,
    ResultsList,
    Section,
} from "./TutorialsSearchSection.style";
import {DOCS_LINK} from "../../../../../v2/pages/constants";

interface Props {
    search: string;
    showDocs?: boolean;
}

/**
 * Forward the dashboard search query to the Docusaurus docs site at
 * `docs.<host>` (managed by the @easyops-cn docusaurus-search-local
 * plugin, which honours `?q=`). Previously this component also rendered
 * a YouTube tutorials link tied to a single hardcoded channel handle —
 * removed in favour of per-deployment configuration via
 * `REACT_APP_YOUTUBE_URL` (see `v2/pages/constants.ts`); the dashboard
 * sidebar surfaces that link instead.
 *
 * Renders nothing while the search box is empty or `showDocs` is false.
 * @param props
 * @param props.search
 * @param props.showDocs
 * @returns External search link toasts.
 */
export const TutorialsSearchSection = ({search, showDocs = false}: Props) => {
    const query = search.trim();

    const docsLink = useMemo(() => {
        if (!query || !showDocs || !DOCS_LINK) return null;
        const encoded = encodeURIComponent(query);
        const base = DOCS_LINK.replace(/\/$/, "");
        return `${base}/search?q=${encoded}`;
    }, [showDocs, query]);

    if (!docsLink) return null;

    return (
        <Section aria-label="External search results">
            <ResultsList>
                <ResultItem
                    href={docsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <KindIcon>
                        <HiOutlineBookOpen aria-hidden="true" />
                    </KindIcon>
                    <ResultText>
                        <ResultTitle>Docs</ResultTitle>
                        <ResultDescription>Search docs for &ldquo;{query}&rdquo;</ResultDescription>
                    </ResultText>
                    <ExternalIcon>
                        <HiOutlineArrowTopRightOnSquare aria-hidden="true" />
                    </ExternalIcon>
                </ResultItem>
            </ResultsList>
        </Section>
    );
};
