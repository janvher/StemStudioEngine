import {RefObject, useRef, useState} from "react";
import {useOnClickOutside} from "usehooks-ts";

import {TagIcon, Tag, TagsContainer} from "./TagsList.style";
import addIcon from "../icons/add.svg";
import deleteIcon from "../icons/delete.svg";

type TagOperationType = (tag: string) => void;

interface MainProps {
    stemTags: string[];
    fullWidth?: boolean;
    onDelete?: TagOperationType;
    onAdd?: TagOperationType;
    readOnly?: boolean;
    oneLine?: boolean;
    customColor?: string;
    suggestedTags?: string[];
}

export const TagsList = ({
    stemTags,
    fullWidth,
    suggestedTags,
    onDelete,
    readOnly,
    onAdd,
    oneLine,
    customColor,
}: MainProps) => {
    const safeTags = Array.isArray(stemTags) ? stemTags : [];
    return (
        <TagsContainer
            $fullWidth={fullWidth}
            $oneLine={oneLine}
        >
            {safeTags?.map((tag, index) => (
                <SingleTag
                    key={tag}
                    isFirst={index === 0}
                    tag={tag}
                    onDelete={onDelete}
                    readOnly={readOnly}
                    customColor={customColor}
                />
            ))}
            {suggestedTags?.map((suggested, index) => (
                <SingleTag
                    key={suggested}
                    isFirst={index === 0}
                    tag={suggested}
                    onAdd={onAdd}
                    isSuggested
                />
            ))}
        </TagsContainer>
    );
};

interface SingleTagProps extends Pick<MainProps, "onDelete" | "onAdd" | "readOnly"> {
    tag: string;
    isFirst: boolean;
    isSuggested?: boolean;
    customColor?: string;
}

export const SingleTag = ({tag, isFirst, onDelete, readOnly, onAdd, isSuggested, customColor}: SingleTagProps) => {
    const [active, setActive] = useState(false);
    const tagRef = useRef<null | HTMLDivElement>(null);
    useOnClickOutside(tagRef as RefObject<HTMLDivElement>, () => setActive(false));

    return (
        <Tag
            ref={tagRef}
            $template={!!isSuggested}
            $first={isFirst}
            $active={!!active}
            $readOnly={!!readOnly}
            $customColor={customColor}
            onClick={readOnly ? undefined : onAdd ? () => onAdd(tag) : () => setActive(prev => !prev)}
        >
            {tag.toLowerCase()}
            {onDelete && active && (
                <TagIcon
                    src={deleteIcon}
                    alt="delete"
                    onClick={() => onDelete(tag)}
                />
            )}
            {onAdd && isSuggested && (
                <TagIcon
                    src={addIcon}
                    alt="add"
                    onClick={() => onAdd(tag)}
                />
            )}
        </Tag>
    );
};
