import {FlexWrapper, Row} from "./Filters.style";
import {AssetType} from "@stem/network/api/asset";
import {AssetRef} from "@stem/editor-oss/asset-management/AssetRef";
import {useLibrariesContext} from "@stem/editor-oss/context";
import {BasicComboboxNoPortal} from "../../common/BasicCombobox/BasicComboboxNoPortal";
import {SearchInput} from "../../common/SearchInput";
import {StyledButton} from "../../common/StyledButton";
import {StyledSwitch} from "../../common/StyledSwitch";
import {useImportAssets, useImportBehaviors} from "../services";

export const Filters = ({isFullScreen}: {isFullScreen: boolean}) => {
    const importAssets = useImportAssets();
    const importBehaviors = useImportBehaviors();
    const {
        assetsToAdd,
        setAssetsToAdd,
        filterValues,
        setFilterValues,
        visibleFilters,
        allAssetsSelected,
        setAllAssetsSelected,
        isSceneTab,
        showTagsFilter,
        tagSearch,
        setTagSearch,
    } = useLibrariesContext();

    const areAssetsSelected = assetsToAdd.length > 0;

    const handleChange = (index: number, value: any) => {
        const newValues = [...filterValues];
        newValues[index] = value;
        setFilterValues(newValues);
    };

    const handleImportAssets = async () => {
        const behaviorAssetRefs: AssetRef[] = [];
        const assetRefs: AssetRef[] = [];
        const reset = () => {
            setAllAssetsSelected(false);
            setAssetsToAdd([]);
        };
        assetsToAdd.forEach(asset => {
            if (asset.type === AssetType.Behavior) {
                behaviorAssetRefs.push({
                    assetId: asset.id,
                    revisionId: (asset as any).importRevisionId || asset.headRevisionId,
                });
            } else {
                assetRefs.push({
                    assetId: asset.id,
                    revisionId: (asset as any).importRevisionId || asset.headRevisionId,
                });
            }
        });
        try {
            if (assetRefs.length > 0) {
                await importAssets(assetRefs);
            }
            if (behaviorAssetRefs.length > 0) {
                await importBehaviors(behaviorAssetRefs);
            }
        } catch (error) {
            console.error("[handleImportAssets]:", error);
        }
        reset();
    };

    return (
        <Row $isFullScreen={isFullScreen}>
            <FlexWrapper>
                {visibleFilters.map((filter, index) => (
                    <BasicComboboxNoPortal
                        key={filter.label}
                        data={filter.options}
                        value={filterValues[index]}
                        customInputValue={filterValues[index]?.value === "All" ? filter.label : undefined}
                        onChange={item => handleChange(index, item)}
                        disableTyping
                    />
                ))}
                {showTagsFilter && (
                    <SearchInput
                        width="120px"
                        height="24px"
                        alwaysOpen
                        placeholder="Tags"
                        value={tagSearch}
                        onChange={value => setTagSearch(value.toLowerCase())}
                    />
                )}
            </FlexWrapper>
            {!isSceneTab && (
                <FlexWrapper>
                    <label>All</label>
                    <StyledSwitch checked={allAssetsSelected} onChange={() => setAllAssetsSelected(prev => !prev)} />
                    <StyledButton
                        width="auto"
                        height="21px"
                        style={{padding: "4px 16px"}}
                        isGrey={!areAssetsSelected}
                        isBlue={areAssetsSelected}
                        disabled={!areAssetsSelected}
                        onClick={handleImportAssets}>
                        Add {areAssetsSelected && <span>{assetsToAdd.length} Selected</span>}
                    </StyledButton>
                </FlexWrapper>
            )}
        </Row>
    );
};
