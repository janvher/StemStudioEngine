import classNames from "classnames";

import "./css/AssetsList.css";
import {IAnythingModel} from "@stem/editor-oss/types/animateAnything";

type Props = {
    data: IAnythingModel[];
    onClick: (model: IAnythingModel) => void;
    className?: string;
    maxHeight?: string;
};

const AssetsListItem = ({onClick, item}: Partial<Props> & {item: IAnythingModel}) => {
    return (
        <div className="assets-item"
            onClick={() => onClick && onClick(item)}
        >
            <img src={item.thumbnails.aw_thumbnail}
                alt="thumbnail"
            />
            <span className="assets-item-name">{item.newName || item.searchName}</span>
        </div>
    );
};

export const AiAssetsList = ({data, onClick, className = ""}: Props) => {
    return (
        <div className={classNames("assets-list hidden-scroll", className)}>
            {data.map(item => 
                <AssetsListItem key={item._id}
                    onClick={onClick}
                    item={item}
                />,
            )}
        </div>
    );
};
