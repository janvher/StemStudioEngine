import {useRef, useState} from "react";

import "./css/UploadFile.css";
import closeIcon from "../icons/close-icon.svg";

interface Props {
    supportedTypes: string;
    accept: string;
    video?: boolean;
}

export const UploadFile = ({supportedTypes, accept, video}: Props) => {
    const hiddenFileInput = useRef<HTMLInputElement | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);

    return (
        <div className="UploadView">
            {!uploadedFile ? 
                <button className="UploadWrapper container"
                    onClick={() => hiddenFileInput?.current?.click()}
                >
                    <input
                        type="file"
                        accept={accept}
                        onChange={e => setUploadedFile(e.target.files?.[0] ?? null)}
                        ref={hiddenFileInput}
                        style={{display: "none"}}
                    />
                    <div className="icon-text">Upload</div>
                </button>
             : 
                <div className="file-preview container">
                    {video ? 
                        <video width="211"
                            height="95"
                            controls
                        >
                            <source src={URL.createObjectURL(uploadedFile)} />
                            Your browser does not support the video tag.
                        </video>
                     : 
                        <img className="file-preview-image"
                            src={URL.createObjectURL(uploadedFile)}
                            alt=""
                        />
                    }
                    <div className="remove-file-button"
                        onClick={() => setUploadedFile(null)}
                    >
                        <img src={closeIcon}
                            alt="remove file"
                        />
                    </div>
                </div>
            }
            <div className="description">{supportedTypes}</div>
        </div>
    );
};
