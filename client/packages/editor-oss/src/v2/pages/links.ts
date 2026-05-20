import {ROUTES} from "@web-shared/routes";

export const getGameUrl = (sceneID: string, slug: string | null) => {
    if (slug) {
        return `${slug}.${process.env.REACT_APP_DNS_SUFFIX?.replace(/^https?:\/\//, "") || "localhost"}`;
    }
    return ROUTES.PLAY.replace(":projectID", encodeURIComponent(sceneID));
};

export const generateProjectLink = (projectId?: string, options?: {readOnly?: boolean}) => {
    const params = new URLSearchParams(window.location.search);
    const hasFTUE = params.get("ftue");

    if (!projectId) {
        return ROUTES.CREATE_PROJECT;
    }

    const query = new URLSearchParams();
    if (hasFTUE) query.set("ftue", "true");
    if (options?.readOnly) query.set("readOnly", "1");

    const qs = query.toString();
    return `${ROUTES.CREATE_PROJECT}/${projectId}${qs ? `?${qs}` : ""}`;
};
