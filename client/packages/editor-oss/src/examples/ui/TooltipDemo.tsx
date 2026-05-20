import React, {useRef} from "react";
import {useTranslation} from "react-i18next";
import styled from "styled-components";

import {Tooltip, TabTooltip, useTooltip} from "../../editor/assets/v2/common";

const DemoContainer = styled.div`
    padding: 40px;
    max-width: 1200px;
    margin: 0 auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
`;

const Section = styled.section`
    margin-bottom: 60px;

    h2 {
        color: #333;
        border-bottom: 2px solid #e1e5e9;
        padding-bottom: 10px;
        margin-bottom: 30px;
    }

    h3 {
        color: #666;
        margin: 30px 0 15px 0;
    }
`;

const DemoGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 30px;
    margin-bottom: 30px;
`;

const DemoCard = styled.div`
    border: 1px solid #e1e5e9;
    border-radius: 8px;
    padding: 20px;
    background: #f8f9fa;

    h4 {
        margin: 0 0 15px 0;
        color: #495057;
    }

    p {
        margin: 0 0 15px 0;
        font-size: var(--theme-font-size-s);
        color: #6c757d;
    }
`;

const TriggerButton = styled.button`
    background: #007bff;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: var(--theme-font-size-s);
    margin: 5px;

    &:hover {
        background: #0056b3;
    }

    &:disabled {
        background: #6c757d;
        cursor: not-allowed;
    }
`;

const IconButton = styled.button`
    background: #28a745;
    color: white;
    border: none;
    padding: 8px;
    border-radius: 50%;
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: 5px;

    &:hover {
        background: #1e7e34;
    }
`;

const TabContainer = styled.div`
    display: flex;
    border-bottom: 1px solid #e1e5e9;
    margin-bottom: 20px;
`;

const Tab = styled.button<{active?: boolean}>`
    background: ${props => props.active ? "#007bff" : "transparent"};
    color: ${props => props.active ? "white" : "#666"};
    border: none;
    padding: 10px 20px;
    cursor: pointer;
    border-bottom: 2px solid ${props => props.active ? "#007bff" : "transparent"};

    &:hover {
        background: ${props => props.active ? "#0056b3" : "#f8f9fa"};
    }
`;

const CodeBlock = styled.pre`
    background: #f8f9fa;
    border: 1px solid #e1e5e9;
    border-radius: 4px;
    padding: 15px;
    font-size: 12px;
    overflow-x: auto;
    margin: 15px 0;
`;

const MobileInfo = styled.div`
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 4px;
    padding: 15px;
    margin: 20px 0;

    h4 {
        margin: 0 0 10px 0;
        color: #856404;
    }

    ul {
        margin: 10px 0 0 20px;
        color: #856404;
    }
`;

const RichContent = styled.div`
    h4 {
        margin: 0 0 10px 0;
        color: #007bff;
    }

    p {
        margin: 0 0 10px 0;
        font-size: 13px;
    }

    button {
        background: #28a745;
        color: white;
        border: none;
        padding: 5px 10px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;

        &:hover {
            background: #1e7e34;
        }
    }
`;

// Custom hook demo component
const CustomHookDemo: React.FC = () => {
    const {t} = useTranslation();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [tooltipState, tooltipActions] = useTooltip(buttonRef as React.RefObject<HTMLElement>, {
        delay: 500,
        position: "auto",
        touchBehavior: "tap",
    });

    return (
        <DemoCard>
            <h4>Custom Hook Integration</h4>
            <p>Using useTooltip hook for full control over tooltip behavior</p>

            <TriggerButton ref={buttonRef}
                {...tooltipActions}
            >
                Custom Hook Button
            </TriggerButton>

            {tooltipState.visible && 
                <div
                    style={{
                        position: "fixed",
                        top: tooltipState.position.top,
                        left: tooltipState.position.left,
                        background: "#333",
                        color: "white",
                        padding: "8px 12px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        zIndex: 10000,
                        maxWidth: "200px",
                    }}
                >
                    {t("Custom hook tooltip with {{placement}} placement", {
                        placement: tooltipState.position.placement,
                    })}
                </div>
            }
        </DemoCard>
    );
};

export const TooltipDemo: React.FC = () => {
    const [activeTab, setActiveTab] = React.useState(0);

    return (
        <DemoContainer>
            <h1>Enhanced Tooltip System Demo</h1>

            <MobileInfo>
                <h4>📱 Mobile & Touch Support</h4>
                <p>
                    This tooltip system automatically detects mobile devices and provides optimized touch interactions:
                </p>
                <ul>
                    <li>
                        <strong>Hover behavior:</strong> Works like desktop (default)
                    </li>
                    <li>
                        <strong>Tap behavior:</strong> Show/hide on quick tap
                    </li>
                    <li>
                        <strong>Long press:</strong> Show after press and hold
                    </li>
                    <li>
                        <strong>Auto-hide:</strong> Automatically dismisses after 3 seconds on mobile
                    </li>
                </ul>
            </MobileInfo>

            <Section>
                <h2>Basic Tooltips</h2>

                <DemoGrid>
                    <DemoCard>
                        <h4>Standard Tooltip</h4>
                        <p>Default hover behavior with smart positioning</p>

                        <Tooltip text="This is a standard tooltip that appears on hover">
                            <TriggerButton>Hover for tooltip</TriggerButton>
                        </Tooltip>
                    </DemoCard>

                    <DemoCard>
                        <h4>Custom Styled</h4>
                        <p>Tooltip with custom background and padding</p>

                        <Tooltip
                            text="Custom styled tooltip with blue background"
                            background="#007bff"
                            padding="12px 16px"
                        >
                            <TriggerButton>Custom Style</TriggerButton>
                        </Tooltip>
                    </DemoCard>

                    <DemoCard>
                        <h4>Mobile Tap Behavior</h4>
                        <p>Shows on tap for mobile devices</p>

                        <Tooltip text="Tap me on mobile, hover on desktop"
                            touchBehavior="tap"
                        >
                            <TriggerButton>Tap/Hover</TriggerButton>
                        </Tooltip>
                    </DemoCard>

                    <DemoCard>
                        <h4>Long Press (Mobile)</h4>
                        <p>Requires long press on mobile</p>

                        <Tooltip
                            text="Long press on mobile to see this tooltip"
                            touchBehavior="longPress"
                            longPressDelay={750}
                        >
                            <TriggerButton>Long Press</TriggerButton>
                        </Tooltip>
                    </DemoCard>
                </DemoGrid>

                <h3>Icon Tooltips</h3>
                <div style={{marginBottom: "20px"}}>
                    <Tooltip text="Save document">
                        <IconButton>💾</IconButton>
                    </Tooltip>

                    <Tooltip text="Delete item">
                        <IconButton>🗑️</IconButton>
                    </Tooltip>

                    <Tooltip text="Share content">
                        <IconButton>📤</IconButton>
                    </Tooltip>

                    <Tooltip text="Settings menu">
                        <IconButton>⚙️</IconButton>
                    </Tooltip>
                </div>
            </Section>

            <Section>
                <h2>Tab Tooltips</h2>
                <p>Specialized tooltips for tab interfaces with optimized positioning</p>

                <TabContainer>
                    {["Dashboard", "Analytics", "Settings", "Help"].map((label, index) => 
                        <TabTooltip key={index}
                            text={`${label} - Click to switch to this tab`}
                            delay={400}
                        >
                            <Tab active={activeTab === index}
                                onClick={() => setActiveTab(index)}
                            >
                                {label}
                            </Tab>
                        </TabTooltip>,
                    )}
                </TabContainer>
            </Section>

            <Section>
                <h2>Rich Content Tooltips</h2>
                <p>Tooltips that can contain React components and interactive content</p>

                <DemoGrid>
                    <DemoCard>
                        <h4>Interactive Content</h4>
                        <p>Tooltip stays open when hovering over its content</p>

                        <Tooltip
                            content={
                                <RichContent>
                                    <h4>User Profile</h4>
                                    <p>
                                        John Doe
                                        <br />
                                        john@example.com
                                    </p>
                                    <button onClick={() => alert("Profile clicked!")}>View Profile</button>
                                </RichContent>
                            }
                        >
                            <TriggerButton>User Info</TriggerButton>
                        </Tooltip>
                    </DemoCard>

                    <DemoCard>
                        <h4>Help Content</h4>
                        <p>Rich help content with formatting</p>

                        <Tooltip
                            content={
                                <RichContent>
                                    <h4>Keyboard Shortcuts</h4>
                                    <p>
                                        <strong>Ctrl+S:</strong> Save file
                                    </p>
                                    <p>
                                        <strong>Ctrl+Z:</strong> Undo
                                    </p>
                                    <p>
                                        <strong>Ctrl+Y:</strong> Redo
                                    </p>
                                </RichContent>
                            }
                        >
                            <IconButton>⌨️</IconButton>
                        </Tooltip>
                    </DemoCard>
                </DemoGrid>
            </Section>

            <Section>
                <h2>Custom Hook Usage</h2>
                <p>Using the useTooltip hook for advanced integrations</p>

                <DemoGrid>
                    <CustomHookDemo />

                    <DemoCard>
                        <h4>Hook Benefits</h4>
                        <p>The useTooltip hook provides:</p>
                        <ul style={{fontSize: "13px", marginLeft: "20px"}}>
                            <li>Full control over positioning</li>
                            <li>Custom event handling</li>
                            <li>Programmatic show/hide</li>
                            <li>Mobile touch integration</li>
                        </ul>
                    </DemoCard>
                </DemoGrid>

                <CodeBlock>{`
const MyComponent = () => {
  const buttonRef = useRef(null);
  const [tooltipState, tooltipActions] = useTooltip(buttonRef, {
    delay: 300,
    position: 'auto',
    touchBehavior: 'tap',
    autoHideDelay: 3000
  });

  return (
    <button ref={buttonRef} {...tooltipActions}>
      My Button
    </button>
  );
};`}</CodeBlock>
            </Section>

            <Section>
                <h2>Performance Features</h2>

                <DemoGrid>
                    <DemoCard>
                        <h4>Smart Positioning</h4>
                        <p>Automatically adjusts position to stay within viewport bounds</p>

                        <div style={{display: "flex", justifyContent: "space-between", flexWrap: "wrap"}}>
                            <Tooltip text="Top edge tooltip">
                                <TriggerButton>Top Edge</TriggerButton>
                            </Tooltip>

                            <Tooltip text="Right edge tooltip">
                                <TriggerButton>Right Edge</TriggerButton>
                            </Tooltip>
                        </div>
                    </DemoCard>

                    <DemoCard>
                        <h4>Memory Safe</h4>
                        <p>Proper cleanup prevents memory leaks</p>
                        <ul style={{fontSize: "12px", marginLeft: "20px"}}>
                            <li>✅ Timeout cleanup</li>
                            <li>✅ Event listener removal</li>
                            <li>✅ Portal DOM cleanup</li>
                            <li>✅ Reference cleanup</li>
                        </ul>
                    </DemoCard>

                    <DemoCard>
                        <h4>Accessibility</h4>
                        <p>Full WCAG 2.1 AA compliance</p>
                        <ul style={{fontSize: "12px", marginLeft: "20px"}}>
                            <li>✅ ARIA attributes</li>
                            <li>✅ Keyboard navigation</li>
                            <li>✅ Screen reader support</li>
                            <li>✅ Focus management</li>
                        </ul>
                    </DemoCard>

                    <DemoCard>
                        <h4>Cross-Platform</h4>
                        <p>Optimized for all devices</p>
                        <ul style={{fontSize: "12px", marginLeft: "20px"}}>
                            <li>🖥️ Desktop (hover)</li>
                            <li>📱 Mobile (touch)</li>
                            <li>📟 Tablet (hybrid)</li>
                            <li>⌨️ Keyboard only</li>
                        </ul>
                    </DemoCard>
                </DemoGrid>
            </Section>
        </DemoContainer>
    );
};
