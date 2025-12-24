import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function About() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-secondary/20 py-24">
        <div className="container-custom">
          <h1 className="font-serif text-5xl md:text-6xl font-bold mb-6 text-center">Our Story</h1>
          <p className="text-xl text-muted-foreground text-center max-w-3xl mx-auto leading-relaxed">
            More than just a restaurant, Savor is a celebration of community, sustainability, and the joy of eating together.
          </p>
        </div>
      </div>

      <div className="container-custom py-24 space-y-24">
        {/* Section 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="absolute top-4 -left-4 w-full h-full border-2 border-primary rounded-2xl z-0" />
            {/* Unsplash: Chef cooking with fire, dynamic kitchen shot */}
            <img 
              src="https://images.unsplash.com/photo-1577106263724-2c8e03bfe9cf?q=80&w=2070&auto=format&fit=crop"
              alt="Kitchen Action"
              className="relative z-10 rounded-2xl shadow-2xl w-full"
            />
          </div>
          <div className="space-y-6">
            <h2 className="font-serif text-4xl font-bold">Crafted with Intention</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Our culinary philosophy is rooted in respect for ingredients. We work directly with local farmers, 
              fishermen, and artisans to source the finest seasonal produce. 
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Every dish that leaves our kitchen is a testament to the skill and passion of our team, 
              designed to highlight natural flavors without unnecessary complication.
            </p>
          </div>
        </div>

        {/* Section 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6 order-2 lg:order-1">
            <h2 className="font-serif text-4xl font-bold">A Space for Connection</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              We designed Savor to be a sanctuary from the bustle of the city. Whether you're 
              celebrating a milestone, catching up with an old friend, or enjoying a quiet solo dinner, 
              our space adapts to your needs.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Warm lighting, comfortable seating, and acoustic design all contribute to an atmosphere 
              where conversation flows easily and time seems to slow down.
            </p>
          </div>
          <div className="relative order-1 lg:order-2">
            <div className="absolute -bottom-4 -right-4 w-full h-full bg-secondary rounded-2xl z-0" />
            {/* Unsplash: Restaurant atmosphere, happy people dining */}
            <img 
              src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2070&auto=format&fit=crop"
              alt="Dining Atmosphere"
              className="relative z-10 rounded-2xl shadow-2xl w-full"
            />
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-12">
          <div className="bg-card p-8 rounded-xl border border-border/50 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-xl">Visit Us</h3>
            <p className="text-muted-foreground">123 Culinary Avenue<br/>San Francisco, CA 94103</p>
          </div>

          <div className="bg-card p-8 rounded-xl border border-border/50 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-xl">Opening Hours</h3>
            <p className="text-muted-foreground">Mon-Fri: 11am - 10pm<br/>Sat-Sun: 10am - 11pm</p>
          </div>

          <div className="bg-card p-8 rounded-xl border border-border/50 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
              <Phone className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-xl">Call Us</h3>
            <p className="text-muted-foreground">(415) 555-0123<br/>Reservations & Events</p>
          </div>

          <div className="bg-card p-8 rounded-xl border border-border/50 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-xl">Email Us</h3>
            <p className="text-muted-foreground">hello@savor-sf.com<br/>careers@savor-sf.com</p>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-foreground text-background rounded-3xl p-12 text-center space-y-6">
          <h2 className="font-serif text-3xl md:text-4xl font-bold">Ready to experience Savor?</h2>
          <p className="text-white/70 max-w-xl mx-auto">
            Book your table today and let us take care of the rest. We look forward to welcoming you.
          </p>
          <Link href="/reservations">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 h-12 text-lg">
              Book a Table
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
