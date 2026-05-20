import {useEffect, useState} from "react";
import styled from "styled-components";

import {Paragraph, SectionTitle} from "./TermsAndPolicy.style";

export const Attributions = () => {
    const [licensesContent, setLicensesContent] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>("");

    useEffect(() => {
        fetch("/assets/LICENSES.txt")
            .then(response => {
                if (!response.ok) {
                    throw new Error("Failed to load licenses");
                }
                return response.text();
            })
            .then(text => {
                setLicensesContent(text);
                setIsLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setIsLoading(false);
            });
    }, []);

    if (isLoading) {
        return <Paragraph>Loading third-party attributions...</Paragraph>;
    }

    if (error) {
        return <Paragraph>Error loading attributions: {error}</Paragraph>;
    }

    return (
        <>
            <Paragraph>
                This application uses open-source software and third-party packages. Below is a comprehensive list of all
                third-party dependencies used in this project, along with their respective licenses.
            </Paragraph>

            <SectionTitle>License Information</SectionTitle>

            <LicenseContent>
                <pre>{licensesContent}</pre>
            </LicenseContent>
        </>
    );
};

const LicenseContent = styled.div`
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    padding: 20px;
    margin-top: 20px;
    margin-bottom: 40px;
    max-height: none;
    overflow: visible;

    pre {
        margin: 0;
        font-family: "Courier New", Courier, monospace;
        font-size: 13px;
        line-height: 1.6;
        color: #e0e0e0;
        white-space: pre-wrap;
        word-wrap: break-word;
        overflow-wrap: break-word;
    }
`;
