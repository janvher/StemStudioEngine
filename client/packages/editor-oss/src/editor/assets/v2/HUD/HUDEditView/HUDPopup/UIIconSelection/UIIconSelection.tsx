import React from "react";

import {IconBox, IconButton, IconsWrapper, Label} from "./UIIconSelection.styled";
import {Icon} from "../../types";

interface Props {
    icons: Icon[];
    iconSelected: Icon | undefined;
    setIconSelected: React.Dispatch<React.SetStateAction<Icon | undefined>>;
}

export const UIIconSelection = ({icons, iconSelected, setIconSelected}: Props) => {
    const handleIconClick = (src: string, alt: string) => {
        if (src === iconSelected?.src && alt === iconSelected.alt) {
            setIconSelected(undefined);
        } else {
            setIconSelected({src, alt});
        }
    };
    return (
        <div style={{width: "100%"}}>
            <Label>Button Icons</Label>
            <IconBox>
                <IconsWrapper>
                    {icons.map(({src, alt, maxWidth}) => 
                        <IconButton
                            className="reset-css"
                            key={src}
                            selected={iconSelected?.src === src}
                            onClick={() => handleIconClick(src, alt)}
                        >
                            <img
                                src={src}
                                alt={alt}
                                style={{
                                    maxWidth: maxWidth ? `${maxWidth}` : "100%",
                                }}
                            />
                        </IconButton>,
                    )}
                </IconsWrapper>
            </IconBox>
        </div>
    );
};
