import { z } from 'zod';

// The three "per company" ATS platforms Company Discovery registers into
// ats_companies. Himalayas is an aggregator and has no company-range concept,
// so it's intentionally excluded here.
export const AtsSourceSchema = z.enum(['GREENHOUSE', 'LEVER', 'ASHBY']);
export type AtsSource = z.infer<typeof AtsSourceSchema>;

export const AtsCompanyStatusSchema = z.enum(['PENDING_VALIDATION', 'ACTIVE', 'INACTIVE']);
export type AtsCompanyStatus = z.infer<typeof AtsCompanyStatusSchema>;
