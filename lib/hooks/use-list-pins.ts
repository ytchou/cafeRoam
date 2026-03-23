'use client';
import useSWR from 'swr';
import { fetchWithAuth } from '@/lib/api/fetch';

export interface ListPin {
  listId: string;
  shopId: string;
  lat: number;
  lng: number;
}

export function useListPins() {
  const { data, error, isLoading } = useSWR<ListPin[]>(
    '/api/lists/pins',
    fetchWithAuth
  );
  return { pins: data ?? [], error, isLoading };
}
