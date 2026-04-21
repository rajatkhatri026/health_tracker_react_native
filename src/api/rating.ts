import api from './axios';

export interface UserRating {
  rating_id: string;
  stars: number;
  review?: string;
}

export const submitRating = async (stars: number, review?: string): Promise<UserRating> => {
  const { data } = await api.post<UserRating>('/ratings', { stars, review });
  return data;
};

export const getMyRating = async (): Promise<UserRating | null> => {
  const { data } = await api.get<UserRating | null>('/ratings/me');
  return data;
};
