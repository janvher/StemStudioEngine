import React from "react";

import {TABS} from "../AdminPanel";
import {NavContainer, SingleTab} from "./Navigation.style";

interface Props {
    activeTab: TABS;
    setActiveTab: React.Dispatch<React.SetStateAction<TABS>>;
    tabs: typeof TABS;
}

export const Navigation = ({activeTab, setActiveTab, tabs}: Props) => {
    return (
        <NavContainer>
            {Array.from(Object.values(tabs)).map(tab =>
                <SingleTab key={tab}
                    $active={activeTab === tab}
                    onClick={() => setActiveTab(tab)}
                >
                    {tab}
                </SingleTab>,
            )}
        </NavContainer>
    );
};
