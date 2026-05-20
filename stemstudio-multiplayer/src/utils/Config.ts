export default class Config {

    static getApiBaseUrl() {
        return process.env.API_BASE_URL ?? "http://localhost:2020";
    }

}