import { useState, useEffect } from "react";
import { Star, Quote, Sparkles, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";

const UserReviews = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const data = await api.getReviews();
      setReviews(data);
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-24 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4 animate-pulse" />
      
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, gray 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest mb-4 font-body">
            <MessageSquare className="h-3 w-3" /> Guest Stories
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold text-white mb-6">
            All <span className="text-gradient-gold">Reviews</span>
          </h1>
          <p className="text-muted-foreground text-lg font-body max-w-2xl mx-auto">
            Discover all the magical moments our guests have experienced at our private cinema.
          </p>
        </div>

        {reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {reviews.map((review, idx) => (
              <div key={review._id || idx} className="bg-[#141414] border border-white/5 p-6 md:p-10 rounded-3xl shadow-2xl relative overflow-hidden group min-h-[320px] flex flex-col hover:border-primary/20 transition-colors">
                {/* Inner glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <Quote className="absolute top-8 right-8 h-12 w-12 text-primary/10" />

                <div className="flex gap-1.5 mb-8 relative z-10">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${i < review.rating ? "fill-primary text-primary" : "text-white/10"}`}
                    />
                  ))}
                </div>

                <blockquote className="relative z-10 text-lg md:text-xl text-white/90 font-display italic leading-relaxed mb-8">
                  "{review.comment}"
                </blockquote>

                <div className="flex items-center gap-4 pt-8 border-t border-white/5 mt-auto relative z-10">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-primary font-display font-bold text-lg uppercase">
                      {review.name.charAt(0)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1 border-2 border-[#141414]">
                      <Sparkles className="h-3 w-3 text-primary-foreground" />
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-white text-base font-display tracking-wide capitalize">{review.name}</p>
                    <p className="text-[10px] text-muted-foreground font-body uppercase tracking-[0.2em] mt-1">
                      Verified Experience • {new Date(review.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-20 border border-dashed border-white/10 rounded-[2rem] bg-white/[0.02] max-w-2xl mx-auto">
            <MessageSquare className="h-12 w-12 text-white/10 mb-4" />
            <p className="text-muted-foreground font-body text-lg italic text-center">No reviews yet. Be the first to share your thoughts!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserReviews;
