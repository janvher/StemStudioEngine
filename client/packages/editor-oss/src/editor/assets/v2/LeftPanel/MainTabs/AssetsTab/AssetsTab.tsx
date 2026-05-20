import {AssetsRows} from "./AssetsRows/AssetsRows";
import {Container} from "./AssetsTab.style";

export const AssetsTab = ({isVisible, maxHeight}: {isVisible: boolean; maxHeight?: string}) => {
    return (
        <Container style={!isVisible ? {display: "none"} : {}}
            $maxHeight={maxHeight}
        >
            <AssetsRows />
        </Container>
    );
};
