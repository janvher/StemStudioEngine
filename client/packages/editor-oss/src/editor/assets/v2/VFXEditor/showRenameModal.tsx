import ReactDOM from "react-dom/client";

import { RenameModal } from "./RenameModal";

export const showRenameModal = (defaultName: string, hideContinueButton?: boolean): Promise<string | undefined> => {
    return new Promise(resolve => {
        const modalRoot = document.createElement("div");
        document.body.appendChild(modalRoot);

        const handleClose = () => {
            root.unmount();
            modalRoot.remove();
        };

        const handleSave = (name: string) => {
            resolve(name);
            handleClose();
        };

        const handleContinue = () => {
            resolve(undefined);
            handleClose();
        };

        const root = ReactDOM.createRoot(modalRoot);
        root.render(
            <RenameModal
                defaultName={defaultName}
                onSave={handleSave}
                onContinue={hideContinueButton ? undefined : handleContinue}
                onCancel={handleClose}
            />,
        );
    });
};