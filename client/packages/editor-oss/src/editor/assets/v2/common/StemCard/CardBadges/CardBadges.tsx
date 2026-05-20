import {useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";

import {Wrapper, StemIcon, StatusIcon, StatusInfo} from "./CardBadges.style";
import {STATUS_MAP, ASSET_STATUS} from "../../../AssetsLibrary/services";
import outdatedAssetIcon from "../../../icons/publishStates/outdated.svg";
import stemIcon from "../icons/stem.svg";

interface Props {
    status: ASSET_STATUS;
    isOutdated: boolean;
}

const outdatedAssetMessage = "This stem is outdated. A newer version is available.";

export const CardBadges = ({status, isOutdated}: Props) => {
    const [isHovered, setIsHovered] = useState(false);
    const statusRef = useRef<HTMLDivElement>(null);
    const [tooltipPos, setTooltipPos] = useState<{x: number; y: number}>({x: 0, y: 0});
    const {icon, text} = STATUS_MAP[status];

    useEffect(() => {
        if (isHovered && statusRef.current) {
            const rect = statusRef.current.getBoundingClientRect();
            setTooltipPos({x: rect.right, y: rect.top});
        }
    }, [isHovered]);

    return (
        <Wrapper>
            <StatusIcon
                ref={statusRef}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <img className="statusIcon"
                    src={isOutdated ? outdatedAssetIcon : icon}
                    alt=""
                />
                {isHovered &&
                    createPortal(
                        <StatusInfo style={{top: tooltipPos.y, left: tooltipPos.x}}>
                            {isOutdated ? outdatedAssetMessage : text}
                        </StatusInfo>,
                        document.body,
                    )}
            </StatusIcon>

            <StemIcon>
                <img src={stemIcon}
                    alt=""
                />
            </StemIcon>
        </Wrapper>
    );
};
