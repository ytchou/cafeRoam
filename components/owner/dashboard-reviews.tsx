'use client';
import { useState } from 'react';

interface Review {
  id: string;
  review_text: string | null;
  owner_response: string | null;
}

export function DashboardReviews({
  reviews,
  isLoading,
  onPostResponse,
}: {
  reviews: Review[];
  isLoading: boolean;
  onPostResponse: (checkinId: string, body: string) => Promise<void>;
}) {
  const [responding, setResponding] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');

  if (isLoading)
    return <div className="bg-muted h-32 animate-pulse rounded-xl" />;
  if (reviews.length === 0)
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">尚無評論</p>
    );

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="space-y-2 rounded-xl border p-4">
          {review.review_text && (
            <p className="text-sm">{review.review_text}</p>
          )}
          {review.owner_response ? (
            <div className="bg-muted rounded-lg p-3">
              <p className="text-muted-foreground mb-1 text-xs">店家回覆</p>
              <p className="text-sm">{review.owner_response}</p>
            </div>
          ) : responding === review.id ? (
            <div className="space-y-2">
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={3}
                className="bg-background w-full resize-none rounded-lg border px-3 py-2 text-sm"
                placeholder="回覆顧客..."
              />
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    await onPostResponse(review.id, responseText);
                    setResponding(null);
                    setResponseText('');
                  }}
                  className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs"
                >
                  送出回覆
                </button>
                <button
                  onClick={() => {
                    setResponding(null);
                    setResponseText('');
                  }}
                  className="text-muted-foreground text-xs"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setResponding(review.id)}
              className="text-primary text-xs hover:underline"
            >
              回覆
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
