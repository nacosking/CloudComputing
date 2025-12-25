import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import pastaImage from "@assets/generated_images/top-down_gourmet_pasta_dish.png";

interface MenuItem {
  id: number;
  name: string;
  price: string;
  description: string;
}

interface MenuData {
  breakfast: MenuItem[];
  lunch: MenuItem[];
  dinner: MenuItem[];
  [key: string]: MenuItem[];
}

export function MenuSection() {
  const [location] = useLocation();
  const [menuItems, setMenuItems] = useState<MenuData>({ breakfast: [], lunch: [], dinner: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch menu data whenever this component mounts OR when location changes
    setLoading(true);
    fetch('/api/menu')
      .then(res => res.json())
      .then(data => {
        setMenuItems(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load menu:", err);
        setLoading(false);
      });
  }, [location]); // Added location as dependency

  if (loading) return <div className="text-center py-24">Loading seasonal menu...</div>;

  return (
    <section id="menu" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4 text-foreground">Seasonal Menu</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Curated with the finest local ingredients, updated live from the cloud.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-12 items-start">

          {/* Image Feature */}
          <div className="hidden lg:block lg:col-span-5 relative">
            <div className="sticky top-32">
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-xl">
                <img
                  src={pastaImage}
                  alt="Signature Pasta"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-8">
                  <p className="text-white font-serif text-2xl italic">"Simplicity is the ultimate sophistication."</p>
                </div>
              </div>
              <div className="absolute -z-10 top-10 -left-10 w-full h-full border border-primary/20 rounded-2xl" />
            </div>
          </div>

          {/* Dynamic Menu Content */}
          <div className="lg:col-span-7">
            <Tabs defaultValue="dinner" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-12 bg-transparent border-b border-border rounded-none h-auto p-0">
                {['Breakfast', 'Lunch', 'Dinner'].map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab.toLowerCase()}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary text-lg py-4 font-serif transition-all"
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.entries(menuItems).map(([category, items]) => (
                <TabsContent key={category} value={category} className="mt-0">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-8"
                  >
                    {items.length === 0 ? (
                      <p className="text-muted-foreground italic py-4">Coming soon for {category}...</p>
                    ) : (
                      items.map((item) => (
                        <div key={item.id} className="group">
                          <div className="flex justify-between items-baseline mb-1">
                            <h3 className="font-serif text-xl font-medium text-foreground group-hover:text-primary transition-colors">
                              {item.name}
                            </h3>
                            <div className="flex-grow mx-4 border-b border-dotted border-muted-foreground/30 h-px" />
                            <span className="font-medium text-lg">{item.price}</span>
                          </div>
                          <p className="text-muted-foreground text-sm font-light italic">{item.description}</p>
                        </div>
                      ))
                    )}
                  </motion.div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </div>
    </section>
  );
}