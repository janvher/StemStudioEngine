// Styled components for multiselect dropdown

import {useMemo, useRef, useState} from "react";
import styled from "styled-components";
import {useOnClickOutside} from "usehooks-ts";

const StyledCheckbox = styled.input`
    width: 14px;
    height: 14px;
    accent-color: var(--theme-accent, #007bff);
    cursor: pointer;
    border-radius: 3px;
    transition: all 0.2s ease;

    &:hover {
        transform: scale(1.05);
    }
`;

const MultiselectContainer = styled.div`
    position: relative;
    width: 100%;
    margin-bottom: 16px;
`;

const MultiselectTrigger = styled.div`
    width: 100%;
    min-height: 40px;
    border: 1px solid var(--theme-container-secondary-dark);
    border-radius: 8px;
    background-color: var(--theme-container-secondary-dark);
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-regular);
    color: var(--theme-font-unselected-color);
    padding: 8px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;

    &:hover {
        filter: brightness(1.1);
    }
`;

const MultiselectContent = styled.div`
    display: flex;
    flex-wrap: wrap;
    row-gap: 6px;
    column-gap: 8px;
    flex: 1;
`;

const SelectedItem = styled.span`
    background-color: var(--theme-primary-color);
    color: white;
    border-radius: 4px;
    font-size: var(--theme-font-size-s);
    margin-right: 4px;
`;

const MultiselectDropdown = styled.div<{expanded: boolean}>`
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    border-radius: 8px;
    box-shadow: 0px 4px 15px 0px #000;
    z-index: 10;
    max-height: 240px;
    overflow-y: auto;
    background-color: var(--theme-container-secondary-dark);
    border: 1px solid var(--theme-container-secondary-dark);

    ${({expanded}) =>
        expanded &&
        `
        display: block;
    `}
`;

const SearchWrapper = styled.div`
    position: sticky;
    top: 0;
    z-index: 1;
    margin-bottom: 6px;
    padding: 8px 8px 0;
    background-color: var(--theme-container-secondary-dark);
`;

const SearchIcon = styled.div`
    position: absolute;
    left: 18px;
    top: 50%;
    transform: translateY(-50%);
    width: 14px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #a1a1aa;
    pointer-events: none;
`;

const SearchInput = styled.input`
    width: 100%;
    height: 32px;
    padding: 0 12px 0 32px;
    border: 1px solid #ffffff1a;
    border-radius: 8px;
    background: var(--theme-grey-bg);
    font-size: var(--theme-font-size-s);
    color: var(--theme-font-input-color);
    box-sizing: border-box;

    &::placeholder {
        color: #a1a1aa;
    }

    &:focus {
        outline: none;
        border-color: var(--theme-container-active-blue);
    }
`;

const MultiselectOption = styled.div<{checked: boolean}>`
    width: 100%;
    padding: 6px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-regular);
    color: var(--theme-font-unselected-color);

    &:hover {
        filter: brightness(1.3);
    }

    ${({checked}) =>
        checked &&
        `
        background-color: var(--theme-primary-color);
        color: white;
    `}
`;

const OptionText = styled.div`
    display: flex;
    flex-direction: column;
    min-width: 0;
`;

const OptionTitle = styled.div`
    line-height: 1.2;
`;

const OptionDescription = styled.div<{checked: boolean}>`
    margin-top: 2px;
    font-size: 9px;
    line-height: 1.25;
    color: ${({checked}) => checked ? "rgba(255, 255, 255, 0.85)" : "var(--theme-font-placeholder-color, #9aa0a6)"};
    white-space: nowrap;
    overflow: hidden;

    & > span {
        display: inline-block;
    }

    &:hover > span {
        animation: marquee 12s linear infinite;
    }

    @keyframes marquee {
        0% { transform: translateX(0); }
        100% { transform: translateX(-100%); }
    }
`;

const DropdownArrow = styled.div<{expanded: boolean}>`
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 6px solid var(--theme-font-unselected-color);
    transition: transform 0.2s ease;

    ${({expanded}) =>
        expanded &&
        `
        transform: rotate(180deg);
    `}
`;

const NoResults = styled.div`
    padding: 8px 10px 10px;
    font-size: var(--theme-font-size-s);
    color: #a1a1aa;
`;

type Item = {
    value: string;
    label: string;
    description?: string;
};

interface MultiselectProps {
    data: Item[];
    selectedItems: Item[];
    onChange: (item: Item) => void;
    placeholder?: string;
    searchable?: boolean;
}

export const MultiselectWithCheckboxes = ({selectedItems, onChange, placeholder, data, searchable = false}: MultiselectProps) => {
    const [expanded, setExpanded] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    useOnClickOutside(ref as React.RefObject<HTMLElement>, () => {
        setExpanded(false);
        setSearch("");
    });

    const handleItemToggle = (item: Item) => {
        onChange(item);
    };

    const filteredData = useMemo(() => {
        if (!searchable || !search.trim()) {
            return data;
        }
        const query = search.toLowerCase();
        return data.filter(item =>
            item.label.toLowerCase().includes(query) ||
            (item.description?.toLowerCase().includes(query) ?? false),
        );
    }, [data, search, searchable]);

    const isSelected = (value: string) => selectedItems.some(selected => selected.value === value);

    return (
        <MultiselectContainer ref={ref}>
            <MultiselectTrigger onClick={() => setExpanded(!expanded)}>
                <MultiselectContent>
                    {selectedItems.length === 0 ? 
                        <span>{placeholder}</span>
                     : 
                        selectedItems.map(item => {
                            const itemData = data.find(s => s.value === item.value);
                            return <SelectedItem key={item.value}>{itemData?.label || item.value}</SelectedItem>;
                        })
                    }
                </MultiselectContent>
                <DropdownArrow expanded={expanded} />
            </MultiselectTrigger>

            <MultiselectDropdown expanded={expanded}>
                {searchable && 
                    <SearchWrapper>
                        <SearchIcon>
                            <svg width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M13 13L9.5 9.5M11 6C11 8.76142 8.76142 11 6 11C3.23858 11 1 8.76142 1 6C1 3.23858 3.23858 1 6 1C8.76142 1 11 3.23858 11 6Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </SearchIcon>
                        <SearchInput
                            type="text"
                            placeholder="Search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                        />
                    </SearchWrapper>
                }
                {filteredData.length === 0 && <NoResults>No results found</NoResults>}
                {filteredData.map(item => 
                    <MultiselectOption
                        key={item.value}
                        checked={isSelected(item.value)}
                        onClick={() => handleItemToggle(item)}
                    >
                        <StyledCheckbox
                            type="checkbox"
                            checked={isSelected(item.value)}
                            onChange={() => {}}
                        />
                        <OptionText>
                            <OptionTitle>{item.label}</OptionTitle>
                            {item.description && 
                                <OptionDescription checked={isSelected(item.value)}>
                                    <span>{item.description}</span>
                                </OptionDescription>
                            }
                        </OptionText>
                    </MultiselectOption>,
                )}
            </MultiselectDropdown>
        </MultiselectContainer>
    );
};
