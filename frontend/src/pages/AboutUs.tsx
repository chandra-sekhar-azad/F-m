import { Sparkles, MapPin, Phone, Mail, Instagram, MessageCircle } from "lucide-react";
import heroImg from "@/assets/hero-theatre.jpg";
import { branchDetails } from "@/data/branch-details";

const AboutUs = () => {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-4xl font-body">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-primary font-body">Our Story</p>
        <h1 className="mb-12 text-center font-display text-4xl font-bold text-foreground md:text-5xl">
          About <span className="text-gradient-gold">Us</span>
        </h1>

        <div className="rounded-2xl border border-border bg-card p-8 md:p-12 space-y-8 animate-fade-in">
          <div className="relative h-64 overflow-hidden rounded-xl">
            <img src={heroImg} alt="Friends & Memories Experience" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
          </div>

          <div className="prose prose-invert max-w-none">
            <h2 className="text-2xl font-bold text-foreground font-display">Welcome to Friends & Memories</h2>
            <p className="text-muted-foreground leading-relaxed">
              At <strong>Friends & Memories</strong>, we believe every celebration deserves a touch of magic.
              Starting with a vision to revolutionize personal entertainment and celebrations, we established
              premium private theatres and party halls that offer an unparalleled experience for you and
              your loved ones.
            </p>

            <h3 className="text-xl font-bold text-foreground font-display mt-8 mb-4">Our Services</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl border border-border bg-muted/50">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="text-primary w-5 h-5" />
                  <h4 className="font-bold text-foreground">Private Theatre</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Experience movies and personal videos on the big screen with Dolby Atmos sound and 4K projection.
                  We offer the best <strong>private theatre for couples in Eluru</strong> and family-friendly theatre for surprise parties.
                </p>
              </div>
              <div className="p-6 rounded-xl border border-border bg-muted/50">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="text-primary w-5 h-5" />
                  <h4 className="font-bold text-foreground">Party Hall</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Elegant spaces designed for birthdays, anniversaries, and special gatherings. We are the most
                  trusted <strong>birthday party hall in Bhimavaram</strong> with custom setup and balloon decorations.
                </p>
              </div>
            </div>

            <h3 className="text-xl font-bold text-foreground font-display mt-8 mb-4">Legacy & Growth</h3>
            <p className="text-muted-foreground leading-relaxed">
              A premium brand powered by <strong>Varahi Mobiles</strong>, we have expanded our footprint
              to major locations including <strong>Eluru</strong> and <strong>Bhimavaram</strong>.
              Our commitment remains the same: Providing a safe, high-quality, and memorable environment
              for all our customers.
            </p>

            <div className="mt-12 pt-8 border-t border-border">
              <h4 className="text-lg font-bold text-foreground font-display mb-4">Our Core Values</h4>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li><strong>Customer Delight:</strong> We go the extra mile to ensure your surprise or celebration is perfect.</li>
                <li><strong>Quality First:</strong> From sound systems to decoration material, we use only the best.</li>
                <li><strong>Safe Environment:</strong> Privacy and security are our top priorities for every guest.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-4">
            <MapPin className="text-primary h-6 w-6 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-body font-bold">LOCATIONS</p>
              <p className="text-sm text-foreground">Eluru & Bhimavaram</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-4">
            <Phone className="text-primary h-6 w-6 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-body font-bold">RESERVATIONS</p>
              <p className="text-sm text-foreground">+91 99127 10932</p>
            </div>
          </div>
        </div>

        <section id="contact" className="mt-16 scroll-mt-28 border-t border-border pt-16">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-primary">Get in Touch</p>
          <h2 className="mb-4 text-center font-display text-3xl font-bold text-foreground md:text-4xl">
            Contact <span className="text-gradient-gold">Us</span>
          </h2>
          <p className="mb-10 text-center text-sm text-muted-foreground">Find contact and social details for each branch.</p>

          <div className="grid gap-8 md:grid-cols-2">
              {branchDetails.map((branch) => (
                <div key={branch.id} className="rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:glow-gold">
                  <h3 className="mb-6 font-display text-2xl font-bold text-gradient-gold">{branch.name}</h3>
                  <div className="space-y-5 text-sm text-muted-foreground">
                    <a href={branch.mapLink} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 transition-colors hover:text-primary"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span>{branch.address}</span></a>
                    <a href={`tel:${branch.phone.replace(/\s/g, "")}`} className="flex items-center gap-3 transition-colors hover:text-primary"><Phone className="h-5 w-5 text-primary" /><span>{branch.phone}</span></a>
                    <a href={`mailto:${branch.email}`} className="flex items-center gap-3 transition-colors hover:text-primary"><Mail className="h-5 w-5 text-primary" /><span>{branch.email}</span></a>
                    <div className="flex gap-4 border-t border-border/50 pt-5">
                      {branch.instagram && <a href={branch.instagram} target="_blank" rel="noopener noreferrer" aria-label={`${branch.name} on Instagram`} className="rounded-full border border-border p-3 transition-all hover:border-primary hover:text-primary"><Instagram className="h-5 w-5" /></a>}
                      <a href={`https://wa.me/${branch.whatsapp.replace(/\+/g, "").replace(/\s/g, "")}`} target="_blank" rel="noopener noreferrer" aria-label={`Message ${branch.name} on WhatsApp`} className="rounded-full border border-border p-3 transition-all hover:border-[#25D366] hover:text-[#25D366]"><MessageCircle className="h-5 w-5" /></a>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;
