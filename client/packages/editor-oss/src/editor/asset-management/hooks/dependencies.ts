import { useCreateAssetRelease, useGetAssetReleases, useGetAssetRevision } from './assets';
import { AssetRef } from '@stem/editor-oss/asset-management/AssetRef';

export const useGetUnreleasedAssetDependencies = () => {
    const getAssetRevision = useGetAssetRevision();

    const depthFirstSearch = async (
        assetId: string,
        revisionId: string,
        unreleased: AssetRef[],
        visited: Set<string>,
    ) => {
        const key = `${assetId}:${revisionId}`;
        if (visited.has(key)) {
            return;
        }
        visited.add(key);

        const revision = await getAssetRevision(assetId, revisionId, {
            includeDependencies: true,
            includeRelease: true,
        });

        // Released revisions cannot have unreleased dependencies
        if (revision.release) {
            return;
        }

        // Add the current asset as an unreleased dependency
        unreleased.push({ assetId, revisionId });

        // If this revision has no dependencies, we're done
        if (!revision.dependencies) {
            return;
        }

        // Recursively search the dependencies
        for (const dependencyAssetId of Object.keys(revision.dependencies)) {
            const dependencyRevisionId = revision.dependencies[dependencyAssetId]!;
            await depthFirstSearch(dependencyAssetId, dependencyRevisionId, unreleased, visited);
        }
    };

    const getUnreleasedAssetDependencies = async (assetId: string, revisionId: string) => {
        const unreleased: AssetRef[] = [];
        const visited = new Set<string>();
        await depthFirstSearch(assetId, revisionId, unreleased, visited);

        // Remove the current asset from the list of unreleased dependencies
        unreleased.shift();
        
        return unreleased;
    };

    return getUnreleasedAssetDependencies;
};

export const useGetLatestAssetRelease = () => {
    const getAssetReleases = useGetAssetReleases();

    return async (assetId: string) => {
        const releases = await getAssetReleases(assetId, { limit: 1 });
        if (releases.length === 0) {
            return null;
        }

        return releases[0];
    };
};

export const useAutoCreateAssetReleases = () => {
    const createAssetRelease = useCreateAssetRelease();
    const getLatestAssetRelease = useGetLatestAssetRelease();

    const autoCreateAssetReleases = async (assetRefs: AssetRef[]) => {
        for (const { assetId, revisionId } of assetRefs) {
            const latestRelease = await getLatestAssetRelease(assetId);
            const nextVersion = {
                major: latestRelease?.versionMajor ?? 0,
                minor: latestRelease?.versionMinor ?? 0,
                patch: (latestRelease?.versionPatch ?? 0) + 1,
            };

            await createAssetRelease.mutateAsync({
              assetId,
              revisionId,
              version: nextVersion,
              description: "Automatically published",
            });
        }
    };

    return autoCreateAssetReleases;
};
