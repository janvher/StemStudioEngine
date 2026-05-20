import {useEffect, useState} from "react";

import global from "@stem/editor-oss/global";
import TagUtil from "@stem/editor-oss/utils/TagUtil";
import {AssetTagsInput} from "../../common/Tags/AssetTagsInput";
import "../css/SwitchSection.css";

interface Props {
    isLocked?: boolean;
}

export const ObjectTagsSection = ({isLocked: _isLocked}: Props) => {
    const app = global.app;
    const editor = app?.editor;
    const [tags, setTags] = useState<string[]>([]);

    const handleAddTag = (newTagsArray: string[]) => {
        if (!editor?.selected || !app || Array.isArray(editor.selected)) return;

        TagUtil.addTag(editor.selected, newTagsArray);

        const updatedTags = TagUtil.getTags(editor.selected);
        setTags([...updatedTags]);

        app.call(`objectChanged`, editor.selected, editor.selected);
    };

    const handleRemoveTag = (tagToRemove: string) => {
        if (!editor?.selected || !app || Array.isArray(editor.selected)) return;

        TagUtil.removeTag(editor.selected, tagToRemove);

        const updatedTags = TagUtil.getTags(editor.selected);
        setTags([...updatedTags]);
    };

    useEffect(() => {
        if (!editor || !app) return;

        const handleObjectSelected = () => {
            if (editor?.selected && !Array.isArray(editor.selected)) {
                setTags(TagUtil.getTags(editor.selected));
            } else {
                setTags([]);
            }
        };

        const handleObjectChanged = () => {
            if (editor?.selected && !Array.isArray(editor.selected)) {
                setTags(TagUtil.getTags(editor.selected));
            } else {
                setTags([]);
            }
        };

        handleObjectSelected();

        app.on("objectSelected.ObjectTagsSection", handleObjectSelected);
        app.on("objectChanged.ObjectTagsSection", handleObjectChanged);

        return () => {
            app.on("objectSelected.ObjectTagsSection", null);
            app.on("objectChanged.ObjectTagsSection", null);
        };
    }, [editor, app]);

    if (!editor?.selected || Array.isArray(editor.selected)) return null;

    return <AssetTagsInput tags={tags}
        onTagsAdded={handleAddTag}
        onTagDeleted={handleRemoveTag}
           />;
};
