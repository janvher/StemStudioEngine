import {useEffect, useMemo, useState} from "react";

import {ActionButton, ActionsCell, FlexWrapper, Table, Td, Th, TrashButton, SearchSection} from "./WhitelistTable";
import {LoadMore} from "../../../../../../../v2/common/LoadMore/LoadMore";
import {SearchInput} from "../../../../common/SearchInput";
import trashIcon from "../../../../icons/trash.svg";
import {ExportCSV} from "../../ExportCSV";

interface Props {
    currentWhitelist: string[];
    onDelete: (email: string) => void;
    onSendInvite: (email: string) => void;
    onSendPasswordReset: (email: string) => void;
    pendingEmail?: string | null;
    pendingAction?: "invite" | "reset" | "delete" | null;
}
const visibilityCounter = 10;

export const WhitelistTable = ({
    currentWhitelist,
    onDelete,
    onSendInvite,
    onSendPasswordReset,
    pendingEmail,
    pendingAction,
}: Props) => {
    const [search, setSearch] = useState("");

    const filteredWhitelist = useMemo(
        () => currentWhitelist.filter(email => email.toLowerCase().includes(search.toLowerCase())).sort(),
        [currentWhitelist, search],
    );

    const [visibleData, setVisibleData] = useState(filteredWhitelist.slice(0, visibilityCounter));

    useEffect(() => {
        setVisibleData(filteredWhitelist.slice(0, visibilityCounter));
    }, [filteredWhitelist]);

    return (
        <>
            <FlexWrapper>
                <span>Filter</span>
                <SearchSection>
                    <SearchInput onChange={setSearch}
                        value={search}
                        placeholder="Search"
                        width="237px"
                    />
                </SearchSection>
                <ExportCSV
                    data={filteredWhitelist.map(email => ({email}))}
                    filename="whitelist"
                    columns={[{key: "email", label: "Email"}]}
                />
            </FlexWrapper>
            <Table>
                <thead>
                    <tr>
                        <Th $radiusLeft>Email</Th>
                        <Th>Actions</Th>
                    </tr>
                </thead>
                <tbody>
                    {visibleData.map((email, index) => 
                        <tr key={index}>
                            <Td>{email}</Td>
                            <Td>
                                <ActionsCell>
                                    <ActionButton
                                        $variant="primary"
                                        onClick={() => onSendInvite(email)}
                                        disabled={pendingEmail === email}
                                    >
                                        {pendingEmail === email && pendingAction === "invite" ? "Sending..." : "Send Invite"}
                                    </ActionButton>
                                    <ActionButton
                                        onClick={() => onSendPasswordReset(email)}
                                        disabled={pendingEmail === email}
                                    >
                                        {pendingEmail === email && pendingAction === "reset" ? "Sending..." : "Reset Password"}
                                    </ActionButton>
                                    <TrashButton
                                        onClick={() => onDelete(email)}
                                        disabled={pendingEmail === email}
                                    >
                                        <img src={trashIcon}
                                            alt="Remove from Approved Users"
                                        />
                                    </TrashButton>
                                </ActionsCell>
                            </Td>
                        </tr>,
                    )}
                </tbody>
            </Table>
            <LoadMore
                visibilityCounter={visibilityCounter}
                itemsToLoad={filteredWhitelist}
                setVisibleResults={setVisibleData}
                margin="0 auto"
            />
        </>
    );
};
