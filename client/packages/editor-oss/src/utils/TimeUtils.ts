const TimeUtils = {
    getServerUTCTime: function () {
        // Always return current UTC time (which is the same everywhere)
        return new Date().toUTCString();
    },
    convertToServerUTCTime: function (date: Date | string | number) {
        // Convert a local date to UTC string
        console.log("Converting date to server UTC time:", date);
        return new Date(date).toUTCString();
    },
    getDateTime: function (format = "yyyyMMddHHmmss") {
        let date = new Date();
        let year = date.getUTCFullYear();
        let month = `00${date.getUTCMonth() + 1}`;
        let day = `00${date.getUTCDate()}`;
        let hour = `00${date.getUTCHours()}`;
        let minute = `00${date.getUTCMinutes()}`;
        let second = `00${date.getUTCSeconds()}`;

        month = month.substr(month.length - 2, 2);
        day = day.substr(day.length - 2, 2);
        hour = hour.substr(hour.length - 2, 2);
        minute = minute.substr(minute.length - 2, 2);
        second = second.substr(second.length - 2, 2);

        return format
            .replace("yyyy", String(year))
            .replace("MM", month)
            .replace("dd", day)
            .replace("HH", hour)
            .replace("mm", minute)
            .replace("ss", second);
    },
    getServerTimeDiff: function (timestamp: number): number {
        const serverTime = new Date().getTime() + new Date().getTimezoneOffset() * 60000; // Adjust for local timezone offset
        return serverTime - timestamp;
    },
};

export default TimeUtils;
