import {useRef, useState} from "react";
import {useOnClickOutside} from "usehooks-ts";

import {ActiveFilterOption, FilterOption} from "./CommunityFilters.style";
import filterIcon from "./filter-icon.svg";
import {FilterButton, FiltersList} from "./Filters.style";
import {useHomepageContext} from "@stem/editor-oss/context";
import {CommunityFilterType} from "../../../../CreateDashboard";

const COMMUNITY_FILTER_OPTIONS: {label: string; value: CommunityFilterType}[] = [
    {label: "Most Played", value: "most_played"},
    {label: "Most Remixed", value: "most_remixed"},
    {label: "Most Shared", value: "most_shared"},
    {label: "Most Hearted", value: "most_hearted"},
];

export const CommunityFilters = () => {
    const [filtersOpen, setFiltersOpen] = useState(false);
    const {communityFilter, setCommunityFilter} = useHomepageContext();
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
                    {COMMUNITY_FILTER_OPTIONS.map(({label, value}) => {
                        const isActive = communityFilter === value;
                        const Component = isActive ? ActiveFilterOption : FilterOption;
                        return (
                            <Component
                                key={value}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCommunityFilter(value);
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
