class Config {
    static server_host = process.env.REACT_APP_SERVER_HOST ?? window.location.href;
}

export default Config;
