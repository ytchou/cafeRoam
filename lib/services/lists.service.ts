import type { List } from '@/lib/types';

export interface CreateListInput {
  userId: string;
  name: string;
}

export interface IListsService {
  getByUser(userId: string): Promise<List[]>;
  create(input: CreateListInput): Promise<List>;
  delete(listId: string, userId: string): Promise<void>;
  addShop(listId: string, shopId: string, userId: string): Promise<void>;
  removeShop(listId: string, shopId: string, userId: string): Promise<void>;
}
