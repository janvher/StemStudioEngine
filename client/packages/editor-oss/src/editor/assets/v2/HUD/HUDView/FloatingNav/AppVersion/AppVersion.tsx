import {Bottom, WatermarkLogo} from "./AppVersion.style";
import stemStudioLogo from "./stem-studio-alpha.png";

export const AppVersion = () => {
    return (
        <Bottom>
            <WatermarkLogo
                src={stemStudioLogo}
                alt="Stem Studio"
            />
        </Bottom>
    );
};
