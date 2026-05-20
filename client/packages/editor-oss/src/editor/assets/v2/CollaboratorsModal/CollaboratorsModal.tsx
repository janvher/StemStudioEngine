import {useEffect, useState} from "react";

import {
    Container,
    Nav,
    FlexWrapper,
    MainFlexWrapper,
    AddCollaboratorForm,
    CollaboratorItem,
    CollaboratorsList,
    EmptyMsg,
    ErrorMsg,
    RemoveButton,
} from "./CollaboratorsModal.style";
import {getSceneCollaborators, addSceneCollaborator, removeSceneCollaborator} from "@stem/network/api/scene";
import i18n from "@stem/editor-oss/i18n/config";
import x from "../AssetsLibrary/images/x.svg";
import {useEscapeDismiss} from "../common/hooks/useEscapeDismiss";
import {SearchInput} from "../common/SearchInput";

interface CollaboratorsModalProps {
    sceneId: string;
    close: () => void;
}

export const CollaboratorsModal = ({sceneId, close}: CollaboratorsModalProps) => {
    const [collaborators, setCollaborators] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    useEscapeDismiss({onEscape: close});

    useEffect(() => {
        void fetchCollaborators();
         
    }, [sceneId]);

    const fetchCollaborators = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getSceneCollaborators(sceneId);
            setCollaborators(data);
        } catch (e: any) {
            setError(e.message || i18n.t("Failed to load collaborators"));
        }
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!newEmail) return;
        setLoading(true);
        setError(null);
        try {
            await addSceneCollaborator(sceneId, newEmail);
            setNewEmail("");
            void fetchCollaborators();
        } catch (e: any) {
            setError(e.message || i18n.t("Failed to add collaborator"));
        }
        setLoading(false);
    };

    const handleRemove = async (email: string) => {
        setLoading(true);
        setError(null);
        try {
            await removeSceneCollaborator(sceneId, email);
            void fetchCollaborators();
        } catch (e: any) {
            setError(e.message || i18n.t("Failed to remove collaborator"));
        }
        setLoading(false);
    };

    const filteredCollaborators = collaborators.filter(email => email.toLowerCase().includes(search.toLowerCase()));

    return (
        <Container>
            <Nav>
                <span>{i18n.t("Collaborators")}</span>
                <FlexWrapper $gap="0 8px">
                    <SearchInput width="160px"
                        alwaysOpen
                        value={search}
                        onChange={setSearch}
                        placeholder={i18n.t("Search...")}
                    />
                    <button className="reset-css">
                        <img src={x}
                            alt={i18n.t("close")}
                            onClick={close}
                        />
                    </button>
                </FlexWrapper>
            </Nav>
            <MainFlexWrapper>
                <CollaboratorsList>
                    {loading && <div>{i18n.t("Loading...")}</div>}
                    {error && <ErrorMsg>{error}</ErrorMsg>}
                    {!loading && filteredCollaborators.length === 0 && <EmptyMsg>{i18n.t("No collaborators found.")}</EmptyMsg>}
                    {filteredCollaborators.map(email => 
                        <CollaboratorItem key={email}>
                            <span>{email}</span>
                            <RemoveButton onClick={() => handleRemove(email)}
                                title={i18n.t("Remove")}
                            >
                                &times;
                            </RemoveButton>
                        </CollaboratorItem>,
                    )}
                </CollaboratorsList>
                <AddCollaboratorForm
                    onSubmit={e => {
                        e.preventDefault();
                        handleAdd();
                    }}
                >
                    <input
                        type="email"
                        placeholder={i18n.t("Add collaborator email")}
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        disabled={loading}
                        required
                    />
                    <button type="submit"
                        disabled={loading || !newEmail}
                    >
                        {i18n.t("Add")}
                    </button>
                </AddCollaboratorForm>
            </MainFlexWrapper>
        </Container>
    );
};
