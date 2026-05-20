import {Bar, Button} from "./PlayBar.style";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import global from "@stem/editor-oss/global";
import {ParticlePlayerActionType} from "@stem/editor-oss/services";
import pause from "../icons/pause.svg";
import play from "../icons/play.svg";
import stop from "../icons/stop.svg";

const ACTIONS: {
    icon: string;
    alt: string;
    action: ParticlePlayerActionType;
}[] = [
    {icon: play, alt: "play", action: "play"},
    {icon: pause, alt: "pause", action: "pause"},
    {icon: stop, alt: "stop", action: "stop"},
];

export const PlayBar = () => {
    const app = global.app as EngineRuntime;
    return (
        <Bar>
            {ACTIONS.map(({icon, alt, action}) => (
                <Button
                    key={action}
                    onClick={() => app.call("emitterPlay", null, action)}
                >
                    <img
                        src={icon}
                        alt={alt}
                    />
                </Button>
            ))}
        </Bar>
    );
};
