import {Wrapper} from "./Info.style";

export interface InfoProps {
    size?: number;
    infoIconBg?: string;
    disabled?: boolean;
    transparent?: boolean;
    absoluteIcon?: {bottom: string; right: string};
    setIsCardVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export const InfoIcon = ({setIsCardVisible, size, infoIconBg, absoluteIcon, transparent, disabled}: InfoProps) => {
    const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        e.stopPropagation();
        setIsCardVisible(true);
    };

    return (
        <Wrapper
            $disabled={disabled}
            $size={size}
            onClick={disabled ? undefined : handleClick}
            className="infoButtonWrapper"
            $absolute={absoluteIcon}
        >
            {transparent ? 
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={size || "16"}
                    height={size || "16"}
                    viewBox="0 0 16 16"
                    fill="none"
                >
                    <path
                        d="M7 0C3.13761 0 0 3.13761 0 7C0 10.8624 3.13761 14 7 14C10.8624 14 14 10.8624 14 7C14 3.13761 10.8624 0 7 0ZM7 0.608696C10.5334 0.608696 13.3913 3.46658 13.3913 7C13.3913 10.5334 10.5334 13.3913 7 13.3913C3.46658 13.3913 0.608696 10.5334 0.608696 7C0.608696 3.46658 3.46658 0.608696 7 0.608696ZM7 2.73913C6.75785 2.73913 6.52561 2.83533 6.35438 3.00655C6.18315 3.17778 6.08696 3.41002 6.08696 3.65217C6.08696 3.89433 6.18315 4.12656 6.35438 4.29779C6.52561 4.46902 6.75785 4.56522 7 4.56522C7.24215 4.56522 7.47439 4.46902 7.64562 4.29779C7.81685 4.12656 7.91304 3.89433 7.91304 3.65217C7.91304 3.41002 7.81685 3.17778 7.64562 3.00655C7.47439 2.83533 7.24215 2.73913 7 2.73913ZM5.78261 5.78261V6.3913H6.08696H6.3913V10.3478H6.08696H5.78261V10.9565H6.08696H6.3913H7.6087H7.91304H8.21739V10.3478H7.91304H7.6087V5.78261H7.30435H6.08696H5.78261Z"
                        fill="white"
                    />
                </svg>
             : 
                <svg
                    width={size || "16"}
                    height={size || "16"}
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M8 0C3.58157 0 0 3.58157 0 8C0 12.4184 3.58157 16 8 16C12.4184 16 16 12.4184 16 8C16 3.58157 12.4184 0 8 0ZM8 3.13043C8.57635 3.13043 9.04348 3.59757 9.04348 4.17391C9.04348 4.75026 8.57635 5.21739 8 5.21739C7.42365 5.21739 6.95652 4.75026 6.95652 4.17391C6.95652 3.59757 7.42365 3.13043 8 3.13043ZM9.3913 12.5217H8.69565H7.30435H6.6087V11.8261H7.30435V7.30435H6.6087V6.6087H7.30435H8.69565V7.30435V11.8261H9.3913V12.5217Z"
                        fill={infoIconBg || "#AEAEAE"}
                    />
                </svg>
            }
        </Wrapper>
    );
};
