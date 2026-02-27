import React from 'react';
import { MessageSquare, Star } from 'lucide-react';

interface RecentReview {
  _id: string;
  customer: { name: string };
  rating: { score: number; review: string };
}

interface RecentReviewsListProps {
  reviews: RecentReview[];
};

// Helper function to determine background and border colors based on rating
const getSentimentClasses = (score: number) => {
  if (score >= 4) {
    return 'bg-green-50 border-green-200'; // Positive
  }
  if (score >= 3) {
    return 'bg-yellow-50 border-yellow-200'; // Neutral
  }
  return 'bg-red-50 border-red-200'; // Negative
};

export const RecentReviewsList: React.FC<RecentReviewsListProps> = ({ reviews }) => (
  <div className="bg-white rounded-xl shadow-lg p-6">
    <h2 className="text-xl font-semibold text-gray-800 mb-6">Recent Reviews</h2>
    <div className="space-y-4">
      {reviews.length > 0 ? reviews.map(review => (
        <div key={review._id} className={`p-4 rounded-lg border ${getSentimentClasses(review.rating.score)}`}>
          <div className="flex items-start space-x-4">
            <div className="bg-white p-3 rounded-full shadow-sm">
              <MessageSquare className="h-5 w-5 text-gray-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-800">{review.customer.name}</p>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-bold text-gray-700">{review.rating.score.toFixed(1)}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 italic mt-1">"{review.rating.review}"</p>
            </div>
          </div>
        </div>
      )) : (
        <div className="text-center py-8 text-gray-500"><p>No reviews with comments yet.</p></div>
      )}
    </div>
  </div>
);