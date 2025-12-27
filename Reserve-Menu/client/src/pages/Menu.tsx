import { useCategories, useMenuItems } from "@/hooks/use-menu";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MenuCard, MenuListItem } from "@/components/MenuCard";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Menu() {
  const [activeCategory, setActiveCategory] = useState<number | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: categories } = useCategories();
  const { data: menuItems, isLoading } = useMenuItems(activeCategory);

  // If activeCategory is undefined, show all.
  // If defined, query filters automatically or we can filter client side if needed
  // (current hook handles it server side via query param)

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-primary/5 py-16 md:py-24 border-b border-border/40">
        <div className="container-custom text-center space-y-4">
          <h1 className="font-serif text-5xl md:text-6xl font-bold text-foreground">Our Menu</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Discover a symphony of flavors, carefully curated to delight your senses.
          </p>
        </div>
      </div>

      <div className="container-custom mt-12">
        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 sticky top-24 z-30 bg-background/95 backdrop-blur py-4 -mx-4 px-4 md:mx-0 md:px-0 border-b md:border-none border-border">
          {/* Categories */}
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setActiveCategory(undefined)}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all",
                activeCategory === undefined
                  ? "bg-primary text-white shadow-lg shadow-primary/25"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              All Items
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-medium transition-all",
                  activeCategory === cat.id
                    ? "bg-primary text-white shadow-lg shadow-primary/25"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {cat.name}import { useCategories, useMenuItems } from "@/hooks/use-menu";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MenuCard, MenuListItem } from "@/components/MenuCard";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Menu() {
  const [activeCategory, setActiveCategory] = useState<number | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: categories } = useCategories();
  const { data: menuItems, isLoading } = useMenuItems(activeCategory);

  // If activeCategory is undefined, show all.
  // If defined, query filters automatically or we can filter client side if needed
  // (current hook handles it server side via query param)

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-primary/5 py-16 md:py-24 border-b border-border/40">
        <div className="container-custom text-center space-y-4">
          <h1 className="font-serif text-5xl md:text-6xl font-bold text-foreground">Our Menu</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Discover a symphony of flavors, carefully curated to delight your senses.
          </p>
        </div>
      </div>

      <div className="container-custom mt-12">
        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 sticky top-24 z-30 bg-background/95 backdrop-blur py-4 -mx-4 px-4 md:mx-0 md:px-0 border-b md:border-none border-border">
          {/* Categories */}
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setActiveCategory(undefined)}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all",
                activeCategory === undefined
                  ? "bg-primary text-white shadow-lg shadow-primary/25"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              All Items
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-medium transition-all",
                  activeCategory === cat.id
                    ? "bg-primary text-white shadow-lg shadow-primary/25"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-lg border border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('grid')}
              className={cn("h-8 w-8 p-0 rounded-md", viewMode === 'grid' && "bg-white shadow-sm")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('list')}
              className={cn("h-8 w-8 p-0 rounded-md", viewMode === 'list' && "bg-white shadow-sm")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Menu Grid/List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-secondary/20 h-64 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory ?? 'all'}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={cn(
                viewMode === 'grid'
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                  : "flex flex-col gap-4 max-w-3xl mx-auto"
              )}
            >
              {menuItems?.map((item) => (
                viewMode === 'grid'
                  ? <MenuCard key={item.id} item={item} />
                  : <MenuListItem key={item.id} item={item} />
              ))}

              {menuItems?.length === 0 && (
                <div className="col-span-full text-center py-20 text-muted-foreground">
                  No items found in this category.
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-lg border border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('grid')}
              className={cn("h-8 w-8 p-0 rounded-md", viewMode === 'grid' && "bg-white shadow-sm")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('list')}
              className={cn("h-8 w-8 p-0 rounded-md", viewMode === 'list' && "bg-white shadow-sm")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Menu Grid/List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-secondary/20 h-64 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory ?? 'all'}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={cn(
                viewMode === 'grid'
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                  : "flex flex-col gap-4 max-w-3xl mx-auto"
              )}
            >
              {menuItems?.map((item) => (
                viewMode === 'grid'
                  ? <MenuCard key={item.id} item={item} />
                  : <MenuListItem key={item.id} item={item} />
              ))}

              {menuItems?.length === 0 && (
                <div className="col-span-full text-center py-20 text-muted-foreground">
                  No items found in this category.
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
