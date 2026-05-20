import {useState, useEffect, FormEvent, ChangeEvent} from "react";
import {useTranslation} from "react-i18next";

import {
    Container,
    Content,
    Wrapper,
    Form,
    FormGroup,
    Label,
    Input,
    Select,
    TextArea,
    FileInput,
    Button,
    SuccessMessage,
    ErrorMessage,
} from "./ContactUs.style";
import {ContactFormData, REASON_OPTIONS, PLATFORM_OPTIONS} from "./types";
import {submitContactForm} from "@stem/network/api/contactApi";
import {useAuthorizationContext} from "../../../context";
import {DashboardHeader} from "../../../editor/assets/v2/CreateDashboard/DashboardLayout/DashboardHeader/DashboardHeader";
import {Footer} from "../../Footer/Footer";
import {executeRecaptcha} from "../../../utils/recaptcha";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ContactUs = () => {
    const {t} = useTranslation();
    const {dbUser} = useAuthorizationContext();

    const [formData, setFormData] = useState<ContactFormData>({
        name: "",
        email: "",
        reason: REASON_OPTIONS[0],
        platform: PLATFORM_OPTIONS[0],
        description: "",
        file: null,
    });

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);

    // Pre-fill form if user is logged in
    useEffect(() => {
        if (dbUser) {
            setFormData(prev => ({
                ...prev,
                name: dbUser?.name || prev.name,
                email: dbUser?.email || prev.email,
            }));
        }
    }, [dbUser]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const {name, value} = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
        setError(null);
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;

        // Validate file size
        if (file && file.size > MAX_FILE_SIZE) {
            setFileError("File size must be less than 10MB");
            e.target.value = ""; // Reset file input
            setFormData(prev => ({...prev, file: null}));
            return;
        }

        setFileError(null);
        setFormData(prev => ({
            ...prev,
            file,
        }));
    };

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        // Validate required fields
        if (!formData.name.trim()) {
            setError("Please enter your name");
            return;
        }

        if (!formData.email.trim()) {
            setError("Please enter your email address");
            return;
        }

        if (!validateEmail(formData.email)) {
            setError("Please enter a valid email address");
            return;
        }

        if (!formData.description.trim()) {
            setError("Please enter a description");
            return;
        }

        if (fileError) {
            setError("Please fix the file upload error before submitting");
            return;
        }

        setLoading(true);

        try {
            const recaptchaToken = await executeRecaptcha("contact_submit");
            await submitContactForm({...formData, recaptchaToken});
            setSuccess(true);
            setError(null);

            // Reset form after 3 seconds
            setTimeout(() => {
                setFormData({
                    name: dbUser?.name || "",
                    email: dbUser?.email || "",
                    reason: REASON_OPTIONS[0],
                    platform: PLATFORM_OPTIONS[0],
                    description: "",
                    file: null,
                });
                setSuccess(false);

                // Reset file input
                const fileInput = document.getElementById("file-input") as HTMLInputElement;
                if (fileInput) {
                    fileInput.value = "";
                }
            }, 3000);
        } catch (err: any) {
            setError(err.message || "Failed to submit contact form. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container>
            <DashboardHeader />
            <Wrapper>
                <Content>
                    <header className="title">{t("Contact Us")}</header>
                    <div className="subtitle">
                        {t("We're here to help! Fill out the form below and we'll get back to you as soon as possible.")}
                    </div>

                    <Form onSubmit={handleSubmit}>
                        <FormGroup>
                            <Label htmlFor="name">{t("Name *")}</Label>
                            <Input
                                id="name"
                                name="name"
                                type="text"
                                value={formData.name}
                                onChange={handleInputChange}
                                disabled={loading}
                                required
                            />
                        </FormGroup>

                        <FormGroup>
                            <Label htmlFor="email">{t("Email Address *")}</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                disabled={loading}
                                required
                            />
                        </FormGroup>

                        <FormGroup>
                            <Label htmlFor="reason">{t("Reason for Contact *")}</Label>
                            <Select
                                id="reason"
                                name="reason"
                                value={formData.reason}
                                onChange={handleInputChange}
                                disabled={loading}
                                required
                            >
                                {REASON_OPTIONS.map(option => (
                                    <option
                                        key={option}
                                        value={option}
                                    >
                                        {t(option)}
                                    </option>
                                ))}
                            </Select>
                        </FormGroup>

                        <FormGroup>
                            <Label htmlFor="platform">{t("Platform *")}</Label>
                            <Select
                                id="platform"
                                name="platform"
                                value={formData.platform}
                                onChange={handleInputChange}
                                disabled={loading}
                                required
                            >
                                {PLATFORM_OPTIONS.map(option => (
                                    <option
                                        key={option}
                                        value={option}
                                    >
                                        {t(option)}
                                    </option>
                                ))}
                            </Select>
                        </FormGroup>

                        <FormGroup>
                            <Label htmlFor="description">{t("Description *")}</Label>
                            <TextArea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                disabled={loading}
                                rows={6}
                                placeholder={t("Please provide as much detail as possible...")}
                                required
                            />
                        </FormGroup>

                        <FormGroup>
                            <Label htmlFor="file-input">{t("Attachment (Optional)")}</Label>
                            <div className="file-info">{t("Maximum file size: 10MB")}</div>
                            <FileInput
                                id="file-input"
                                name="file"
                                type="file"
                                onChange={handleFileChange}
                                disabled={loading}
                            />
                            {fileError && <div className="file-error">{fileError}</div>}
                            {formData.file && !fileError && (
                                <div className="file-name">
                                    {t("Selected: {{name}} ({{size}} KB)", {
                                        name: formData.file.name,
                                        size: (formData.file.size / 1024).toFixed(2),
                                    })}
                                </div>
                            )}
                        </FormGroup>

                        {error && <ErrorMessage>{error}</ErrorMessage>}
                        {success && (
                            <SuccessMessage>
                                {t("Thank you! Your message has been sent successfully. We'll get back to you soon.")}
                            </SuccessMessage>
                        )}

                        <Button
                            type="submit"
                            disabled={loading || success}
                        >
                            {loading ? t("Submitting...") : success ? t("Submitted!") : t("Submit")}
                        </Button>
                    </Form>
                </Content>
            </Wrapper>
            <Footer />
        </Container>
    );
};
