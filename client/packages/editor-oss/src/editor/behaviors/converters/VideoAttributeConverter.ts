import { BehaviorAttributeData, VideoAttribute } from "../BehaviorAttributes";
import BehaviorAttributeType from "../BehaviorAttributeType";
import { BehaviorContext } from "../BehaviorContextProvider";
import AttributeConverter from "./AttributeConverter";

class VideoAttributeConverter implements AttributeConverter {
    convertAttribute(attributeData: BehaviorAttributeData, behaviorContext: BehaviorContext): VideoAttribute {
        const videos = behaviorContext.resources?.videos || [];

        // Convert video URLs to options with readable labels
        const options = videos.map((videoUrl: string) => {
            let label = videoUrl;
            try {
                if (typeof videoUrl === "string" && (videoUrl.startsWith("http://") || videoUrl.startsWith("https://"))) {
                    label = new URL(videoUrl, window.location.origin).pathname.split("/").pop() || videoUrl;
                }
            } catch {
                label = videoUrl.split("/").pop() || videoUrl;
            }
            return {
                label,
                value: videoUrl,
            };
        });

        // Add "None" as first option
        const allOptions = [{ label: "None", value: "none" }, ...options];

        // Validate default value exists in options
        let defaultValue = attributeData.default || "none";
        const valueExists = allOptions.some(opt => opt.value === defaultValue);
        if (!valueExists) {
            defaultValue = "none";
        }

        return {
            name: attributeData.name,
            type: BehaviorAttributeType.Video,
            array: attributeData.array || false,
            invisible: attributeData.invisible || false,
            visibleIf: attributeData.visibleIf,
            default: defaultValue,
            options: allOptions,
            order: attributeData.order || 0,
        };
    }
}

export default VideoAttributeConverter;
