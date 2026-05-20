/* eslint-disable @typescript-eslint/no-explicit-any */
import {beforeEach, describe, expect, it, vi} from "vitest";

vi.mock("@web-shared/utils/Ajax", () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        ajaxDelete: vi.fn(),
    },
}));

vi.mock("@web-shared/utils/UrlUtils", () => ({
    backendUrlFromPath: (path: string) => `http://test${path}`,
}));

import Ajax from "@web-shared/utils/Ajax";
import {
    AvatarCapReachedError,
    createMyComposedAvatar,
    createMyPremadeAvatar,
    getDefaultUserAvatarModel,
    listMyAvatars,
} from "./index";

const mockedGet = Ajax.get as unknown as ReturnType<typeof vi.fn>;
const mockedPost = Ajax.post as unknown as ReturnType<typeof vi.fn>;

describe("api/avatarCreator", () => {
    beforeEach(() => {
        mockedGet.mockReset();
        mockedPost.mockReset();
    });

    describe("listMyAvatars", () => {
        it("returns the records array from the response", async () => {
            mockedGet.mockResolvedValueOnce({
                status: 200,
                data: [{id: "1", userId: "u", type: "premade", createdAt: "", updatedAt: ""}],
            });
            const out = await listMyAvatars();
            expect(out).toHaveLength(1);
            expect(mockedGet).toHaveBeenCalledWith({
                url: "http://test/api/avatarCreator/user/avatars",
            });
        });

        it("returns [] when response is not an array", async () => {
            mockedGet.mockResolvedValueOnce({status: 200, data: null});
            expect(await listMyAvatars()).toEqual([]);
        });

        it("throws on non-2xx", async () => {
            mockedGet.mockResolvedValueOnce({status: 500, data: null});
            await expect(listMyAvatars()).rejects.toThrow(/Failed to list my avatars/);
        });
    });

    describe("createMyPremadeAvatar", () => {
        it("posts with type=premade and provided fields", async () => {
            mockedPost.mockResolvedValueOnce({
                status: 201,
                data: {id: "rec-1", userId: "u", type: "premade", createdAt: "", updatedAt: ""},
            });
            const out = await createMyPremadeAvatar({
                assetId: "asset-1",
                revisionId: "rev-1",
                name: "Hero",
            });
            expect(out.id).toBe("rec-1");
            expect(mockedPost).toHaveBeenCalledTimes(1);
            const arg = mockedPost.mock.calls[0]?.[0];
            expect(arg.url).toBe("http://test/api/avatarCreator/user/avatars");
            expect(JSON.parse(arg.data)).toEqual({
                type: "premade",
                assetId: "asset-1",
                revisionId: "rev-1",
                name: "Hero",
            });
        });

        it("throws AvatarCapReachedError on 409", async () => {
            mockedPost.mockResolvedValueOnce({status: 409, data: null});
            await expect(createMyPremadeAvatar({assetId: "x"})).rejects.toBeInstanceOf(
                AvatarCapReachedError,
            );
        });
    });

    describe("createMyComposedAvatar", () => {
        it("posts with type=composed, parts, skinTone, avatarStyle", async () => {
            mockedPost.mockResolvedValueOnce({
                status: 201,
                data: {id: "rec-2", userId: "u", type: "composed", createdAt: "", updatedAt: ""},
            });
            const out = await createMyComposedAvatar({
                parts: [{group: "Body", assetId: "body-1"}],
                skinTone: "#abc",
                avatarStyle: "garden_party",
                name: "C1",
            });
            expect(out.id).toBe("rec-2");
            const arg = mockedPost.mock.calls[0]?.[0];
            expect(JSON.parse(arg.data)).toEqual({
                type: "composed",
                parts: [{group: "Body", assetId: "body-1"}],
                skinTone: "#abc",
                avatarStyle: "garden_party",
                name: "C1",
            });
        });

        it("throws AvatarCapReachedError on 409", async () => {
            mockedPost.mockResolvedValueOnce({status: 409, data: null});
            await expect(
                createMyComposedAvatar({parts: [{group: "Body", assetId: "x"}]}),
            ).rejects.toBeInstanceOf(AvatarCapReachedError);
        });
    });

    describe("getDefaultUserAvatarModel", () => {
        it("returns undefined when there's no default", async () => {
            // GET /api/avatarCreator/user/avatars/default returns non-2xx
            mockedGet.mockResolvedValueOnce({status: 404, data: null});
            expect(await getDefaultUserAvatarModel()).toBeUndefined();
        });

        it("returns premade branch when default is a premade pointer", async () => {
            mockedGet
                // first call: getMyDefaultAvatar
                .mockResolvedValueOnce({
                    status: 200,
                    data: {
                        id: "rec-1",
                        userId: "u",
                        type: "premade",
                        assetId: "asset-1",
                        revisionId: "rev-1",
                        createdAt: "",
                        updatedAt: "",
                    },
                })
                // second call: /api/asset?ids=...&include=data
                .mockResolvedValueOnce({
                    status: 200,
                    data: {assets: [{id: "asset-1", dataUrl: "https://cdn/x.glb", format: "glb"}]},
                });

            const out = await getDefaultUserAvatarModel();
            expect(out).toEqual({
                type: "premade",
                assetId: "asset-1",
                revisionId: "rev-1",
                url: "https://cdn/x.glb",
                format: "glb",
            });
        });

        it("returns composed branch when default is composed", async () => {
            mockedGet.mockResolvedValueOnce({
                status: 200,
                data: {
                    id: "rec-2",
                    userId: "u",
                    type: "composed",
                    parts: [{group: "Body", assetId: "body-1"}],
                    skinTone: "#abc",
                    avatarStyle: "garden_party",
                    createdAt: "",
                    updatedAt: "",
                },
            });
            const out = await getDefaultUserAvatarModel();
            expect(out).toEqual({
                type: "composed",
                parts: [{group: "Body", assetId: "body-1"}],
                skinTone: "#abc",
                avatarStyle: "garden_party",
            });
        });

        it("returns undefined for premade default with no dataUrl resolvable", async () => {
            mockedGet
                .mockResolvedValueOnce({
                    status: 200,
                    data: {id: "rec-1", userId: "u", type: "premade", assetId: "asset-1", createdAt: "", updatedAt: ""},
                })
                .mockResolvedValueOnce({status: 200, data: {assets: []}});
            expect(await getDefaultUserAvatarModel()).toBeUndefined();
        });
    });
});
