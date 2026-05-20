import {useEffect, useMemo, useRef, useState} from "react";
import {Vector3Like} from "three";

import {AssetsGrid, FilterButton, Filters, Header, SingleAsset, Wrapper} from "./AssetsListMenu.style";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import AIWorldController from "../../../../../controls/AiWorldController/AiWorldController";
import global from "@stem/editor-oss/global";
import {fetchModels} from "../../../../../v2/pages/services";
import {SearchInput} from "../../common/SearchInput";
import {getPositionInFrontOfPlayer} from "../../HUD/HUDView/services";
import defaultImg from "../../icons/scene-default.png";
import {
    handleAddBox,
    handleAddCone,
    handleAddCylinder,
    handleAddPlane,
    handleAddSphere,
    handleAddTriangle,
} from "../../LeftPanel/MainTabs/AssetsTab/SubTabs/primitivesHelpers";
import {PRIMITIVES_LIST, PRIMITIVES_NAME} from "../../LeftPanel/MainTabs/AssetsTab/SubTabs/PrimitivesTab";
import {GenerateButton, CloseButton} from "../common";



interface Props {
    openAIBuilder: () => void;
    close: () => void;
    oldVersion?: boolean;
}

enum FILTERS {
    ALL = "All",
    PRIMITIVES = "Primitives",
    MODELS = "Models",
}

interface DragAndDropArgs {
    e: React.DragEvent<HTMLDivElement>;
    id: string;
    type: "model" | "primitive";
}

const LOCAL_STORAGE_FILTERS_NAME = "createMenuActiveFilter";

export const AssetsListMenu = ({openAIBuilder, close, oldVersion}: Props) => {
    const app = global.app as EngineRuntime;
    const [search, setSearch] = useState("");
    const [searchActive, setSearchActive] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FILTERS>(() => {
        const stored = localStorage.getItem(LOCAL_STORAGE_FILTERS_NAME);
        return stored && Object.values(FILTERS).includes(stored as FILTERS) ? (stored as FILTERS) : FILTERS.ALL;
    });
    const [assets, setAssets] = useState<any[]>([]);
    const primitives = PRIMITIVES_LIST;
    const [filteredData, setFilteredData] = useState<any[]>([]);
    const [modelData] = useState<{
        modelUrl: string;
        width: number;
        height: number;
    }>({
        modelUrl: "",
        width: 1,
        height: 2,
    });

    const aiWorldController = useMemo(
        () => AIWorldController.getInstance(app),
        [],
    );
    const menuRef = useRef<HTMLDivElement>(null);

    const setDataBasedOnFilter = () => {
        switch (activeFilter) {
            case FILTERS.ALL:
                setFilteredData([...assets, ...primitives]);
                break;
            case FILTERS.MODELS:
                setFilteredData(assets);
                break;
            case FILTERS.PRIMITIVES:
                setFilteredData(primitives);
                break;

            default:
                break;
        }
    };

    useEffect(setDataBasedOnFilter, [activeFilter, assets, primitives]);

    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_FILTERS_NAME, activeFilter);
    }, [activeFilter]);

    const handleFetchingModels = async () => {
        if (app?.editor) {
            const res = await fetchModels(app?.editor?.sceneID || undefined, true);
            const sceneRes = await fetchModels(app?.editor?.sceneID || undefined, false);
            const uniqueSceneRes = sceneRes.filter(sceneModel => !res.some(model => model.ID === sceneModel.ID));

            const combinedModels = [...res || [], ...uniqueSceneRes || []];
            setAssets(combinedModels);
        }
    };

    useEffect(() => {
        void handleFetchingModels();
    }, []);

    const handleDragStart = (args: DragAndDropArgs) => {
        const {e, id, type} = args;
        e.dataTransfer.setData("asset-id", id);
        e.dataTransfer.setData("asset-type", type);
    };

    useEffect(() => {
        app?.on(`dragEnd.AssetsListMenu`, (type: string, id: string, position: any) => {
            if (type === "model") {
                void handleAddModelToScene(id, position);
            } else if (type === "primitive") {
                addPrimitive(id as PRIMITIVES_NAME, (obj: any) => {
                    app?.editor?.moveObjectToPoint(obj, position);
                });
            }
        });
        return () => {
            app?.on(`dragEnd.AssetsListMenu`, null);
        };
    }, [assets, primitives]);

    useEffect(() => {
        const data =
            activeFilter === FILTERS.ALL
                ? [...assets, ...primitives]
                : activeFilter === FILTERS.PRIMITIVES
                  ? primitives
                  : assets;
        if (!search) {
            setDataBasedOnFilter();
            return;
        } else {
            setFilteredData(
                data.filter(n => {
                    const itemName = (n.Name || n.name || "").toLowerCase();
                    return itemName.indexOf(search.toLowerCase()) > -1;
                }),
            );
        }
    }, [search, assets]);

    const handleAddModelToScene = async (id: string, position?: Vector3Like, callback?: (obj: any) => void) => {
        if (!app) return;
        const selectedModel = assets.find(el => el.ID === id);
        const model = await aiWorldController.addModelToSceneFromServer(selectedModel, selectedModel.Name);
        let width = modelData.width;
        let height = modelData.height;
        if (model) {
            position =
                position ||
                getPositionInFrontOfPlayer({
                    position: app.game!.player!.position,
                    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
                    quaternionAuxA: app.game?.camera!.quaternion! as any,
                });

            aiWorldController.addObjectToScene(model, false, width, height, position);
            callback?.(model);
        }
    };

    useEffect(() => {
        const menu = menuRef.current;
        if (!menu) return;

        const handleMouseEnter = () => {
            app?.call("contextmenuHover");
        };

        const handleMouseLeave = () => {
            app?.call("contextmenuUnhover");
        };

        menu.addEventListener("mouseenter", handleMouseEnter);
        menu.addEventListener("mouseleave", handleMouseLeave);

        return () => {
            menu.removeEventListener("mouseenter", handleMouseEnter);
            menu.removeEventListener("mouseleave", handleMouseLeave);
            app?.call("contextmenuUnhover");
        };
    }, [menuRef]);

    const addPrimitive = (name: PRIMITIVES_NAME, callback?: (obj: any) => void) => {
        if (!app) return;
        switch (name) {
            case PRIMITIVES_NAME.SPHERE:
                handleAddSphere(app, callback);
                break;
            case PRIMITIVES_NAME.BOX:
                handleAddBox(app, callback);
                break;
            case PRIMITIVES_NAME.TRIANGLE:
                handleAddTriangle(app, callback);
                break;
            case PRIMITIVES_NAME.CONE:
                handleAddCone(app, callback);
                break;
            case PRIMITIVES_NAME.CYLINDER:
                handleAddCylinder(app, callback);
                break;
            case PRIMITIVES_NAME.PLANE:
                handleAddPlane(app, callback);
                break;
            default:
                break;
        }
    };

    return (
        <Wrapper ref={menuRef}
            $oldVersion={oldVersion}
        >
            <Header>
                <SearchInput
                    milky
                    onChange={setSearch}
                    value={search}
                    placeholder="Search"
                    width="100%"
                    onActiveSearchChange={setSearchActive}
                />
                {!searchActive && 
                    <>
                        <GenerateButton onClick={openAIBuilder} />
                        <CloseButton onClick={close} />
                    </>
                }
            </Header>
            <Filters>
                {Array.from(Object.values(FILTERS)).map(el => 
                    <FilterButton key={el}
                        $active={activeFilter === el}
                        onClick={() => setActiveFilter(el)}
                    >
                        {el}
                    </FilterButton>,
                )}
            </Filters>
            <AssetsGrid className="hidden-scroll">
                {filteredData.map((el: any) => {
                    const isPrimitive = Object.values(PRIMITIVES_NAME).includes(el.name);
                    const dragAndDropData: Pick<DragAndDropArgs, "id" | "type"> = isPrimitive
                        ? {id: el.name, type: "primitive"}
                        : {id: el.ID, type: "model"};

                    return (
                        <SingleAsset
                            draggable
                            onDragEnd={() => {
                                // const event = new PointerEvent("pointerup", {bubbles: true});
                                // (app!.game!.cameraControl as any).pointerUpHandler(event);
                            }}
                            onDragStart={e => handleDragStart({e, ...dragAndDropData})}
                            onClick={() => isPrimitive ? addPrimitive(el.name) : handleAddModelToScene(el.ID)}
                            key={el.ID || el.name}
                        >
                            <img
                                src={el.Thumbnail || el.icon || defaultImg}
                                className={isPrimitive ? "thumbnail primitive" : "thumbnail"}
                            />
                        </SingleAsset>
                    );
                })}
            </AssetsGrid>
        </Wrapper>
    );
};
