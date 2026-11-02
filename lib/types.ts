export type PublicUser = { id: string; name: string };
export type User = PublicUser & { phone_number: string; is_admin: boolean };
export type Page<T> = { items: T[]; total: number; page: number; page_size: number };
export type Option = { value: number; label: string };
export type Enums = Record<
  'genre' | 'region' | 'review_keyword' | 'publicity' | 'keyword_analysis_status',
  Option[]
>;
export type Statistics = {
  review_count: number;
  rating_count: number;
  normalized_rating: number | null;
  avg_rating: number | null;
  avg_difficulty: number | null;
  avg_horrorness: number | null;
  avg_physicality: number | null;
  most_genre_list: number[] | null;
  updated_dt: string | null;
};
export type Cafe = {
  id: string;
  name: string;
  region: number;
  address?: string;
  website?: string | null;
  phone_number?: string;
};
export type Theme = {
  id: string;
  name: string;
  cafe: Cafe;
  image_url: string | null;
  length: number;
  statistics: Statistics;
  description?: string;
  website?: string | null;
};
export type Photo = { id: string; url: string };
export type Review = {
  photos: Photo[];
  id: string;
  theme_id: string;
  theme_name: string;
  theme_image_url: string | null;
  created_dt: string;
  updated_dt: string;
  cafe_name: string;
  author: PublicUser;
  rating: number;
  date: string;
  is_success: boolean | null;
  people_size: number | null;
  hint_count: number | null;
  played_time: number | null;
  content: string | null;
  genre_list: number[];
  review_keyword_list: number[];
  keyword_analysis_status: number;
  difficulty: number | null;
  horrorness: number | null;
  physicality: number | null;
};
export type Friend = { id: string; friend: PublicUser };
export type FriendRequest = { id: string; requesting_user: PublicUser; requested_user: PublicUser };
export type Settings = { calendar_publicity: number; party_search_publicity: number };
export type CalendarData = {
  user: PublicUser;
  month: string;
  items: {
    review_id: string;
    theme_id: string;
    theme_name: string;
    cafe_name: string;
    date: string;
    rating: number;
    is_success: boolean | null;
    image_url: string | null;
  }[];
};
