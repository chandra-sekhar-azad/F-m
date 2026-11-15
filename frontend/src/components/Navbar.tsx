import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Phone, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { branchDetails } from "@/data/branch-details";

const Navbar = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const eluru = branchDetails.find((branch) => branch.id === "branch-1")!;
  const bhimavaram = branchDetails.find((branch) => branch.id === "branch-2")!;

  const links = [
    { href: "/", label: "Home" },
    { href: "/gallery", label: "Gallery" },
    { href: "/about", label: "About" },
    { href: "/booking", label: "Book Now", highlight: true },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="container 3xl:max-w-[1800px] 4xl:max-w-[2400px] mx-auto flex items-center justify-between px-4 py-4 3xl:py-8">
        <Link to="/" className="flex items-center gap-3 md:gap-6 shrink-0 transition-opacity hover:opacity-80">
          <img src="/logo.png" alt="F&M Logo" className="h-8 w-auto md:h-10 3xl:h-14 object-contain" />
          <span
            className="hidden md:inline-block text-base md:text-xl 3xl:text-3xl font-bold tracking-widest text-primary uppercase"
            style={{ fontFamily: "var(--font-brand)" }}
          >
            Friends&amp;Memories
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 lg:gap-3 3xl:gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`rounded-full px-2 lg:px-5 py-2 text-xs lg:text-sm 3xl:text-xl transition-all ${link.highlight
                  ? "border border-black bg-white text-black glow-gold font-bold"
                  : `font-medium ${location.pathname === link.href
                    ? "text-primary"
                    : "text-foreground hover:text-primary"
                  }`
                }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex flex-col gap-0.5 ml-2 border-l border-border pl-4">
            <a href={`tel:${eluru.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 lg:gap-3 text-[10px] lg:text-xs 3xl:text-lg text-foreground hover:text-primary transition-colors whitespace-nowrap">
              <Phone className="h-2.5 w-2.5 lg:h-3 lg:w-3 3xl:h-5 3xl:w-5" />
              <span className="font-semibold opacity-70">Eluru:</span> {eluru.phone}
            </a>
            <a href={`tel:${bhimavaram.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 lg:gap-3 text-[10px] lg:text-xs 3xl:text-lg text-foreground hover:text-primary transition-colors whitespace-nowrap">
              <Phone className="h-2.5 w-2.5 lg:h-3 lg:w-3 3xl:h-5 3xl:w-5" />
              <span className="font-semibold opacity-70">Bhimavaram:</span> {bhimavaram.phone}
            </a>
          </div>
          <ThemeToggle />
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-1 md:hidden">
          <Link
            to="/booking"
            className="shrink-0 rounded-full px-3 py-1.5 text-[11px] border border-black bg-white text-black glow-gold font-bold whitespace-nowrap"
          >
            Book Now
          </Link>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="p-2 rounded-md hover:bg-white/10 transition-colors text-foreground"
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div id="mobile-navigation" className="md:hidden border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md">
          <div className="container mx-auto flex flex-col gap-1">
            {links.filter((link) => !link.highlight).map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  location.pathname === link.href ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
