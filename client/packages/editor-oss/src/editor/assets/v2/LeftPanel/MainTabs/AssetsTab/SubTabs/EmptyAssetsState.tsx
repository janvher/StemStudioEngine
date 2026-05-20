import {EmptyState} from "../AssetsTab.style";

interface Props {
    search: string;
    label: string;
}

export const EmptyAssetsState = ({search, label}: Props) => {
    return (
        <EmptyState>
            No {label} {search ? "found" : "yet"}.
        </EmptyState>
    );
};
