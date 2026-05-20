import z from 'zod';

export const makeMetadataSchema = (name: string) => z.object({
    metadata: z.object({
        generator: z.literal(name),
    }),
});
