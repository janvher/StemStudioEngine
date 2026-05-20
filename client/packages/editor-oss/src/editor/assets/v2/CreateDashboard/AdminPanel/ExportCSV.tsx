import {StyledButton} from "../../common/StyledButton";

interface Column {
    key: string;
    label: string;
}

interface Props {
    data: Record<string, unknown>[];
    columns: Column[];
    filename: string;
}

const escapeCSV = (value: unknown): string => {
    const str = String(value ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

export const ExportCSV = ({data, columns, filename}: Props) => {
    const handleExport = () => {
        const header = columns.map(c => escapeCSV(c.label)).join(",");
        const rows = data.map(row => columns.map(c => escapeCSV(row[c.key])).join(","));
        const csv = [header, ...rows].join("\n");
        const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <StyledButton
            width="100px"
            height="36px"
            isGrey
            onClick={handleExport}
            disabled={data.length === 0}
        >
            Export CSV
        </StyledButton>
    );
};
