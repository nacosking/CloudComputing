import { Layout } from "@/components/layout";
import { Hero } from "@/components/hero";
import { MenuSection } from "@/components/menu-section";
import { BookingForm } from "@/components/booking-form";
import { motion } from "framer-motion";
import { Wine, Users, Clock, MapPin } from "lucide-react";

export default function Home() {
  return (
    <Layout>
      <Hero />
      
      <MenuSection />

      <section id="book" className="py-32 relative overflow-hidden">
        {/* Enhanced Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-accent/10" />
        
        {/* Decorative Elements */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-12 gap-16 items-stretch">
            {/* Left Side - Content */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="md:col-span-5 flex flex-col justify-center"
            >
              <div className="mb-8">
                <span className="inline-block py-1 px-3 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium uppercase tracking-widest mb-6">
                  Experience Luxury Dining
                </span>
                <h2 className="font-serif text-5xl md:text-6xl font-bold mb-6 text-foreground leading-tight">
                  A Table <br />
                  <span className="italic text-primary">Awaits You</span>
                </h2>
              </div>

              <p className="text-foreground/80 text-lg mb-10 leading-relaxed font-light">
                Whether it's a romantic dinner for two, a family celebration, or a business lunch, 
                we provide the perfect setting for memorable moments. 
              </p>

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-6 mb-10">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-4"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary flex-shrink-0 mt-1">
                    <Wine className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">Curated Wines</h4>
                    <p className="text-sm text-foreground/60">Finest selection</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-4"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary flex-shrink-0 mt-1">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">Private Events</h4>
                    <p className="text-sm text-foreground/60">Tailored experience</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-4"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary flex-shrink-0 mt-1">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">Flexible Hours</h4>
                    <p className="text-sm text-foreground/60">11am - 11pm daily</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-4"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary flex-shrink-0 mt-1">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">Prime Location</h4>
                    <p className="text-sm text-foreground/60">Downtown district</p>
                  </div>
                </motion.div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3 pt-6 border-t border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">+1 (555) 123-4567</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">reservations@lumiere.com</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Side - Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="md:col-span-7"
            >
              <BookingForm />
            </motion.div>
          </div>
        </div>
      </section>

      <section id="about" className="py-24 bg-foreground text-background text-center">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="mb-8 text-primary">
             <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-6 text-white">"Food is symbolic of love when words are inadequate."</h2>
          <p className="text-white/60 font-light italic text-lg">— Alan D. Wolfelt</p>
        </div>
      </section>
    </Layout>
  );
}
