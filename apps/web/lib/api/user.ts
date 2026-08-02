import type {
  ProfileUpdate,
  ProfileResponse,
  UserResponse,
  CareerProfileResponse,
  NotificationSettingsResponse,
} from '@ai-job-market-intelligence/shared';

export async function fetchMe(): Promise<UserResponse> {
  const res = await fetch('/api/v1/users/me');
  if (!res.ok) throw new Error('Failed to load user');
  const body = await res.json();
  return body.data;
}

export async function fetchCareerProfile(): Promise<CareerProfileResponse> {
  const res = await fetch('/api/v1/users/me/career-profile');
  if (!res.ok) throw new Error('Failed to load career profile');
  const body = await res.json();
  return body.data;
}

export async function updateProfile(data: ProfileUpdate): Promise<ProfileResponse> {
  const res = await fetch('/api/v1/users/me/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update profile');
  const body = await res.json();
  return body.data;
}

export async function uploadResume(file: File): Promise<void> {
  const formData = new FormData();
  formData.set('resume', file);
  const res = await fetch('/api/v1/users/me/resume', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Failed to upload resume');
}

export async function linkGithub(username: string): Promise<void> {
  const res = await fetch('/api/v1/users/me/github', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) throw new Error('Failed to link GitHub account');
}

export async function updateNotificationSettings(
  dailyBriefEnabled: boolean,
): Promise<NotificationSettingsResponse> {
  const res = await fetch('/api/v1/users/me/notifications', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dailyBriefEnabled }),
  });
  if (!res.ok) throw new Error('Failed to update notification settings');
  const body = await res.json();
  return body.data;
}
