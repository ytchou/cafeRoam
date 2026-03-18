export interface CommunityNoteAuthor {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  roleLabel: string;
}

export interface CommunityNoteCard {
  checkinId: string;
  author: CommunityNoteAuthor;
  reviewText: string;
  starRating: number | null;
  coverPhotoUrl: string | null;
  shopName: string;
  shopSlug: string;
  shopDistrict: string | null;
  likeCount: number;
  createdAt: string;
}

export interface CommunityFeedResponse {
  notes: CommunityNoteCard[];
  nextCursor: string | null;
}
