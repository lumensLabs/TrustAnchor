import { randomUUID } from 'node:crypto';
import { AppError } from '../errors/AppError.js';

export interface UserProfileRecord {
  id: string;
  email: string;
  walletAddress?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  country: string;
  phoneNumber?: string;
  nationalId?: string;
  kycVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserProfileData {
  email: string;
  walletAddress?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  country: string;
  phoneNumber?: string;
  nationalId?: string;
}

const profilesById = new Map<string, UserProfileRecord>();
const profileIdByEmail = new Map<string, string>();

export function createUserProfile(data: CreateUserProfileData): UserProfileRecord {
  const normalizedEmail = data.email.trim().toLowerCase();

  if (profileIdByEmail.has(normalizedEmail)) {
    throw AppError.conflict('A profile with this email already exists');
  }

  const now = new Date().toISOString();
  const profile: UserProfileRecord = {
    id: randomUUID(),
    email: normalizedEmail,
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    dateOfBirth: data.dateOfBirth,
    country: data.country.toUpperCase(),
    kycVerified: false,
    createdAt: now,
    updatedAt: now,
  };

  if (data.walletAddress) {
    profile.walletAddress = data.walletAddress;
  }
  if (data.phoneNumber) {
    profile.phoneNumber = data.phoneNumber.trim();
  }
  if (data.nationalId) {
    profile.nationalId = data.nationalId.trim();
  }

  profilesById.set(profile.id, profile);
  profileIdByEmail.set(normalizedEmail, profile.id);

  return profile;
}

export function getUserProfileById(id: string): UserProfileRecord | undefined {
  return profilesById.get(id);
}

/** Test helper to reset the in-memory store between test runs. */
export function resetUserProfileStore(): void {
  profilesById.clear();
  profileIdByEmail.clear();
}
