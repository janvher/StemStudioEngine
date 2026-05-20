window.URL = window.URL || window.webkitURL;
window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;

Number.prototype.format = function () {
    return this.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
};

String.prototype.format = function () {
    let str = this;
    for (let i = 0; i < arguments.length; i++) {
        str = str.replace("{" + i + "}", arguments[i]);
    }
    return str;
};
