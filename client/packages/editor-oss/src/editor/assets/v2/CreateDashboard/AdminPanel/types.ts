export type SubmitButtonType = "add" | "remove";

export interface ISubmitButton {
    action: SubmitButtonType;
    label: string;
    value: string;
    setValue: React.Dispatch<React.SetStateAction<string>>;
    invalidEmails: string[];
    setInvalidEmails: React.Dispatch<React.SetStateAction<string[]>>;
    buttonLabel: string;
    isRed?: boolean;
    isBlue?: boolean;
}
