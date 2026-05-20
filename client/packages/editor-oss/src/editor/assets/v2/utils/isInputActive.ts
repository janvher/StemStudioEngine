export const isInputActive = () => {
    const activeElement = document.activeElement;

    return (
        activeElement &&
        (activeElement.tagName === "TEXTAREA" ||
            activeElement.tagName === "INPUT" && 
             activeElement.getAttribute("type") !== "checkbox" && 
             activeElement.getAttribute("type") !== "range" && 
             !activeElement.classList.contains("combobox-input") ||
            activeElement.role === "textbox")
    );
};
