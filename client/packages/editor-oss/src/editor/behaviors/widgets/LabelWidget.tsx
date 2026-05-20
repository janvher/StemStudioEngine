import React from "react";
import styled from "styled-components";

import {BehaviorAttribute} from "../BehaviorAttributes";
import BaseAttributeWidget from "./BaseAttributeWidget";
import {regularFont} from "../../../assets/style";

const SectionTitle = styled.div`
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
`;

class LabelWidget extends BaseAttributeWidget {
    protected getContainerPrefix(): string {
        return "widget-label";
    }

    protected createComponent(
        id: string,
        name: string,
        attribute: BehaviorAttribute,
        getCurrentValue: () => any,
        updateBehaviorField: (value: any) => void,
    ): React.ReactElement {
        return <SectionTitle>{name}</SectionTitle>;
    }
}

export default LabelWidget;
