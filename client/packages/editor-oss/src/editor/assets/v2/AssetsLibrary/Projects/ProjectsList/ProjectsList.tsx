import {StyledSceneList} from "./Projectslist.style";
import {SingleProject} from "./SingleProject";
import {FileData} from "../../../types/file";

export type Props = {
    data: FileData[];
    onSceneClick: (item: FileData) => void;
};

export const ProjectsList = ({data, onSceneClick}: Props) => {
    return (
        <StyledSceneList className="StyledSceneList hidden-scroll">
            {(() => {
                const renderSceneItems = (
                    list: FileData[],
                    options?: {isCommunityGame?: boolean; isCollaborativeGame?: boolean},
                ) =>
                    list.map((item, index) => (
                        <SingleProject
                            key={item.ID + index}
                            item={item}
                            {...{
                                onSceneClick,
                            }}
                            {...options}
                        />
                    ));

                return renderSceneItems(data);
            })()}
        </StyledSceneList>
    );
};
