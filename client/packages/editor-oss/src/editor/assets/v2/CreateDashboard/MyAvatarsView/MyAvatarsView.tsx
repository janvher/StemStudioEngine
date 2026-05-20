import React, {lazy, Suspense, useCallback, useEffect, useMemo, useState} from "react";

import {IS_OSS} from "@stem/editor-oss";
import {HiOutlinePencilSquare, HiOutlinePlus, HiOutlineStar, HiOutlineTrash, HiOutlineUserCircle} from "react-icons/hi2";
import {useTranslation} from "react-i18next";
import {useLocation, useNavigate} from "react-router-dom";
import {toast} from "toastywave";

import {
    ActionButton,
    ActionRow,
    AddCard,
    Card,
    DefaultBadge,
    EmptyState,
    Grid,
    NameLabel,
    PageContainer,
    PageHeading,
    PageSubtitle,
    Thumb,
} from "./MyAvatarsView.style";
import {
    MAX_USER_AVATARS,
    UserAvatarRecord,
    deleteMyAvatar,
    listMyAvatars,
    setMyDefaultAvatar,
} from "@stem/network/api/avatarCreator";
import {ROUTES} from "@web-shared/routes";
import {useAppGlobalContext} from "@stem/editor-oss/context";
import {showToast} from "@stem/editor-oss/showToast";
import {Confirm} from "../../../../../ui";
// Gated on IS_OSS so Vite tree-shakes AvatarCreator + MediaPipe out of OSS
// builds entirely. In OSS the component is a no-op; the my-avatars route is
// hidden via route gating but this protects callers that arrive here anyway.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AvatarCreator: any = IS_OSS
    ? lazy(async () => ({default: (() => null) as unknown as React.ComponentType<unknown>}))
    : lazy(() => import("../../AvatarCreator/AvatarCreator").then(m => ({default: m.AvatarCreator})));
import {Tooltip} from "../../common/Tooltip";

export const MyAvatarsView = () => {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const {setMainLoaderState} = useAppGlobalContext();
    const [avatars, setAvatars] = useState<UserAvatarRecord[]>([]);
    const [pending, setPending] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<UserAvatarRecord | null>(null);

    const onNewRoute = location.pathname === ROUTES.MY_AVATARS_NEW;
    const editMatch = location.pathname.match(/^\/my-avatars\/edit\/([^/]+)$/);
    const editId = editMatch ? editMatch[1] : null;
    const editingRecord = editId ? avatars.find(a => a.id === editId && a.type === "composed") : undefined;
    const atCap = avatars.length >= MAX_USER_AVATARS;
    const defaultRecord = avatars.find(a => a.isDefault);

    const refresh = useCallback(async () => {
        try {
            const list = await listMyAvatars();
            setAvatars(list);
        } catch (e: any) {
            showToast({type: "error", title: t("Failed to fetch avatars"), body: e?.message});
        }
    }, [t]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    useEffect(() => {
        setMainLoaderState({visible: pending, message: ""});
    }, [pending, setMainLoaderState]);

    const handleSetDefault = useCallback(
        async (avatar: UserAvatarRecord) => {
            if (avatar.isDefault) return;
            setPending(true);
            try {
                await setMyDefaultAvatar(avatar.id);
                toast.success(t("Default avatar updated"));
                await refresh();
            } catch (e: any) {
                showToast({type: "error", title: t("Failed to set default avatar"), body: e?.message});
            } finally {
                setPending(false);
            }
        },
        [refresh, t],
    );

    const handleConfirmDelete = useCallback(async () => {
        if (!confirmDelete) return;
        setPending(true);
        try {
            await deleteMyAvatar(confirmDelete.id);
            toast.success(t("Avatar deleted"));
            setConfirmDelete(null);
            await refresh();
        } catch (e: any) {
            showToast({type: "error", title: t("Failed to delete avatar"), body: e?.message});
        } finally {
            setPending(false);
        }
    }, [confirmDelete, refresh, t]);

    const handleAddNew = useCallback(() => {
        if (atCap) {
            showToast({
                type: "info",
                title: t("Avatar limit reached"),
                body: t("Delete one of your avatars to make room for a new one."),
            });
            return;
        }
        void navigate(ROUTES.MY_AVATARS_NEW);
    }, [atCap, navigate, t]);

    const handleCreatorClose = useCallback(() => {
        void navigate(ROUTES.MY_AVATARS);
        void refresh();
    }, [navigate, refresh]);

    // Under-cap /my-avatars/new mounts the AvatarCreator directly. At-cap shows a banner.
    // On /my-avatars/edit/:id we mount the creator in edit mode, hydrated from the record.
    const showAvatarCreator = (onNewRoute && !atCap) || !!editingRecord;
    const showCapBanner = onNewRoute && atCap;

    const cards = useMemo(
        () =>
            avatars.map(avatar => {
                const isDefault = !!avatar.isDefault;
                const label =
                    avatar.name && avatar.name.length > 0
                        ? avatar.name
                        : avatar.type === "premade"
                            ? t("Premade avatar")
                            : t("Composed avatar");
                return (
                    <Card
                        key={avatar.id}
                        $active={isDefault}
                    >
                        {avatar.thumbnail ? (
                            <Thumb
                                src={avatar.thumbnail}
                                alt={label}
                            />
                        ) : (
                            <HiOutlineUserCircle
                                size={64}
                                style={{opacity: 0.6}}
                            />
                        )}
                        {isDefault && <DefaultBadge>{t("Default")}</DefaultBadge>}
                        <NameLabel>{label}</NameLabel>
                        <ActionRow>
                            <Tooltip
                                text={t("Set as default")}
                                height="auto"
                            >
                                <ActionButton
                                    type="button"
                                    onClick={() => handleSetDefault(avatar)}
                                    disabled={isDefault || pending}
                                    aria-label={t("Set as default")}
                                >
                                    <HiOutlineStar />
                                </ActionButton>
                            </Tooltip>
                            {avatar.type === "composed" && (
                                <Tooltip
                                    text={t("Edit")}
                                    height="auto"
                                >
                                    <ActionButton
                                        type="button"
                                        onClick={() =>
                                            navigate(ROUTES.MY_AVATARS_EDIT.replace(":id", avatar.id))
                                        }
                                        disabled={pending}
                                        aria-label={t("Edit")}
                                    >
                                        <HiOutlinePencilSquare />
                                    </ActionButton>
                                </Tooltip>
                            )}
                            <Tooltip
                                text={t("Delete")}
                                height="auto"
                            >
                                <ActionButton
                                    type="button"
                                    onClick={() => setConfirmDelete(avatar)}
                                    disabled={pending}
                                    aria-label={t("Delete")}
                                >
                                    <HiOutlineTrash />
                                </ActionButton>
                            </Tooltip>
                        </ActionRow>
                    </Card>
                );
            }),
        [avatars, handleSetDefault, pending, t],
    );

    return (
        <>
            <PageContainer>
                <PageHeading>{t("My Avatars")}</PageHeading>
                <PageSubtitle>
                    {defaultRecord
                        ? t("Manage your avatars. Pick one as your default to use across StemStudio.")
                        : t("You have no default avatar yet. Pick one to use across StemStudio.")}
                </PageSubtitle>

                {showCapBanner && (
                    <PageSubtitle role="alert">
                        {t(
                            "You're at the {{max}} avatar limit. Delete one below to create another.",
                            {max: MAX_USER_AVATARS},
                        )}
                    </PageSubtitle>
                )}

                <Grid>
                    <AddCard
                        type="button"
                        onClick={handleAddNew}
                        disabled={atCap}
                        aria-label={atCap ? t("Avatar limit reached") : t("Add new avatar")}
                        title={
                            atCap
                                ? t("You can keep up to {{max}} avatars. Delete one to create a new avatar.", {
                                      max: MAX_USER_AVATARS,
                                  })
                                : undefined
                        }
                    >
                        <HiOutlinePlus />
                        {atCap
                            ? t("Limit reached ({{count}}/{{max}})", {
                                  count: avatars.length,
                                  max: MAX_USER_AVATARS,
                              })
                            : t("Add new ({{count}}/{{max}})", {
                                  count: avatars.length,
                                  max: MAX_USER_AVATARS,
                              })}
                    </AddCard>
                    {cards}
                    {avatars.length === 0 && (
                        <EmptyState>{t("You don't have any avatars yet. Add one to get started.")}</EmptyState>
                    )}
                </Grid>
            </PageContainer>

            {showAvatarCreator && (
                <Suspense fallback={null}>
                    <AvatarCreator
                        mode="user"
                        onRequestClose={handleCreatorClose}
                        topOffset={96}
                        editRecord={editingRecord}
                    />
                </Suspense>
            )}

            {confirmDelete && (
                <Confirm
                    onOK={handleConfirmDelete}
                    title={t("Delete this avatar?")}
                    cancelText={t("Cancel")}
                    okText={t("Delete")}
                    onCancel={() => setConfirmDelete(null)}
                    onClose={() => setConfirmDelete(null)}
                >
                    {t("\"{{name}}\" will be permanently deleted. This cannot be undone.", {
                        name: confirmDelete.name || t("This avatar"),
                    })}
                </Confirm>
            )}
        </>
    );
};
