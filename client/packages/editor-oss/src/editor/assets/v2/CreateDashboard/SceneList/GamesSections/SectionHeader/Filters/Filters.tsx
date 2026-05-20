import {useRef, useState} from "react";
import {useOnClickOutside} from "usehooks-ts";

import {ActiveFilterOption, FilterOption} from "./CommunityFilters.style";
import filterIcon from "./filter-icon.svg";
import {FilterButton, FiltersList} from "./Filters.style";
import {useHomepageContext} from "@stem/editor-oss/context";
import type {ProjectFilterType} from "../../../../CreateDashboard";

const PROJECT_FILTER_OPTIONS: {label: string; value: ProjectFilterType}[] = [
    {label: "Creation date", value: "creation_date"},
    {label: "Date modified", value: "date_modified"},
    {label: "Created by me", value: "created_by"},
    {label: "Shared", value: "shared"},
    {label: "Archived", value: "archived"},
    {label: "Plays", value: "plays"},
    {label: "Likes", value: "likes"},
    {label: "Remixed", value: "remixed"},
    {label: "Shares", value: "shared_count"},
];

export const Filters = () => {
    const [filtersOpen, setFiltersOpen] = useState(false);
    const {setProjectsFilter, projectsFilter} = useHomepageContext();
    const ref = useRef<HTMLDivElement>(null);
    useOnClickOutside(ref as React.RefObject<HTMLElement>, () => setFiltersOpen(false));

    return (
        <FilterButton
            className="reset-css"
            onClick={() => setFiltersOpen(true)}
        >
            <img
                src={filterIcon}
                alt="filters"
            />
            {filtersOpen && (
                <FiltersList ref={ref}>
                    {PROJECT_FILTER_OPTIONS.map(({label, value}) => {
                        const isActive = projectsFilter === value;
                        const Component = isActive ? ActiveFilterOption : FilterOption;

                        return (
                            <Component
                                key={value}
                                onClick={e => {
                                    e.stopPropagation();
                                    setProjectsFilter(value);
                                    setFiltersOpen(false);
                                }}
                            >
                                {label}
                            </Component>
                        );
                    })}
                </FiltersList>
            )}
        </FilterButton>
    );
};
