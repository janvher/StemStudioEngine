type FileSelectorOptions = {
    accept?: string;
    multiple?: boolean;
    onFileSelected: (file: File) => Promise<void> | void;
};

export const selectFile = ({accept, multiple, onFileSelected}: FileSelectorOptions) => {
    const input = document.createElement("input");
    input.type = "file";
    if (accept) input.accept = accept;
    if (multiple) input.multiple = true;
    input.style.display = "none";
    document.body.appendChild(input);

    input.onchange = async event => {
        const files = (event.target as HTMLInputElement).files;
        if (!files || files.length === 0) {
            document.body.removeChild(input);
            return;
        }

        try {
            for (const file of Array.from(files)) {
                await onFileSelected(file);
            }
        } catch (err) {
            console.error("File selection error:", err);
        } finally {
            document.body.removeChild(input);
        }
    };

    input.click();
};
