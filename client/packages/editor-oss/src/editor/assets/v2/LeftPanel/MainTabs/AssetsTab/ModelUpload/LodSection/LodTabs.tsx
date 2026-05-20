import { Tooltip } from "../../../../../common/Tooltip";
import { LodLevel } from '../types';
import { SingleTab, Tabs, Title } from "./LodTabs.style";

const LOD_LEVELS = [LodLevel.Lod1, LodLevel.Lod2, LodLevel.Lod3];

type LodTabsProps = {
    maxLodLevel: LodLevel;
    activeLodLevel: LodLevel;
    setActiveLodLevel: (tab: LodLevel) => void;
    compact?: boolean;
};

export const LodTabs = ({
    maxLodLevel,
    activeLodLevel,
    setActiveLodLevel,
    compact,
}: LodTabsProps) => {
    // Don't render LOD tabs if LOD is not supported for this file type
    if (maxLodLevel === LodLevel.Original) {
        return null;
    }

    return (
        <>
            <Tooltip text="Optimizes models by creating 3 LOD derivatives based on your configuration. Helps with performance on mobiles and slower devices."
                height="auto"
            >
                <Title $compact={compact}>Optimize Models</Title>
            </Tooltip>
            <Tabs style={{ display: "flex", gap: "10px" }}>
                <SingleTab
                    $active={activeLodLevel === LodLevel.Original}
                    onClick={() => setActiveLodLevel(LodLevel.Original)}
                >
                    Original
                </SingleTab>

                {LOD_LEVELS.map((lodLevel) => {
                    const isAvailable = lodLevel <= maxLodLevel;

                    return (
                        <SingleTab
                            key={lodLevel}
                            $active={activeLodLevel === lodLevel}
                            disabled={!isAvailable}
                            style={{ textDecoration: isAvailable ? "none" : "line-through" }}
                            onClick={() => isAvailable && setActiveLodLevel(lodLevel)}
                        >
                            LOD {lodLevel}
                        </SingleTab>
                    );
                })}
            </Tabs>
        </>
    );
};
