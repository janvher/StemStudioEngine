import {useState} from "react";

import {useSetTemplateIds, useTemplateIds} from "@stem/network/api/templates/hooks";
import {showToast} from "@stem/editor-oss/showToast";
import {StyledButton} from "../../../common/StyledButton";
import trashIcon from "../../../icons/trash.svg";
import {AccountBox} from "../../SettingsPage/SettingsPage.style";
import {Settings, UserListContainer, UserListItem, ValidationTextArea} from "../AdminPanel.style";

export const Templates = () => {
    const {data: ids = [], isLoading} = useTemplateIds();
    const {mutateAsync: saveIds, isPending: saving} = useSetTemplateIds();
    const [inputValue, setInputValue] = useState("");

    const handleAdd = async () => {
        const newIds = inputValue
            .split(/[,\n]/)
            .map(id => id.trim())
            .filter(id => id && !ids.includes(id));

        if (newIds.length === 0) {
            showToast({type: "warning", title: "No new IDs to add."});
            return;
        }

        try {
            await saveIds([...ids, ...newIds]);
            setInputValue("");
            showToast({type: "success", title: "Templates updated."});
        } catch (error: any) {
            showToast({type: "error", title: error.message || "Failed to save templates."});
        }
    };

    const handleRemove = async (idToRemove: string) => {
        try {
            await saveIds(ids.filter(id => id !== idToRemove));
            showToast({type: "success", title: "Template removed."});
        } catch (error: any) {
            showToast({type: "error", title: error.message || "Failed to remove template."});
        }
    };

    return (
        <AccountBox className="box">
            <Settings>
                <label>Add Template Scene IDs</label>
                <ValidationTextArea
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    placeholder="Paste scene IDs separated by commas or newlines"
                    style={{height: "80px"}}
                />
                <StyledButton
                    isBlue
                    onClick={handleAdd}
                    disabled={saving || !inputValue.trim()}
                    height="40px"
                    width="auto"
                    style={{fontSize: "14px"}}
                >
                    Add Templates
                </StyledButton>
            </Settings>

            {isLoading ? (
                <label className="greyLabel">Loading...</label>
            ) : ids.length > 0 ? (
                <UserListContainer>
                    <label>Current Templates ({ids.length})</label>
                    {ids.map(id => (
                        <UserListItem
                            key={id}
                            style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}
                        >
                            <span style={{fontFamily: "monospace"}}>{id}</span>
                            <button
                                className="reset-css"
                                onClick={() => handleRemove(id)}
                                disabled={saving}
                                style={{cursor: "pointer", opacity: saving ? 0.5 : 1}}
                            >
                                <img src={trashIcon} alt="Remove" style={{width: "16px", height: "16px"}} />
                            </button>
                        </UserListItem>
                    ))}
                </UserListContainer>
            ) : (
                <label className="greyLabel">No templates configured.</label>
            )}
        </AccountBox>
    );
};
