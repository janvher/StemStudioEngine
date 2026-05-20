import {describe, expect, it} from "vitest";

import {buildRemixableProjectList, combineUniqueProjects, sortByMostRecentCreation} from "./projectSorting";
import {FileData} from "../types/file";

const createProject = (overrides: Partial<FileData>): FileData => ({
    ID: overrides.ID || "project-id",
    publishRevisionId: "",
    AssetID: null,
    UserID: "user-1",
    Name: overrides.Name || "Project",
    Description: "",
    PlayCount: 0,
    RemixCount: 0,
    Tags: "",
    Thumbnail: "",
    Url: "",
    UpdateTime: overrides.UpdateTime || "",
    IsSandbox: false,
    IsPublished: false,
    ...overrides,
});

describe("projectSorting", () => {
    it("sorts projects by creation date with newest first", () => {
        const projects = [
            createProject({ID: "old", CreateTime: "2026-04-10T00:00:00.000Z", UpdateTime: "2026-04-10T00:00:00.000Z"}),
            createProject({ID: "new", CreateTime: "2026-04-12T00:00:00.000Z", UpdateTime: "2026-04-12T00:00:00.000Z"}),
            createProject({ID: "middle", CreateTime: "2026-04-11T00:00:00.000Z", UpdateTime: "2026-04-11T00:00:00.000Z"}),
        ];

        expect([...projects].sort(sortByMostRecentCreation).map(project => project.ID)).toEqual(["new", "middle", "old"]);
    });

    it("falls back to update time when creation dates match", () => {
        const projects = [
            createProject({ID: "older-update", CreateTime: "2026-04-12T00:00:00.000Z", UpdateTime: "2026-04-12T01:00:00.000Z"}),
            createProject({ID: "newer-update", CreateTime: "2026-04-12T00:00:00.000Z", UpdateTime: "2026-04-12T02:00:00.000Z"}),
        ];

        expect([...projects].sort(sortByMostRecentCreation).map(project => project.ID)).toEqual([
            "newer-update",
            "older-update",
        ]);
    });

    it("combines active and archived projects without duplicates", () => {
        const active = createProject({ID: "active"});
        const archived = createProject({ID: "archived", IsArchived: true});

        expect(combineUniqueProjects([active], [archived, active]).map(project => project.ID)).toEqual([
            "active",
            "archived",
        ]);
    });

    it("builds the default remix list with templates first in configured order and no duplicates", () => {
        const templateB = createProject({ID: "template-b", Name: "Template B", IsCloneable: false});
        const templateA = createProject({ID: "template-a", Name: "Template A"});
        const owned = createProject({ID: "owned", IsCloneable: false});
        const duplicateCommunityTemplate = createProject({
            ID: "template-a",
            IsPublished: true,
            IsCloneable: true,
        });
        const community = createProject({ID: "community", IsPublished: true, IsCloneable: true});
        const nonRemixableCommunity = createProject({ID: "locked", IsPublished: true, IsCloneable: false});
        const legacyMissingCloneable = createProject({ID: "legacy-missing", IsPublished: true});

        const result = buildRemixableProjectList({
            templates: [templateA, templateB],
            templateIds: ["template-b", "template-a"],
            myProjects: [owned],
            communityProjects: [duplicateCommunityTemplate, community, nonRemixableCommunity, legacyMissingCloneable],
        });

        expect(result.map(project => project.ID)).toEqual(["template-b", "template-a", "owned", "community"]);
        expect(result[0]?.IsCloneable).toBe(true);
    });

    it("sorts the remix list by remix count when requested", () => {
        const projects = buildRemixableProjectList({
            templates: [createProject({ID: "template", RemixCount: 2, UpdateTime: "2026-04-10T00:00:00.000Z"})],
            myProjects: [createProject({ID: "owned", RemixCount: 8, UpdateTime: "2026-04-11T00:00:00.000Z"})],
            communityProjects: [
                createProject({
                    ID: "community",
                    RemixCount: 5,
                    IsPublished: true,
                    IsCloneable: true,
                    UpdateTime: "2026-04-12T00:00:00.000Z",
                }),
            ],
            filter: "most_remixed",
        });

        expect(projects.map(project => project.ID)).toEqual(["owned", "community", "template"]);
    });

    it("sorts the remix list by recent update and play count", () => {
        const commonProjects = {
            templates: [createProject({ID: "template", PlayCount: 1, UpdateTime: "2026-04-10T00:00:00.000Z"})],
            myProjects: [createProject({ID: "owned", PlayCount: 20, UpdateTime: "2026-04-12T00:00:00.000Z"})],
            communityProjects: [
                createProject({
                    ID: "community",
                    PlayCount: 10,
                    IsPublished: true,
                    IsCloneable: true,
                    UpdateTime: "2026-04-11T00:00:00.000Z",
                }),
            ],
        };

        expect(buildRemixableProjectList({...commonProjects, filter: "most_recent"}).map(project => project.ID)).toEqual([
            "owned",
            "community",
            "template",
        ]);
        expect(buildRemixableProjectList({...commonProjects, filter: "most_played"}).map(project => project.ID)).toEqual([
            "owned",
            "community",
            "template",
        ]);
    });
});
