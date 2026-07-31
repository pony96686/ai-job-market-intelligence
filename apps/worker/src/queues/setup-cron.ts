import { scheduleIngestionCollectCron } from './ingestion-collect.js';
import { scheduleCompanyDiscoveryCron } from './company-discovery.js';

export async function setupCronJobs(): Promise<void> {
  await scheduleCompanyDiscoveryCron();
  await scheduleIngestionCollectCron();
}
