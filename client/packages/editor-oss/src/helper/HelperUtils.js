import global from "../global";

/**
 * Utilities for working with helpers
 */
class HelperUtils {
    /**
     * Updates the helper's state in the editor based on its visibility
     * @param {Object} helper - The helper to update
     * @param {boolean} visible - Whether the helper should be visible
     */
    static updateEditorHelpers(helper, visible) {
        if (!helper.visible && visible) {
            global.app.editor.addSelectionHelper(helper);
        } else if (helper.visible && !visible) {
            global.app.editor.removeSelectionHelper(helper);
        }
    }
}

export default HelperUtils;
