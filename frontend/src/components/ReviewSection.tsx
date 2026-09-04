import { useState, useEffect, useCallback } from "react";
import { Star, ChevronLeft, ChevronRight, Quote, Send, User, MessageSquare, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import useEmblaCarousel from "embla-carousel-react";

interface ReviewSectionProps {
  showForm?: boolean;
  showReviews?: boolean;
}

const ReviewSection = ({ showForm = true, showReviews = true }: ReviewSectionProps) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    rating: 5,
    comment: ""
  });

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    skipSnaps: false
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

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

  // Automatic scrolling logic
  useEffect(() => {
    if (!emblaApi || reviews.length <= 1) return;

    const intervalId = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000); // Scroll every 5 seconds

    return () => clearInterval(intervalId);
  }, [emblaApi, reviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.comment.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setSubmitting(true);
    try {
      await api.addReview(formData.name, formData.rating, formData.comment);
      toast.success("Thank you for your feedback!");
      setFormData({ name: "", rating: 5, comment: "" });
      fetchReviews();
    } catch (error) {
      toast.error("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && reviews.length === 0) return null;

  return (
    <section className="py-8 bg-[#0a0a0a] relative overflow-hidden border-t border-white/5">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4 animate-pulse" />

      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, gray 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest mb-4 font-body">
            <MessageSquare className="h-3 w-3" /> Real Experiences
          </div>
          <h2 className="font-display text-4xl md:text-6xl font-bold text-white mb-6">
            Loved by <span className="text-gradient-gold">Hundreds</span> of Guests
          </h2>
          <p className="text-muted-foreground text-lg font-body max-w-2xl mx-auto">
            We take pride in creating moments that last a lifetime. Read what our guests have to say about their private cinema experience.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-12 items-start">
          {/* Review Carousel Column */}
          {showReviews && (
          <div className={`-ml-4 sm:ml-0 pr-6 sm:pr-0 ${showForm ? 'lg:col-span-3' : 'lg:col-span-5'}`}>
            {reviews.length > 0 ? (
              <div className="relative">
                <div className="overflow-hidden cursor-grab active:cursor-grabbing" ref={emblaRef}>
                  <div className="flex">
                    {reviews.map((review, idx) => (
                      <div key={review._id || idx} className="flex-[0_0_100%] min-w-0 px-2">
                        <div className="bg-[#141414] border border-white/5 p-5 md:p-6 rounded-3xl shadow-2xl relative overflow-hidden group min-h-[240px] flex flex-col">
                          {/* Inner glow */}
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                          <Quote className="absolute top-5 right-5 h-8 w-8 text-primary/10" />

                          <div className="flex gap-1 mb-4 relative z-10">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i < review.rating ? "fill-primary text-primary" : "text-white/10"}`}
                              />
                            ))}
                          </div>

                          <blockquote className="relative z-10 text-base md:text-lg text-white/90 font-display italic leading-relaxed mb-4">
                            "{review.comment}"
                          </blockquote>

                          <div className="flex items-center gap-3 pt-4 border-t border-white/5 mt-auto relative z-10">
                            <div className="relative">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-primary font-display font-bold text-base uppercase">
                                {review.name.charAt(0)}
                              </div>
                              <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5 border-2 border-[#141414]">
                                <Sparkles className="h-2.5 w-2.5 text-primary-foreground" />
                              </div>
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm font-display tracking-wide capitalize">{review.name}</p>
                              <p className="text-[9px] text-muted-foreground font-body uppercase tracking-[0.2em] mt-0.5">
                                Verified • {new Date(review.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {reviews.length > 1 && (
                  <div className="flex gap-4 mt-10 justify-center lg:justify-start">
                    <button
                      onClick={scrollPrev}
                      aria-label="Previous review"
                      className="group p-4 rounded-full border border-white/5 bg-white/5 text-white hover:border-primary/50 transition-all hover:bg-primary/10"
                    >
                      <ChevronLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <button
                      onClick={scrollNext}
                      aria-label="Next review"
                      className="group p-4 rounded-full border border-white/5 bg-white/5 text-white hover:border-primary/50 transition-all hover:bg-primary/10"
                    >
                      <ChevronRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-20 border border-dashed border-white/10 rounded-[2rem] bg-white/[0.02]">
                <MessageSquare className="h-12 w-12 text-white/10 mb-4" />
                <p className="text-muted-foreground font-body text-lg italic text-center">Your experience matters. Be the first to share your thoughts!</p>
              </div>
            )}
          </div>
          )}

          {/* Form Column */}
          {showForm && (
          <div className={`pr-6 sm:pr-0 ${showReviews ? 'lg:col-span-2' : 'lg:col-span-5 max-w-2xl mx-auto w-full'}`}>
            <div className="bg-[#141414] border border-white/5 p-6 md:p-8 rounded-3xl shadow-2xl relative">
              <h3 className="text-xl font-bold text-white mb-1 font-display">Leave a Review</h3>
              <p className="text-muted-foreground text-xs mb-6 font-body">Tell us about your visit to F&M</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 font-body">Guest Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/20 group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-primary/50 focus:bg-white/[0.08] outline-none transition-all font-body placeholder:text-white/10 text-sm"
                      placeholder="Enter your name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 font-body">Experience Rating</label>
                  <div className="flex gap-2.5 bg-white/5 p-3 rounded-xl border border-white/10 w-fit">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData({ ...formData, rating: star })}
                        aria-label={`Rate ${star} stars`}
                        className="transition-all hover:scale-110 active:scale-90"
                      >
                        <Star
                          className={`h-6 w-6 transition-colors ${star <= formData.rating ? "fill-primary text-primary" : "text-white/10"}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 font-body">Your review</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-primary/50 focus:bg-white/[0.08] outline-none transition-all font-body resize-none placeholder:text-white/10 text-sm"
                    placeholder="Describe your moments with us..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-gold text-primary-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 glow-gold mt-2 shadow-lg shadow-primary/20 text-sm"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Publishing...
                    </div>
                  ) : (
                    <>
                      Post Review <Send className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ReviewSection;
