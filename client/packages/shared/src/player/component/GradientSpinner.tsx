export const GradientSpinner = ({bg}: {bg?: string}) => (
    <div
        style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: bg || "rgba(0, 0, 0, 0.5)",
            zIndex: 100,
        }}
    >
        <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient
                    id="gradient1"
                    x1="0%"
                    y1="0%"
                    x2="50%"
                    y2="50%"
                >
                    <stop
                        offset="0%"
                        style={{stopColor: "#0EA5E9", stopOpacity: 1}}
                    />
                    <stop
                        offset="100%"
                        style={{stopColor: "rgba(14, 165, 233, 0)", stopOpacity: 1}}
                    />
                </linearGradient>
            </defs>
            <circle
                cx="40"
                cy="40"
                r="25"
                stroke="url(#gradient1)"
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
            >
                <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 40 40"
                    to="360 40 40"
                    dur="1s"
                    repeatCount="indefinite"
                />
            </circle>
        </svg>
    </div>
);

export default GradientSpinner;
