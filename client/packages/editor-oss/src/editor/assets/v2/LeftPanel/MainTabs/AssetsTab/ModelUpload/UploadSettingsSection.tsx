import { useState } from 'react';

import { LodTabContent } from './LodSection/LodTabContent';
import { LodTabs } from './LodSection/LodTabs';
import { ContentWrapper } from './ModelPreview.style';
import { OriginalTab } from './OriginalTab';
import { LodLevel, UploadSettings } from './types';

type LodSectionProps = {
    maxLodLevel: LodLevel;
    uploadSettings: UploadSettings;
    setUploadSettings: (settings: UploadSettings) => void;
};

export const UploadSettingsSection = ({
    maxLodLevel,
    uploadSettings,
    setUploadSettings,
}: LodSectionProps) => {
    const [activeLodLevel, setActiveLodLevel] = useState<LodLevel>(LodLevel.Original);

    const isOriginalTab = activeLodLevel === LodLevel.Original;
    const isVoxelized = uploadSettings.voxelize;

    return (
        <>
            {!isVoxelized && 
                <LodTabs
                    maxLodLevel={maxLodLevel}
                    activeLodLevel={activeLodLevel}
                    setActiveLodLevel={setActiveLodLevel}
                />
            }
            {isOriginalTab || isVoxelized
                ?
                <ContentWrapper>
                    <OriginalTab
                        settings={uploadSettings}
                        setSettings={setUploadSettings}
                    />
                </ContentWrapper>
                : <LodTabContent
                        key={activeLodLevel}
                        lodSettings={uploadSettings.lodSettings[activeLodLevel - 1]!}
                        setLodSettings={(settings) => {
                        setUploadSettings({
                            ...uploadSettings,
                            lodSettings: [
                                ...uploadSettings.lodSettings.slice(0, activeLodLevel - 1),
                                settings,
                                ...uploadSettings.lodSettings.slice(activeLodLevel),
                            ],
                        });
                    }}
                  />
            }
        </>
    );
};
