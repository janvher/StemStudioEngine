import styled from 'styled-components';

import { StyledRowWrapper } from "./StyledRowWrapper";
import { flexCenter } from "../../../../../assets/style";
import { LockIcon } from '../../common/LockIcon';

export type BooleanVector = {
    x: boolean;
    y: boolean;
    z: boolean;
};

interface AxisLockProps {
    value: BooleanVector;
    setValue: (value: BooleanVector) => void;
    disabled?: boolean;
    $margin?: string;
}

export const AxisLockRow = ({
    value,
    setValue,
    disabled,
    $margin,
}: AxisLockProps) => {
    return (
        <StyledRowWrapper $margin={$margin}>
            <span className="text">Rotation Lock</span>
            <FlexWrapper>
                <span className="text">X</span>
                <LockIcon
                    locked={value.x}
                    onClick={() => disabled ? undefined : setValue({ ...value, x: !value.x })}
                />
                <span className="text"
                    style={{ marginLeft: "8px" }}
                >Y</span>
                <LockIcon
                    locked={value.y}
                    onClick={() => disabled ? undefined : setValue({ ...value, y: !value.y })}
                />
                <span className="text"
                    style={{ marginLeft: "8px" }}
                >Z</span>
                <LockIcon
                    locked={value.z}
                    onClick={() => disabled ? undefined : setValue({ ...value, z: !value.z })}
                />
            </FlexWrapper>
        </StyledRowWrapper>
    );
};

const FlexWrapper = styled.div`
    ${flexCenter};
    position: relative;
`;
