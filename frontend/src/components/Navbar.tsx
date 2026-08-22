import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Phone } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const links = [
    { href: "/", label: "Home" },
    { href: "/gallery", label: "Gallery" },
    { href: "/about", label: "About" },
    { href: "/booking", label: "Book Now", highlight: true },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="container 3xl:max-w-[1800px] 4xl:max-w-[2400px] mx-auto flex items-center justify-between px-4 py-4 3xl:py-8">
        <Link to="/" className="flex items-center gap-3 md:gap-6 shrink-0 transition-opacity hover:opacity-80">
          <img src="/logo.png" alt="F&M Logo" className="h-8 w-auto md:h-10 3xl:h-14 object-contain" />
          <span
            className="text-base md:text-xl 3xl:text-3xl font-bold tracking-widest text-primary uppercase"
            style={{ fontFamily: "var(--font-brand)" }}
          >
            <span className="hidden sm:inline">Friends&amp;Memories</span>
            <span className="sm:hidden">F&amp;M</span>
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
            <a href="tel:+917680006662" className="flex items-center gap-2 lg:gap-3 text-[10px] lg:text-xs 3xl:text-lg text-foreground hover:text-primary transition-colors whitespace-nowrap">
              <Phone className="h-2.5 w-2.5 lg:h-3 lg:w-3 3xl:h-5 3xl:w-5" />
              <span className="font-semibold opacity-70">Eluru:</span> +91 76800 06662
            </a>
            <a href="tel:+919912710932" className="flex items-center gap-2 lg:gap-3 text-[10px] lg:text-xs 3xl:text-lg text-foreground hover:text-primary transition-colors whitespace-nowrap">
              <Phone className="h-2.5 w-2.5 lg:h-3 lg:w-3 3xl:h-5 3xl:w-5" />
              <span className="font-semibold opacity-70">Bhimavaram:</span> +91 99127 10932
            </a>
          </div>
          <ThemeToggle />
        </div>

        {/* Mobile toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="text-foreground"
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="border-t border-border bg-background px-4 pb-4 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setIsOpen(false)}
              className={`block py-3 text-sm font-medium ${link.highlight ? "text-primary" : "text-foreground"
                }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="py-3 space-y-3">
            <a href="tel:+917680006662" className="flex items-center gap-4 text-sm text-foreground hover:text-primary transition-colors">
              <Phone className="h-4 w-4 text-primary" />
              <span><span className="font-semibold">Eluru:</span> +91 76800 06662</span>
            </a>
            <a href="tel:+919912710932" className="flex items-center gap-4 text-sm text-foreground hover:text-primary transition-colors">
              <Phone className="h-4 w-4 text-primary" />
              <span><span className="font-semibold">Bhimavaram:</span> +91 99127 10932</span>
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
