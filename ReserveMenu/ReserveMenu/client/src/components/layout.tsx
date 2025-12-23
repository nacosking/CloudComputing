import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent",
          isScrolled 
            ? "bg-background/95 backdrop-blur-sm py-4 border-border shadow-sm text-foreground" 
            : "bg-gradient-to-b from-black/60 to-transparent py-6 text-white"
        )}
      >
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link href="/">
            <a className={cn(
              "font-serif text-2xl md:text-3xl font-bold tracking-tight",
              isScrolled ? "text-foreground" : "text-white"
            )}>
              Lumière<span className="text-primary">.</span>
            </a>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {["Menu", "About", "Location"].map((item) => (
              <a 
                key={item}
                href={`#${item.toLowerCase()}`} 
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  isScrolled ? "text-foreground/80" : "text-white/90"
                )}
              >
                {item}
              </a>
            ))}
            <Button asChild variant="default" className="rounded-full px-6">
              <a href="#book">Book a Table</a>
            </Button>
          </nav>

          {/* Mobile Menu Toggle */}
          <button 
            className={cn("md:hidden p-2", isScrolled ? "text-foreground" : "text-white")}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border p-4 flex flex-col gap-4 shadow-lg animate-in slide-in-from-top-5">
            <a href="#menu" className="text-lg font-medium p-2 hover:bg-muted rounded-md" onClick={() => setMobileMenuOpen(false)}>Menu</a>
            <a href="#about" className="text-lg font-medium p-2 hover:bg-muted rounded-md" onClick={() => setMobileMenuOpen(false)}>About</a>
            <a href="#location" className="text-lg font-medium p-2 hover:bg-muted rounded-md" onClick={() => setMobileMenuOpen(false)}>Location</a>
            <Button asChild className="w-full rounded-full">
              <a href="#book" onClick={() => setMobileMenuOpen(false)}>Book a Table</a>
            </Button>
          </div>
        )}
      </header>

      <main className="flex-grow">
        {children}
      </main>

      <footer className="bg-foreground text-background py-16">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h3 className="font-serif text-2xl font-bold mb-4">Lumière<span className="text-primary">.</span></h3>
            <p className="text-muted-foreground max-w-xs">
              Experience the essence of modern dining. Fresh ingredients, timeless recipes, and an atmosphere that lingers.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4 uppercase tracking-wider text-sm text-primary">Hours</h4>
            <div className="space-y-2 text-muted-foreground">
              <p>Mon - Thu: 11am - 10pm</p>
              <p>Fri - Sat: 11am - 11pm</p>
              <p>Sun: 10am - 9pm</p>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-4 uppercase tracking-wider text-sm text-primary">Contact</h4>
            <div className="space-y-2 text-muted-foreground">
              <p>123 Culinary Ave, Flavor Town</p>
              <p>+1 (555) 123-4567</p>
              <p>reservations@lumiere.com</p>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-white/10 text-center text-sm text-muted-foreground">
          © 2024 Lumière Bistro. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
