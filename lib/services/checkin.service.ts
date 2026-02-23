import type { CheckIn } from '@/lib/types';

export interface CreateCheckInInput {
  shopId: string;
  userId: string;
  photoUrls: [string, ...string[]];
  menuPhotoUrl?: string;
  note?: string;
}

export interface ICheckInService {
  create(input: CreateCheckInInput): Promise<CheckIn>;
  getByUser(userId: string): Promise<CheckIn[]>;
  getByShop(shopId: string): Promise<CheckIn[]>;
}
