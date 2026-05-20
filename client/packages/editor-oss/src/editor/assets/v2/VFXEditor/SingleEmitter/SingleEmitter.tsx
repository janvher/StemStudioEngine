import {ParticleEmitter} from "three.quarks";

import {IconsWrapper, Item, Name} from "./SingleEmitter.style";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import global from "@stem/editor-oss/global";
import deleteIcon from "../../icons/delete-icon-new.svg";

interface Props {
    emitter: ParticleEmitter;
    name: string;
    setEmittersList: React.Dispatch<React.SetStateAction<{emitter: ParticleEmitter; name: string}[]>>;
    setNewEmitters: React.Dispatch<React.SetStateAction<{emitter: ParticleEmitter; name: string}[]>>;
    onClick: () => void;
}

export const SingleEmitter = ({emitter, name, setEmittersList, setNewEmitters, onClick}: Props) => {
    const app = global.app as EngineRuntime;

    const deleteEmitter = () => {
        emitter.parent?.remove(emitter);
        setNewEmitters(prev => prev.filter(e => e.emitter !== emitter));
        setEmittersList(prev => prev.filter(e => e.emitter !== emitter));

        app.call("objectChanged", this, emitter.parent);
        app.call("emitterUpdate");
    };

    return (
        <Item onClick={onClick}>
            <Name className="name">{name}</Name>
            <IconsWrapper onClick={e => e.stopPropagation()}>
                <button
                    className="reset-css"
                    onClick={deleteEmitter}
                >
                    <img
                        src={deleteIcon}
                        alt="delete emitter"
                        className="icon"
                    />
                </button>
            </IconsWrapper>
        </Item>
    );
};
