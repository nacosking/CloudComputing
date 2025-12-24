import { Facebook, Instagram, Twitter, MapPin, Phone, Clock } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-secondary/30 pt-16 pb-8 border-t border-border/40">
      <div className="container-custom grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <div className="space-y-4">
          <h3 className="text-2xl font-serif font-bold">Savor<span className="text-primary">.</span></h3>
          <p className="text-muted-foreground leading-relaxed">
            Experience the art of culinary excellence. Authentic flavors, locally sourced ingredients, and warm hospitality.
          </p>
          <div className="flex gap-4 pt-2">
            <a href="#" className="p-2 bg-background rounded-full hover:bg-primary hover:text-white transition-colors">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="#" className="p-2 bg-background rounded-full hover:bg-primary hover:text-white transition-colors">
              <Facebook className="w-5 h-5" />
            </a>
            <a href="#" className="p-2 bg-background rounded-full hover:bg-primary hover:text-white transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-serif font-bold text-lg mb-6">Contact</h4>
          <ul className="space-y-4 text-muted-foreground">
            <li className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <span>123 Culinary Avenue,<br />San Francisco, CA 94103</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-primary shrink-0" />
              <span>(415) 555-0123</span>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif font-bold text-lg mb-6">Hours</h4>
          <ul className="space-y-4 text-muted-foreground">
            <li className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p><span className="font-medium text-foreground">Mon-Fri:</span> 11am - 10pm</p>
                <p><span className="font-medium text-foreground">Sat-Sun:</span> 10am - 11pm</p>
                <p className="text-sm text-primary font-medium pt-1">Happy Hour: 4pm - 6pm</p>
              </div>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif font-bold text-lg mb-6">Newsletter</h4>
          <p className="text-muted-foreground mb-4">Subscribe for seasonal updates and exclusive events.</p>
          <div className="flex gap-2">
            <input 
              type="email" 
              placeholder="Your email" 
              className="bg-background border border-input px-4 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium">
              Join
            </button>
          </div>
        </div>
      </div>
      
      <div className="container-custom pt-8 border-t border-border/40 text-center text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} Savor Restaurant Group. All rights reserved.</p>
      </div>
    </footer>
  );
}
