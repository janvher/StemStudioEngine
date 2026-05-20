import {AiFillFileText} from "react-icons/ai";
import {FcFolder, FcOpenedFolder, FcPicture, FcFile} from "react-icons/fc";
import {SiHtml5, SiCss, SiJavascript, SiTypescript, SiJson} from "react-icons/si";

type FileIconProps = {
    extension: string;
};

export const FileIcon = ({extension}: FileIconProps) => {
    switch (extension) {
        case "js":
        case "jsx":
            return <SiJavascript color="#fbcb38" />;

        case "ts":
        case "tsx":
            return <SiTypescript color="#378baa" />;

        case "css":
            return <SiCss color="purple" />;

        case "json":
            return <SiJson color="#5656e6" />;

        case "html":
            return <SiHtml5 color="#e04e2c" />;

        case "png":
        case "jpg":
        case "webp":
        case "ico":
            return <FcPicture />;

        case "txt":
            return <AiFillFileText color="white" />;

        case "closedDirectory":
            return <FcFolder />;

        case "openDirectory":
            return <FcOpenedFolder />;
    }

    return <FcFile />;
};
