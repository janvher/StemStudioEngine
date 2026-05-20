import {NavLink, useParams} from "react-router-dom";

import {MarkdownPage} from "../components/MarkdownPage";
import {DEFAULT_SLUG, DOC_SECTIONS, findDoc} from "../content/docs-nav";

export function Docs() {
    const {slug} = useParams<{slug?: string}>();
    const activeSlug = slug ?? DEFAULT_SLUG;
    const entry = findDoc(activeSlug);

    return (
        <div className="docs-page">
            <aside className="docs-sidebar" aria-label="Documentation navigation">
                {DOC_SECTIONS.map((section) => (
                    <div key={section.label}>
                        <h5>{section.label}</h5>
                        <ul>
                            {section.entries.map((e) => (
                                <li key={e.slug}>
                                    <NavLink
                                        to={`/docs/${e.slug}`}
                                        className={({isActive}) =>
                                            isActive || (!slug && e.slug === DEFAULT_SLUG)
                                                ? "active"
                                                : undefined
                                        }
                                        end
                                    >
                                        {e.title}
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </aside>
            {entry ? (
                <MarkdownPage entry={entry} />
            ) : (
                <div className="docs-empty">Page not found.</div>
            )}
        </div>
    );
}
