import {StyledRowWrapper} from "./StyledRowWrapper";
import {UploadField} from "../../common/UploadField/UploadField";
import {FileData} from "../../types/file";

interface Props {
    label: string;
    uploadedFile: string | FileData | null;
    setUploadedFile: React.Dispatch<React.SetStateAction<string | FileData | null>>;
    uploadHandler: (arg: any) => void;
}

export const UploadFieldRow = ({label, uploadedFile, setUploadedFile, uploadHandler}: Props) => {
    return (
        <StyledRowWrapper>
            <span className="text">{label}</span>
            <UploadField
                width="100%"
                height="24px"
                uploadedFile={uploadedFile}
                setUploadedFile={setUploadedFile}
                v2
                uploadHandler={uploadHandler}
            />
        </StyledRowWrapper>
    );
};
