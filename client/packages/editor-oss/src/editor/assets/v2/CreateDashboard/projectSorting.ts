import {FileData} from "../types/file";

const getTimestamp = (value?: string) => (value ? new Date(value).getTime() : 0);

export type RemixFilterType = "template_order" | "most_remixed" | "most_recent" | "most_played";

export const sortByMostRecentUpdate = (a: FileData, b: FileData) =>
    getTimestamp(b.UpdateTime) - getTimestamp(a.UpdateTime);

export const sortByMostRecentCreation = (a: FileData, b: FileData) => {
    const createdDiff = getTimestamp(b.CreateTime) - getTimestamp(a.CreateTime);
    if (createdDiff !== 0) return createdDiff;

    return sortByMostRecentUpdate(a, b);
};

export const sortProjectsByMetric = (projects: FileData[], getValue: (project: FileData) => number) => {
    return [...projects].sort((a, b) => {
        const valueDiff = getValue(b) - getValue(a);
        if (valueDiff !== 0) return valueDiff;

        return sortByMostRecentUpdate(a, b);
    });
};

export const combineUniqueProjects = (...projectGroups: Array<FileData[] | undefined>) => {
    const seen = new Set<string>();

    return projectGroups
        .flatMap(group => group ?? [])
        .filter(project => {
            if (seen.has(project.ID)) return false;
            seen.add(project.ID);
            return true;
        });
};

type RemixableProjectListOptions = {
    templates?: FileData[];
    templateIds?: string[];
    myProjects?: FileData[];
    collaborativeProjects?: FileData[];
    communityProjects?: FileData[];
    filter?: RemixFilterType;
};

const sortByTemplateOrder = (templateIds: string[]) => {
    const order = new Map(templateIds.map((id, index) => [String(id), index]));

    return (a: FileData, b: FileData) => {
        const aOrder = order.get(String(a.ID)) ?? Number.MAX_SAFE_INTEGER;
        const bOrder = order.get(String(b.ID)) ?? Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;

        return sortByMostRecentUpdate(a, b);
    };
};

const isActiveProject = (project: FileData) => project.IsArchived !== true;

const isPublishedRemixableCommunityProject = (project: FileData) =>
    isActiveProject(project) && project.IsPublished === true && project.IsCloneable === true;

const withTemplateCloneableFlag = (project: FileData) => ({...project, IsCloneable: true});

export const buildRemixableProjectList = ({
    templates = [],
    templateIds = [],
    myProjects = [],
    collaborativeProjects = [],
    communityProjects = [],
    filter = "template_order",
}: RemixableProjectListOptions) => {
    const seen = new Set<string>();
    const ordered: FileData[] = [];
    const orderedTemplates = [...templates]
        .filter(project => project.ID && isActiveProject(project))
        .sort(sortByTemplateOrder(templateIds))
        .map(withTemplateCloneableFlag);

    const addProject = (project: FileData) => {
        if (!project.ID || seen.has(project.ID)) return;
        seen.add(project.ID);
        ordered.push(project);
    };

    for (const template of orderedTemplates) {
        addProject(template);
    }

    for (const project of myProjects) {
        if (!isActiveProject(project)) continue;
        addProject(project);
    }

    for (const project of collaborativeProjects) {
        if (!isActiveProject(project)) continue;
        addProject(project);
    }

    for (const project of communityProjects) {
        if (!isPublishedRemixableCommunityProject(project)) continue;
        addProject(project);
    }

    switch (filter) {
        case "most_remixed":
            return sortProjectsByMetric(ordered, project => project.RemixCount ?? 0);
        case "most_recent":
            return [...ordered].sort(sortByMostRecentUpdate);
        case "most_played":
            return sortProjectsByMetric(ordered, project => project.PlayCount ?? 0);
        case "template_order":
        default:
            return ordered;
    }
};
