import playcoinIcon from "./assets/playcoin.svg";
import {IconComponent} from "../../../common/HUDIcon";

export const Playcoin = () => {
    return (
        <IconComponent $top
            $playcoin
            $playcoinValue={"1,000"}
            $active={false}
        >
            <img src={playcoinIcon}
                alt=""
            />
        </IconComponent>
    );
};
