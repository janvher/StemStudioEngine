import {useState} from "react";

import {Input, Label, Property} from "./AssetTagsInput.style";
import addIcon from "./icons/add.svg";
import enterIcon from "./icons/enter.svg";
import {TagsList} from "./TagsList/TagsList";
import {TagIcon} from "./TagsList/TagsList.style";
import {showToast} from "@stem/editor-oss/showToast";
import {DetectDevice} from "@stem/editor-oss/utils/DetectDevice";
import {
    canAddTag,
    invalidTagCharsRegex,
    normalizeTag,
    validateTag,
} from "../../AssetsLibrary/BehaviorCreator/BehaviorConfigEditor/helpers";

interface Props {
    showLabel?: boolean;
    tags?: string[];
    onTagsAdded: (newTags: string[]) => void;
    onTagDeleted: (tagToDelete: string) => void;
}

export const AssetTagsInput = ({showLabel, tags, onTagsAdded, onTagDeleted}: Props) => {
    const isMobileDevice = DetectDevice.isMobile();
    const [tagValue, setTagValue] = useState("");
    const showLabelResolved = showLabel ?? true;

    const handleAddTag = (tagToAdd: string) => {
        const tagsToAdd = tagToAdd
            .split(/\s*,\s*/)
            .map(normalizeTag)
            .filter(Boolean);

        if (!tagsToAdd.length) return;

        // Remove already existing tags
        const uniqueTags = tagsToAdd.filter(tag => !tags?.includes(tag));

        if (!uniqueTags.length) return;

        const passedTags = tags || [];
        const allTagsArray = Array.from(new Set([...passedTags, ...uniqueTags]));

        if (!canAddTag(allTagsArray)) {
            showToast({
                type: "error",
                title: "Maximum 20 tags allowed per asset",
            });
            return;
        }

        for (const tag of uniqueTags) {
            const validationError = validateTag(tag);
            if (validationError) {
                showToast({
                    type: "error",
                    title: validationError,
                });
                return;
            }
        }

        onTagsAdded(allTagsArray);

        // Remove added tags from input
        // when adding a tag by clicking on a 'ghost tag' object, we should clean only that tag from the input
        setTagValue(prev => {
            const remaining = prev
                .split(/\s*,\s*/)
                .map(normalizeTag)
                .filter(tag => !uniqueTags.includes(tag));

            return remaining.join(", ");
        });
    };

    return (
        <Property>
            {showLabelResolved && <Label>Tags</Label>}
            <Property>
                <Input
                    value={tagValue || ""}
                    setValue={value => {
                        if (invalidTagCharsRegex.test(value)) return;
                        setTagValue(value);
                    }}
                    placeholder="Enter a tag"
                    onEnter={() => handleAddTag(tagValue)}
                    $mobile={isMobileDevice}
                />
                <TagIcon
                    className={`inputIcon ${!isMobileDevice && "enterIcon"}`}
                    src={isMobileDevice ? addIcon : enterIcon}
                    alt="add"
                    onClick={() => handleAddTag(tagValue)}
                />
            </Property>
            {tags && (
                <TagsList
                    stemTags={tags}
                    fullWidth
                    onDelete={tag => onTagDeleted(tag)}
                    suggestedTags={tagValue
                        .split(",")
                        .map(tag => tag.trim())
                        .filter(Boolean)}
                    onAdd={handleAddTag}
                />
            )}
        </Property>
    );
};
