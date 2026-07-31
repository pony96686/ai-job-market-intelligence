import { z } from 'zod';

export const MagicLinkRequestSchema = z.object({
  email: z.string().email(),
});
export type MagicLinkRequest = z.infer<typeof MagicLinkRequestSchema>;
