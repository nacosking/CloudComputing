import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import heroImage from "@assets/generated_images/elegant_modern_bistro_interior_with_warm_lighting.png";

export function Hero() {
  return (
    <section className="relative h-screen w-full overflow-hidden flex items-center justify-center">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Lumière Interior" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/20" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center text-white">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <span className="inline-block py-1 px-3 rounded-full border border-white/30 bg-white/10 backdrop-blur-md text-xs font-medium uppercase tracking-widest mb-6">
            Established 2024
          </span>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
            Taste the <br />
            <span className="italic text-primary-foreground">Extraordinary</span>
          </h1>
          <p className="text-lg md:text-xl max-w-xl mx-auto mb-10 text-white/90 font-light leading-relaxed">
            A culinary journey where modern innovation meets timeless tradition. 
            Every dish tells a story of flavor, passion, and craft.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="rounded-full px-8 text-lg h-14 bg-primary hover:bg-primary/90 text-primary-foreground border-none">
              <a href="#book">Reserve a Table</a>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-8 text-lg h-14 border-white text-white hover:bg-white hover:text-black bg-transparent">
              <a href="#menu">View Menu</a>
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div 
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/70"
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <span className="text-sm uppercase tracking-widest text-[10px]">Scroll</span>
      </motion.div>
    </section>
  );
}
