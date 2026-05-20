import {Extension, ReaderContext, WriterContext} from "@gltf-transform/core";

export const EARTH_ANIMATION_GRAPH = "EARTH_animation_graph";

/**
 * Minimal glTF-Transform extension to round-trip EARTH_animation_graph data.
 * Preserves the top-level extension payload during read/write.
 */
export class EARTHAnimationGraphTransformExtension extends Extension {
    public readonly extensionName = EARTH_ANIMATION_GRAPH;
    public static readonly EXTENSION_NAME = EARTH_ANIMATION_GRAPH;

    private data: any = null;

    read(context: ReaderContext): this {
        const json = context.jsonDoc.json as any;
        const ext = json?.extensions?.[EARTH_ANIMATION_GRAPH];
        if (ext) {
            this.data = ext;
        }
        return this;
    }

    write(context: WriterContext): this {
        if (!this.data) return this;
        const jsonDoc: any = context.jsonDoc;
        const json = jsonDoc.json;
        json.extensions = json.extensions || {};
        json.extensions[EARTH_ANIMATION_GRAPH] = this.data;
        jsonDoc.extensionsUsed = jsonDoc.extensionsUsed || [];
        if (!jsonDoc.extensionsUsed.includes(EARTH_ANIMATION_GRAPH)) {
            jsonDoc.extensionsUsed.push(EARTH_ANIMATION_GRAPH);
        }
        return this;
    }
}
