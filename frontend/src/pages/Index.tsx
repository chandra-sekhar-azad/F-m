import { ArrowRight, Play, Phone, MapPin, Star, Sparkles, Instagram, Facebook, Twitter, MessageCircle, ChevronLeft, ChevronRight, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
const heroImg = "/hero-theatre.jpg";
import partyImg from "@/assets/party-hall.jpg";
import theatreImg from "@/assets/private-theatre.jpg";
import { api, type Branch, type BranchVideo } from "@/lib/api";
import ReviewSection from "@/components/ReviewSection";



const Index = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [heroImages, setHeroImages] = useState<string[]>([heroImg]);
  const [branchSocials, setBranchSocials] = useState<Record<string, any>>({});
  const [currentHero, setCurrentHero] = useState(0);
  const [loading, setLoading] = useState(true);
  const [branchVideos, setBranchVideos] = useState<Record<string, BranchVideo[]>>({});
  const [brokenVideoIds, setBrokenVideoIds] = useState<Record<string, true>>({});
  const [activeVideoBranch, setActiveVideoBranch] = useState<string>("branch-1");
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [bData, hData] = await Promise.all([
          api.getBranches(),
          api.getHeroImages("branch-1") // Default to branch-1 for home page carousel
        ]);
        setBranches(bData);
        setHeroImages(hData.length > 0 ? hData : [heroImg]); // Fallback to static if empty

        // Fetch socials and videos for all branches
        const socialPromises = bData.map(async (b) => {
          const s = await api.getSocialLinks(b.id);
          return { id: b.id, ...s };
        });
        const allSocials = await Promise.all(socialPromises);
        const socialMap = allSocials.reduce((acc, s) => ({ ...acc, [s.id]: s }), {});
        setBranchSocials(socialMap);

        // Fetch videos per branch
        const videoPromises = bData.map(async (b) => {
          const vids = await api.getBranchVideos(b.id).catch(() => []);
          return { id: b.id, vids };
        });
        const allVideos = await Promise.all(videoPromises);
        const videoMap = allVideos.reduce((acc, { id, vids }) => ({ ...acc, [id]: vids }), {});
        setBranchVideos(videoMap);
      } catch (error) {
        console.error("Failed to load home data:", error);
        setHeroImages([heroImg]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentHero((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages]);

  

  useEffect(() => {
    const currentVideo = videoRef.current;
    if (!currentVideo) return;

    currentVideo.muted = isVideoMuted;
    currentVideo.volume = isVideoMuted ? 0 : 1;

    if (isVideoMuted) {
      currentVideo.play().catch(() => {});
    }
  }, [activeVideoBranch, branchVideos, isVideoMuted]);

  const handleVideoMuteToggle = () => {
    const currentVideo = videoRef.current;
    if (!currentVideo) return;

    const nextMuted = !isVideoMuted;
    currentVideo.muted = nextMuted;
    currentVideo.volume = nextMuted ? 0 : 1;
    setIsVideoMuted(nextMuted);

    if (!nextMuted) {
      currentVideo.play().catch(() => {});
    }
  };

  const handleVideoError = (video: BranchVideo) => {
    setBrokenVideoIds((prev) => ({ ...prev, [video.id]: true }));
  };

  

  return (
    <div className="min-h-screen">

      {/* Hero */}
      <section className="relative flex min-h-[90vh] md:min-h-screen items-center overflow-hidden">
        <div className="hero-placeholder" />
        <div className="absolute inset-0">
          {heroImages.map((img, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-1000 ${idx === currentHero ? "opacity-100" : "opacity-0"}`}
            >
              <img
                src={img}
                alt={`Premium experience ${idx}`}
                className="h-full w-full object-cover"
                width={1920}
                height={1080}
                fetchPriority={idx === 0 ? "high" : "low"}
                loading={idx === 0 ? "eager" : "lazy"}
                decoding="async"
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />

          {heroImages.length > 1 && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {heroImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentHero(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-1.5 transition-all rounded-full ${i === currentHero ? "w-8 bg-primary" : "w-2 bg-white/30"}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="container relative z-10 mx-auto px-4 pt-32 pb-12 md:pt-24 md:pb-0">
          <div className="mb-4 flex flex-wrap items-center gap-3 animate-fade-in">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/20">
              <Sparkles className="h-3 w-3" /> Celebrating 2 Years
            </span>
            <p className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground font-body">
              Private Theatre & Party Hall
            </p>
          </div>
          <h1 className="mb-6 max-w-4xl 3xl:max-w-6xl font-display text-4xl font-bold leading-tight text-foreground md:text-7xl 3xl:text-9xl animate-slide-up">
            Best <span className="text-gradient-gold">Private Theatre</span> & Party Hall
          </h1>
          <p className="mb-8 md:mb-10 max-w-xl 3xl:max-w-4xl text-base md:text-lg 3xl:text-3xl leading-relaxed text-muted-foreground font-body animate-slide-up delay-100">
            Book the <strong>best private theatre in Eluru</strong> or a <strong>premium private theatre in Bhimavaram</strong> for birthdays, anniversaries, proposals, or just a night out with friends. Affordable packages with custom decorations and cake.
          </p>
          <div className="flex flex-wrap items-center gap-4 animate-slide-up delay-200">
            <Link
              to="/booking"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-8 py-4 text-sm font-semibold text-primary-foreground transition-all hover:scale-105 glow-gold font-body"
            >
              Book Now <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#services"
              className="inline-flex items-center gap-2 rounded-full border border-border px-8 py-4 text-sm font-medium text-foreground transition-colors hover:border-primary font-body"
            >
              <Play className="h-4 w-4" /> View Services
            </a>
          </div>
          {branches.length > 0 && (
            <a href={`tel:${branches[0].phone}`} className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground font-body hover:text-primary transition-colors">
              <Phone className="h-4 w-4 text-primary" /> Call us: {branches[0].phone}
            </a>
          )}
        </div>
      </section>

      {/* Branch Videos — Switch between branches */}
      {branches.length > 0 && (
        <section ref={videoSectionRef} id="venue-videos" className="py-4 border-b border-border bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="mb-4 flex justify-end">
              <Link
                to="/reels"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Reels <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-primary font-body">Our Venues</p>
            <h2 className="mb-3 text-center font-display text-3xl font-bold text-foreground md:text-4xl">
              See Us <span className="text-gradient-gold">In Action</span>
            </h2>
            <p className="mb-10 text-center text-sm text-muted-foreground font-body">
              Switch between our branches to take a look inside
            </p>

            {/* Branch Switch */}
            <div className="flex items-center justify-center mb-10">
              <div className="relative flex items-center rounded-full bg-muted/60 border border-border p-1 gap-1 shadow-inner">
                {/* Sliding background pill */}
                <span
                  aria-hidden="true"
                  className={`absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-full bg-gradient-gold shadow-md transition-transform duration-300 ease-in-out ${
                    activeVideoBranch === "branch-2" ? "translate-x-[calc(100%+4px)]" : "translate-x-0"
                  }`}
                />
                {/* Branch 1 button */}
                <button
                  role="radio"
                  aria-checked={activeVideoBranch === "branch-1"}
                  onClick={() => {
                    setActiveVideoBranch("branch-1");
                    setIsVideoMuted(true);
                    if (videoRef.current) videoRef.current.pause();
                  }}
                  className={`relative z-10 flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold font-body transition-colors duration-300 focus:outline-none ${
                    activeVideoBranch === "branch-1"
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {branches.find(b => b.id === "branch-1")?.name?.split("-")[1]?.trim() || "Eluru"}
                </button>
                {/* Branch 2 button */}
                <button
                  role="radio"
                  aria-checked={activeVideoBranch === "branch-2"}
                  onClick={() => {
                    setActiveVideoBranch("branch-2");
                    setIsVideoMuted(true);
                    if (videoRef.current) videoRef.current.pause();
                  }}
                  className={`relative z-10 flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold font-body transition-colors duration-300 focus:outline-none ${
                    activeVideoBranch === "branch-2"
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {branches.find(b => b.id === "branch-2")?.name?.split("-")[1]?.trim() || "Bhimavaram"}
                </button>
              </div>
            </div>

            {/* Video Card */}
            {(() => {
              const activeBranch = branches.find(b => b.id === activeVideoBranch);
              const videos = (branchVideos[activeVideoBranch] || []).filter((item) => !brokenVideoIds[item.id]);

              if (!activeBranch) return null;

              if (videos.length === 0) {
                return (
                  <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-card overflow-hidden shadow-xl">
                    <div className="relative aspect-[4/5] bg-muted/40 flex flex-col items-center justify-center gap-3">
                      <Video className="h-12 w-12 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground font-body">Video coming soon for {activeBranch.name}</p>
                    </div>
                  </div>
                );
              }

              const video = videos[0];
              return (
                <div className="mx-auto max-w-md rounded-2xl border border-border bg-card overflow-hidden shadow-xl transition-all hover:border-primary/50 hover:glow-gold">
                  <div className="relative aspect-[4/5] bg-black">
                    <video
                      ref={videoRef}
                      key={video.url}
                      src={video.url}
                      autoPlay
                      muted={isVideoMuted}
                      loop
                      playsInline
                      onError={() => handleVideoError(video)}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 backdrop-blur-sm pointer-events-none">
                      <Video className="h-3 w-3 text-primary" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white">
                        {activeBranch.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleVideoMuteToggle}
                      className="absolute top-3 right-3 inline-flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/85"
                    >
                      {isVideoMuted ? "Unmute" : "Mute"}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* Services */}
      <section id="services" className="py-4">
        <div className="container mx-auto px-4">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-primary font-body">Our Services</p>
          <h2 className="mb-16 text-center font-display text-4xl font-bold text-foreground md:text-5xl">
            Choose Your <span className="text-gradient-gold">Experience</span>
          </h2>
          <div className="mx-auto grid max-w-2xl gap-8 md:grid-cols-1">
            {[
              { id: "private-theatre-party-hall", img: heroImg, title: "Private Theatre + Party Hall", desc: "Experience the ultimate celebration with our combined premium private theatre and elegant party hall service.", features: ["1000+ happy customers", "4K Projection & Dolby Sound", "Decorations included", "Recliner seating & AC"] },
            ].map((service) => (
              <div
                key={service.title}
                className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/50 hover:glow-gold"
              >
                <div className="relative h-80 overflow-hidden">
                  <img src={service.img} alt={service.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" width={1000} height={600} />
                  <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                </div>
                <div className="p-8">
                  <h3 className="mb-3 font-display text-3xl font-bold text-gradient-gold">{service.title}</h3>
                  <p className="mb-5 text-sm leading-relaxed text-muted-foreground font-body">
                    Looking for a <strong>private party theatre in Bhimavaram</strong> or a <strong>private theatre with cake in Eluru</strong>? Our combined pack offers the perfect celebration space for any occasion.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 mb-8">
                    {service.features.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm text-foreground font-body">
                        <Sparkles className="h-4 w-4 text-primary" /> {f}
                      </div>
                    ))}
                  </div>
                  <Link
                    to={`/booking?service=${service.id}`}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-8 py-4 text-sm font-semibold text-primary-foreground transition-all hover:scale-105 font-body w-full justify-center"
                  >
                    Check Availability & Book Now <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Branches */}
      <section className="border-t border-border py-4">
        <div className="container mx-auto px-4">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-primary font-body">Locations</p>
          <h2 className="mb-16 text-center font-display text-4xl font-bold text-foreground md:text-5xl">
            Our <span className="text-gradient-gold">Branches</span>
          </h2>
          {loading ? (
            <div className="text-center text-muted-foreground font-body">Loading branches...</div>
          ) : (
            <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
              {branches.map((branch) => (
                <div key={branch.id} className="rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary">
                  <h3 className="mb-4 font-display text-xl font-bold text-foreground">{branch.name}</h3>
                  <div className="space-y-3 text-sm text-muted-foreground font-body">
                    <p className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {branch.address}
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" /> {branch.phone}
                    </p>
                  </div>
                  <div className="mt-6 flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                    <span className="ml-2 text-xs text-muted-foreground font-body">4.9 (200+ reviews)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SEO Keywords Section */}
      <section className="py-4 border-t border-border bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="mb-10 font-display text-3xl font-bold text-foreground">Premium Celebration Venues in Andhra Pradesh</h2>
            <div className="grid md:grid-cols-2 gap-12 text-sm text-muted-foreground leading-relaxed font-body">
              <div className="space-y-4">
                <p>
                  Looking for the <strong>best birthday celebration places</strong> or a <strong>surprise birthday party hall</strong>?
                  Friends & Memories offers the most elegant <strong>private theatre booking near me</strong> services in Eluru and Bhimavaram.
                  Whether it's a <strong>mini theatre booking</strong> for a movie night or a <strong>romantic proposal place</strong>,
                  our venues are designed to make your moments special.
                </p>
                <p>
                  We are the top-rated <strong>party hall in Bhimavaram</strong> and <strong>private theatre in Eluru</strong>.
                  Our <strong>birthday party hall booking</strong> process is simple and online, making it the most
                  convenient <strong>celebration venue booking</strong> platform in AP.
                </p>
              </div>
              <div className="space-y-4">
                <p>
                  Our <strong>mini theatre for birthday celebration</strong> comes with high-end 4K projectors and
                  professional sound systems. For those seeking a <strong>private theatre for couples</strong> or a
                  <strong>couple celebration room</strong>, we provide complete privacy with custom decorations.
                </p>
                <p>
                  From <strong>engagement celebration halls</strong> to <strong>small party places for friends</strong>,
                  we cater to all group sizes. If you are on a budget, we offer <strong>low price party hall near me</strong>
                  options and <strong>affordable private theatre</strong> packages without compromising on quality.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ReviewSection showForm={false} />

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center space-y-6">
            <p className="font-display text-3xl font-bold text-gradient-gold italic">Friends & Memories</p>

            <div className="grid gap-10 md:grid-cols-2 mt-8 w-full">
              {branches.map((branch) => {
                const socials = branchSocials[branch.id] || { instagram: "", facebook: "", whatsapp: "" };
                return (
                  <div key={branch.id} className="text-center space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-primary font-body">{branch.name.split("-")[1]?.trim() || branch.name}</p>
                    <div className="flex justify-center items-center gap-4">
                      {socials.instagram && (
                        <a href={socials.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="p-3 rounded-full border border-border text-muted-foreground transition-all hover:border-primary hover:text-primary hover:glow-gold">
                          <Instagram className="h-5 w-5" />
                        </a>
                      )}
                      {socials.facebook && (
                        <a href={socials.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="p-3 rounded-full border border-border text-muted-foreground transition-all hover:border-primary hover:text-primary hover:glow-gold">
                          <Facebook className="h-5 w-5" />
                        </a>
                      )}
                      <a
                        href={`https://wa.me/91${(socials.whatsapp || branch.phone).replace(/\+/g, "").replace(/\s/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="WhatsApp"
                        className="p-3 rounded-full border border-border text-muted-foreground transition-all hover:border-[#25D366] hover:text-[#25D366] hover:glow-gold"
                      >
                        <MessageCircle className="h-5 w-5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground font-body">
              <Link to="/" className="hover:text-primary">Home</Link>
              <Link to="/about" className="hover:text-primary">About Us</Link>
              <Link to="/gallery" className="hover:text-primary">Gallery</Link>
              <Link to="/booking" className="hover:text-primary">Booking</Link>
              <Link to="/contact" className="hover:text-primary">Contact</Link>
            </div>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[10px] uppercase tracking-widest text-muted-foreground/60 font-body">
              <Link to="/terms" className="hover:text-primary">Terms & Conditions</Link>
              <Link to="/privacy" className="hover:text-primary">Privacy Policy</Link>
              <Link to="/refund-cancellation" className="hover:text-primary">Refund & Cancellation</Link>
              <Link to="/shipping-delivery" className="hover:text-primary">Shipping & Delivery</Link>
            </div>

            <p className="text-xs text-muted-foreground font-body border-t border-border/50 pt-6 w-full text-center">
              © 2024 Friends & Memories. Your go-to place for <strong>private theatre booking in Eluru</strong> and <strong>best private theatre in Bhimavaram</strong>.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Index;
