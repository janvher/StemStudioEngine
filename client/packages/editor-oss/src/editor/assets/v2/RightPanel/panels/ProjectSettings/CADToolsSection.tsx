import React from "react";

import {PanelCheckbox} from "../../common/PanelCheckbox";

export interface CADToolsSectionProps {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}

export const CADToolsSection: React.FC<CADToolsSectionProps> = ({
    enabled,
    onChange,
}) => (
    <PanelCheckbox
        v2
        text="Enable CAD Tools (beta)"
        checked={enabled}
        isGray
        regular
        onChange={() => onChange(!enabled)}
        tooltipText="Shows the mesh edit-mode CAD toolbar and enables component-level modeling tools for supported meshes."
    />
);
