import {useEffect} from "react";
import styled from "styled-components";
import * as THREE from "three";
import {ParticleEmitter, ParticleSystem} from "three.quarks";

import goBackIcon from "../../icons/go-back.svg";
import {ExpandablePanel} from "../Panels/Panels";
import {EmissionSection} from "./EmissionSection/EmissionSection";
import {EmitterShapeSection} from "./EmitterShapeSection/EmitterShapeSection";
import {ParticleBehaviorsSection} from "./ParticleBehaviorsSection/ParticleBehaviorsSection";
import {ParticleRendererSection} from "./ParticleRendererSection/ParticleRendererSection";
import {ParticleSystemSection} from "./ParticleSystemSection/ParticleSystemSection";
import global from "@stem/editor-oss/global";
import {TransformationSection} from "../../sections/TransformationSection";

interface Props {
    emitter: ParticleEmitter;
    goBack: () => void;
    setEmitterSettings: React.Dispatch<React.SetStateAction<ParticleEmitter<THREE.Object3DEventMap> | undefined>>;
}

export const ParticleEmitterPanel = ({emitter, goBack}: Props) => {
    const app = global.app!;

    useEffect(() => {
        app.call("objectChanged");
    }, [emitter]);

    return (
        <>
            <Header>
                <img src={goBackIcon}
                    alt="go back"
                    className="icon"
                    onClick={goBack}
                />
                {/* {showRenameInput ? (
                    <form onSubmit={handleNameChange}>
                        <RenameInput type="text" onChange={e => setCustomName(e.target.value)} value={customName} />
                    </form>
                ) : (
                    <span>{customName}</span>
                )} */}
                <span>{emitter.name}</span>
            </Header>
            <TransformationSection customObj={emitter}
                emitterUpdate
            />
            <ExpandablePanel label="Emitter Shape">
                <EmitterShapeSection particleSystem={emitter.system as ParticleSystem} />
            </ExpandablePanel>
            <ExpandablePanel label="Particle Renderer">
                <ParticleRendererSection particleSystem={emitter.system as ParticleSystem} />
            </ExpandablePanel>
            <ExpandablePanel label="Emission">
                <EmissionSection particleSystem={emitter.system as ParticleSystem} />
            </ExpandablePanel>
            <ExpandablePanel label="Particle Initialization">
                <ParticleSystemSection particleSystem={emitter.system as ParticleSystem} />
            </ExpandablePanel>
            <ExpandablePanel label="Behaviors">
                <ParticleBehaviorsSection
                    particleSystem={emitter.system as ParticleSystem}
                    behaviors={(emitter.system as ParticleSystem)?.behaviors || []}
                />
            </ExpandablePanel>
        </>
    );
};

export const Header = styled.div`
    position: relative;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    padding: 4px 0 12px;
    margin: 0 0 12px;
    width: 100%;
    color: #fff;
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-regular);
    border-bottom: 1px solid var(--theme-grey-bg);

    span {
        cursor: pointer;
    }

    .icon {
        width: 16px;
        height: 16px;
        margin-right: 8px;
        cursor: pointer;
    }

    img {
        cursor: pointer;
    }
`;
