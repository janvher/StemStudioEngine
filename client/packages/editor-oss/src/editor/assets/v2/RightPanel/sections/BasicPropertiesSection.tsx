import {useEffect, useState} from "react";
import * as THREE from "three";

import "../css/SwitchSection.css";
import {ObjectTagsSection} from "./ObjectTagsSection";
import global from "@stem/editor-oss/global";
import {TextInput} from "../../common/TextInput";
import {Separator} from "../common/Separator";

interface Props {
    isLocked?: boolean;
    description?: string;
}

export const BasicPropertiesSection = ({isLocked, description}: Props) => {
    const app = global.app;
    const editor = app?.editor;
    const {name} = (editor?.selected as THREE.Object3D<THREE.Object3DEventMap>) || {};
    const [basicProperties, setBasicProperties] = useState({
        name: name || "",
    });

    const handleNameChange = (value: string) => {
        if (app && editor?.selected) {
            const selected = editor?.selected as THREE.Object3D<THREE.Object3DEventMap>;
            setBasicProperties(prevState => ({
                ...prevState,
                name: value,
            }));
            selected.name = value;
            selected.userData.uiTag = `UITag_${value}`;
            selected.userData.variable = value;

            app.call(`objectChanged`, editor.selected, editor.selected);
        }
    };

    const handleUpdate = () => {
        if (editor?.selected) {
            const selected = editor?.selected as THREE.Object3D<THREE.Object3DEventMap>;
            setBasicProperties({
                name: selected.name || "",
            });
        }
    };

    useEffect(() => {
        if (!editor || !editor.selected) return;

        handleUpdate();
    }, [editor?.selected]);

    useEffect(() => {
        const refreshState = () => {
            const selected = editor?.selected;
            if (!selected) return;
            setBasicProperties(prev => ({...prev, name: (selected as any).name || ""}));
        };

        app?.on(`objectChanged.BasicPropertiesSection`, refreshState);

        return () => {
            app?.on(`objectChanged.BasicPropertiesSection`, null);
        };
    }, []);

    return (
        <div style={{paddingBottom: "12px"}}>
            <div className="Section">
                <div className="title">Name</div>
                <div className="box extended column">
                    <TextInput
                        value={basicProperties.name}
                        setValue={handleNameChange}
                        disabled={isLocked}
                        className="name-input"
                        height="32px"
                    />
                    {description && (
                        <div
                            style={{
                                fontSize: "11px",
                                color: "#888",
                                marginTop: "6px",
                                fontStyle: "italic",
                            }}
                        >
                            {description}
                        </div>
                    )}
                    <Separator margin="12px 0" />
                </div>
            </div>
            <ObjectTagsSection isLocked={isLocked} />
        </div>
    );
};
