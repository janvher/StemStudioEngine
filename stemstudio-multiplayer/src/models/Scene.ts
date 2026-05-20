import type { Document, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

export interface IScene extends Document {
    ID: Types.ObjectId;
    CollectionName: string;
    UserID: string;
    Collaborators: string[];
    IsMultiplayer: boolean;
    IsCollaborative: boolean;
    ConversationHistory: {
        [conversationId: string]: {
            [roomId: string]: Array<{
                role: string;
                content: string;
            }>;
        };
    };
}

const SceneSchenma: Schema = new Schema<IScene>({
    ID: { type: Schema.Types.ObjectId, required: true, unique: true },
    CollectionName: { type: String, required: true, unique: true },
    UserID: { type: String, required: true },
    Collaborators: { type: [String], default: [] },
    IsMultiplayer: { type: Boolean, default: false },
    ConversationHistory: {
        type: Map,
        of: {
            type: Map,
            of: [
                {
                    role: { type: String, required: true },
                    content: { type: String, required: true }
                }
            ]
        },
        default: {}
    }
});

export const Scene = mongoose.model<IScene>("_Scene", SceneSchenma, "_Scene");
