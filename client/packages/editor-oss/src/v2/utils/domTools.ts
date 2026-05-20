export const getPosition = (element: HTMLElement) => {
    let tmpElement = element;
    let x = 0;
    let y = 0;

    while (tmpElement && !Number.isNaN(tmpElement.offsetLeft) && !Number.isNaN(tmpElement.offsetTop)) {
        x += tmpElement.offsetLeft - tmpElement.scrollLeft;
        y += tmpElement.offsetTop - tmpElement.scrollTop;
        tmpElement = tmpElement.offsetParent as HTMLElement;
    }
    return {
        x: x + document.body.scrollLeft,
        y: y + document.body.scrollTop,
    };
};
