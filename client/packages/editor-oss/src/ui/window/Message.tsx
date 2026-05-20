import "./css/Message.css";
import classNames from "classnames";
import React, {CSSProperties, forwardRef} from "react";

interface MessageProps {
    className?: string;
    style?: CSSProperties;
    children?: React.ReactNode;
    type?: "info" | "success" | "warn" | "error";
}

const Message = forwardRef<HTMLDivElement, MessageProps>(({className, style, children, type = "info"}, ref) => {
    return (
        <div ref={ref}
            className={classNames("Message", type, className)}
            style={style}
        >
            <i className={classNames("iconfont", `icon-${type}`)} />
            <p className="content">{children}</p>
        </div>
    );
});

Message.displayName = "Message";

export default Message;
