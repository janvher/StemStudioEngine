import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";

import {getTemplateIds, setTemplateIds as apiSetTemplateIds} from "./index";
import {setTemplateIds as updateTemplateIdsCache} from "@web-shared/utils/isTemplateScene";

export const templateKeys = {
    all: ["templates"] as const,
    ids: () => [...templateKeys.all, "ids"] as const,
};

const envTemplateIds = (process.env.REACT_APP_PROJECT_TEMPLATES || "").split(",").filter(Boolean);

export const useTemplateIds = () => {
    return useQuery({
        queryKey: templateKeys.ids(),
        queryFn: async () => {
            const ids = await getTemplateIds();
            // Fall back to env var IDs when the database has no templates configured
            const resolved = ids.length > 0 ? ids : envTemplateIds;
            updateTemplateIdsCache(resolved);
            return resolved;
        },
        staleTime: 5 * 60 * 1000,
        placeholderData: () => envTemplateIds,
    });
};

export const useSetTemplateIds = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (sceneIds: string[]) => apiSetTemplateIds(sceneIds),
        onSuccess: (data) => {
            queryClient.setQueryData(templateKeys.ids(), data);
            updateTemplateIdsCache(data);
        },
    });
};
