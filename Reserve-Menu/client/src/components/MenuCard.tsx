import type { MenuItem } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";

interface MenuCardProps {
  item: MenuItem;
}

export function MenuCard({ item }: MenuCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative bg-card rounded-xl overflow-hidden border border-border/50 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
    >
      <div className="aspect-[4/3] overflow-hidden bg-secondary/50">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
            <span className="font-serif italic text-2xl">Savor.</span>
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-serif font-bold text-xl text-foreground group-hover:text-primary transition-colors">
            {item.name}
          </h3>
          <span className="font-medium text-primary bg-primary/10 px-3 py-1 rounded-full text-sm">
            {/* ✅ FIXED: Divide by 100 to convert Cents to Dollars */}
            {formatCurrency(item.price / 100)}
          </span>
        </div>
        <p className="text-muted-foreground leading-relaxed text-sm">
          {item.description}
        </p>
      </div>
    </motion.div>
  );
}

// For list view style (alternative)
export function MenuListItem({ item }: MenuCardProps) {
  return (
    <div className="flex justify-between items-start py-4 border-b border-dashed border-border/60 last:border-0 hover:bg-accent/30 transition-colors p-4 -mx-4 rounded-lg">
      <div className="space-y-1">
        <h3 className="font-serif font-bold text-lg text-foreground flex items-center gap-3">
          {item.name}
          {!item.available && (
            <span className="text-xs uppercase tracking-wider font-sans font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded">
              Sold Out
            </span>
          )}
        </h3>
        <p className="text-muted-foreground text-sm max-w-md">
          {item.description}
        </p>
      </div>
      <div className="font-medium text-primary text-lg">
<<<<<<< HEAD
        {/* ✅ FIXED: Divide by 100 here too */}
=======
>>>>>>> master
        {formatCurrency(item.price / 100)}
      </div>
    </div>
  );
}