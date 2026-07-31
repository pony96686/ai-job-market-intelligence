import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    atsCompany: { count: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
  },
}));
const { mockCommonCrawlDiscovery, mockProbeOfficialApi } = vi.hoisted(() => ({
  mockCommonCrawlDiscovery: vi.fn(),
  mockProbeOfficialApi: vi.fn(),
}));

vi.mock('@ai-job-market-intelligence/db', () => ({ prisma: mockPrisma }));

vi.mock('@ai-job-market-intelligence/shared/ingestion', () => ({
  commonCrawlDiscovery: mockCommonCrawlDiscovery,
  probeOfficialApi: mockProbeOfficialApi,
  hashToBucket: (slug: string) => slug.length % 48,
}));

vi.mock('../../logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));

import { processCompanyDiscovery } from '../company-discovery';

function makeJob(data: Record<string, unknown>) {
  return { id: 'discover:1', data } as never;
}

beforeEach(() => {
  mockPrisma.atsCompany.count.mockReset();
  mockPrisma.atsCompany.findUnique.mockReset();
  mockPrisma.atsCompany.upsert.mockReset();
  mockCommonCrawlDiscovery.mockReset();
  mockProbeOfficialApi.mockReset();

  mockPrisma.atsCompany.count.mockResolvedValue(0);
  mockPrisma.atsCompany.findUnique.mockResolvedValue(null);
});

describe('processCompanyDiscovery', () => {
  it('registers newly discovered, validated companies as ACTIVE', async () => {
    mockCommonCrawlDiscovery.mockResolvedValue([{ source: 'GREENHOUSE', slug: 'acme' }]);
    mockProbeOfficialApi.mockResolvedValue(true);

    await processCompanyDiscovery(makeJob({ source: 'GREENHOUSE' }));

    expect(mockCommonCrawlDiscovery).toHaveBeenCalledWith('GREENHOUSE');
    expect(mockPrisma.atsCompany.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { source_slug: { source: 'GREENHOUSE', slug: 'acme' } },
        create: expect.objectContaining({ source: 'GREENHOUSE', slug: 'acme', status: 'ACTIVE' }),
      }),
    );
  });

  it('registers a candidate as PENDING_VALIDATION when the official API probe fails', async () => {
    mockCommonCrawlDiscovery.mockResolvedValue([{ source: 'LEVER', slug: 'widgetco' }]);
    mockProbeOfficialApi.mockResolvedValue(false);

    await processCompanyDiscovery(makeJob({ source: 'LEVER' }));

    expect(mockPrisma.atsCompany.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ status: 'PENDING_VALIDATION' }) }),
    );
  });

  it('does not register brand-new companies once the scale target is reached, but still re-validates existing ones', async () => {
    mockPrisma.atsCompany.count.mockResolvedValue(1500);
    mockCommonCrawlDiscovery.mockResolvedValue([
      { source: 'GREENHOUSE', slug: 'newco' },
      { source: 'GREENHOUSE', slug: 'oldco' },
    ]);
    mockPrisma.atsCompany.findUnique.mockImplementation(({ where }) =>
      where.source_slug.slug === 'oldco' ? Promise.resolve({ id: 'existing' }) : Promise.resolve(null),
    );
    mockProbeOfficialApi.mockResolvedValue(true);

    process.env.COMPANY_DISCOVERY_TARGET_COMPANY_COUNT = '1500';
    await processCompanyDiscovery(makeJob({ source: 'GREENHOUSE' }));
    delete process.env.COMPANY_DISCOVERY_TARGET_COMPANY_COUNT;

    expect(mockPrisma.atsCompany.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.atsCompany.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { source_slug: { source: 'GREENHOUSE', slug: 'oldco' } } }),
    );
  });
});
