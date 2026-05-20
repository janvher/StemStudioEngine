import {useEffect, useState} from "react";

import {useAssetRevisions} from "../../../../../editor/asset-management/hooks/assets";
import {getDateString, getVersionString} from "../../AssetsLibrary/services";
import {BasicComboboxNoPortal, getComboboxItem} from "../BasicCombobox/BasicComboboxNoPortal";

interface Props {
    assetId: string;
    currentRevisionId: string;
    selectedRevisionId?: string;
    onChange: (newRevisionId: string) => void;
    creatingNewRevision?: boolean;
    disabled?: boolean;
}

const selectKey = "stemVersion";

export const RevisionSelect = ({
    selectedRevisionId,
    onChange,
    assetId,
    currentRevisionId,
    creatingNewRevision,
    disabled,
}: Props) => {
    const {data: revisionsData} = useAssetRevisions(assetId, {
        includeRelease: true,
    });
    const currentID = revisionsData?.revisions?.find(el => el.id === currentRevisionId)?.id;
    const selectedVersion = getVersionString(
        revisionsData?.revisions?.find(el => el.id === selectedRevisionId)?.release,
    );
    const selectedRevisionTime = revisionsData?.revisions?.find(el => el.id === selectedRevisionId)?.createTime;
    const [originalRevisionId, setOriginalRevisionId] = useState<string>();

    useEffect(() => {
        onChange(currentID || "");
    }, [revisionsData]);

    useEffect(() => {
        if (!originalRevisionId) {
            setOriginalRevisionId(revisionsData?.revisions?.find(el => el.id === currentRevisionId)?.id);
        }
    }, [revisionsData?.revisions]);

    useEffect(() => {
        if (disabled && originalRevisionId) {
            onChange(originalRevisionId);
        }
    }, [disabled]);

    if (!revisionsData) return;

    return (
        <BasicComboboxNoPortal
            data={getComboboxItem(
                revisionsData.revisions.map(el => `${getVersionString(el.release)} ${getDateString(el.createTime)}`),
                selectKey,
                revisionsData.revisions.map(el => el.id),
            )}
            value={
                creatingNewRevision
                    ? {value: "CREATE NEW VERSION", key: selectKey}
                    : {
                          value: `${selectedVersion} ${selectedRevisionTime ? getDateString(selectedRevisionTime) : ""}`,
                          key: selectKey,
                      }
            }
            onChange={item => onChange(item.uuid!)}
            disableTyping
            customBgColor="#3F3F46"
            customRadius="4px"
            customColor="#f8fafccc"
            disabled={disabled}
        />
    );
};
