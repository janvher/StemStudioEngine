import { toast } from "toastywave";

import EventBus from "@stem/editor-oss/behaviors/event/EventBus";
import { LambdaBase } from "../../LambdaBase";

type UIActionData = {
    action?: "open_ui" | "close_ui" | "toast";
    uiTargetId?: string;
    message?: string;
    toastType?: "info" | "success" | "warning" | "error";
};

export default class UIActionLambda extends LambdaBase {
    update(deltaTime: number = 0.016): void {
        this.processObjects(deltaTime, (_object, data) => {
            const cfg = data as UIActionData;
            const action = cfg.action || "toast";
            const uiTargetId = String(cfg.uiTargetId || "").trim();

            if (action === "open_ui" || action === "close_ui") {
                if (uiTargetId && typeof document !== "undefined") {
                    const element = document.getElementById(uiTargetId);
                    if (element) {
                        element.style.display = action === "open_ui" ? "" : "none";
                    }
                }
                EventBus.instance.send(action === "open_ui" ? "ui.open" : "ui.close", uiTargetId);
                return;
            }

            const message = String(cfg.message || "").trim();
            if (!message) {
                return;
            }

            const type = cfg.toastType || "info";
            if (type === "success") toast.success(message);
            else if (type === "warning") toast.warning(message);
            else if (type === "error") toast.error(message);
            else toast.info(message);
        });
    }
}
