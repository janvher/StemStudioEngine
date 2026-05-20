import styled, {keyframes} from "styled-components";

const buttonAmation = keyframes`
  0%
    {
        background-position: 0%;
    }
  100%
    {
        background-position: 400%;
    }
`;

const AnimatedButtonContainer = styled.div<{width?: string; height?: string}>`
    height: ${({height}) => height || "30px"};
    width: ${({width}) => width || "185px"};
    border-radius: 8px;
    position: relative;

    text-align: center;
    color: #fff;
    font-size: 16px;
    font-weight: var(--theme-font-medium-plus);
    padding: 0 10px;
    text-decoration: none;
    box-sizing: border-box;
    background: linear-gradient(90deg, #03a9f4, #f441a5, #ffeb3b, #03a9f4);
    background-size: 400%;
    cursor: pointer;

    &::before {
        content: "";
        position: absolute;
        top: -1px;
        left: -1px;
        bottom: -1px;
        right: -1px;
        z-index: -1;
        background: linear-gradient(90deg, #03a9f4, #f441a5, #ffeb3b, #03a9f4);
        background-size: 400%;
        border-radius: 8px;
        opacity: 0;
        transition: 0.3s;
    }
    &:hover {
        &::before {
            z-index: 0;
            filter: blur(8px);
            opacity: 1;
            animation: ${buttonAmation} 8s linear infinite;
        }
    }
`;

export const ButtonContent = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
`;

type Props = {
    width?: string;
    height?: string;
    children: React.ReactNode;
    onClick?: () => void;
};

export const AnimatedButton = ({width, height, children, onClick}: Props) => {
    return (
        <AnimatedButtonContainer width={width}
            height={height}
            onClick={onClick}
        >
            <ButtonContent>{children}</ButtonContent>
        </AnimatedButtonContainer>
    );
};
