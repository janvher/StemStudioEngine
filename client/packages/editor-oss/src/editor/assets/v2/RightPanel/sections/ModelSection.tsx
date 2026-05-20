import { useEffect, useState } from "react";

import global from "@stem/editor-oss/global";
import { PanelCheckbox } from "../common/PanelCheckbox";

interface Props {
	isLocked?: boolean;
}

export const ModelSection = ({ isLocked }: Props) => {
	const app = global.app;
	const editor = app?.editor;
	const selected = editor?.selected as any;

	const [enableMorphing, setEnableMorphing] = useState<boolean>(
		selected ? !!selected.userData?.EnableMorphing : false,
	);

	const syncFromSelection = () => {
		const current = app?.editor?.selected as any;
		if (!current || Array.isArray(current)) return setEnableMorphing(false);
		setEnableMorphing(!!current.userData?.EnableMorphing);
	};

	useEffect(() => {
		// Initial sync
		syncFromSelection();

		// Subscribe to editor events
		app?.on("objectSelected.ModelSection", syncFromSelection);
		app?.on("objectChanged.ModelSection", syncFromSelection);

		return () => {
			app?.on("objectSelected.ModelSection", null);
			app?.on("objectChanged.ModelSection", null);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleToggle = (checked: boolean) => {
		const current = app?.editor?.selected as any;
		if (!current || Array.isArray(current)) return;

		if (!current.userData) current.userData = {};
		current.userData.EnableMorphing = !!checked;
		setEnableMorphing(!!checked);
		app?.call("objectChanged", current, current);
	};

	return (
		<PanelCheckbox
    v2
    isGray
    regular
    text="Enable Morphing on Mobile"
    checked={!!enableMorphing}
    onChange={e => handleToggle(!!e.target.checked)}
    isLocked={isLocked}
    tooltipText="By default, morph targets (blend shapes) are removed from models on mobile devices to improve performance. Enable this to preserve morph targets for facial expressions, shape keys, and morph animations on mobile."
		/>
	);
};

