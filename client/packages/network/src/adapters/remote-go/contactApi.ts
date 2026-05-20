import Ajax from "@web-shared/utils/Ajax";
import {backendUrlFromPath} from "@web-shared/utils/UrlUtils";
import {ContactFormData} from "@web-shared/v2/pages/ContactUs/types";

export const submitContactForm = async (data: ContactFormData): Promise<unknown> => {
    const response = await Ajax.post({
        url: backendUrlFromPath(`/api/Contact/Submit`),
        msgBodyType: "multipart",
        data: {
            Name: data.name,
            Email: data.email,
            Reason: data.reason,
            Platform: data.platform,
            Description: data.description,
            file: data.file || undefined,
            recaptchaToken: data.recaptchaToken || undefined,
        },
        needAuthorization: false, // Public endpoint
    });

    if (response?.data.Code !== 200) {
        throw new Error(response?.data.Msg || "Failed to submit contact form");
    }

    return response.data;
};
