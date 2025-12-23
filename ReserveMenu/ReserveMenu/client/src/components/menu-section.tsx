import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import pastaImage from "@assets/generated_images/top-down_gourmet_pasta_dish.png";

const MENU_ITEMS = {
  breakfast: [
    { name: "Truffle Scramble", price: "18", desc: "Soft scrambled farm eggs, black truffle shavings, sourdough toast" },
    { name: "Avocado Tartine", price: "16", desc: "Poached egg, chili flakes, radish, lemon zest, seeded bread" },
    { name: "Ricotta Hotcakes", price: "19", desc: "Honeycomb butter, banana, maple syrup, fresh berries" },
    { name: "Smoked Salmon Bagel", price: "21", desc: "House-cured salmon, caper cream cheese, pickled onions, dill" },
  ],
  lunch: [
    { name: "Bistro Burger", price: "24", desc: "Wagyu beef, gruyère, caramelized onions, truffle aioli, brioche" },
    { name: "Niçoise Salad", price: "22", desc: "Seared tuna, green beans, olives, potato, soft egg, mustard vinaigrette" },
    { name: "Steak Frites", price: "32", desc: "Hanger steak, herb butter, shoestring fries, watercress" },
    { name: "Mushroom Risotto", price: "26", desc: "Wild mushrooms, parmesan crisp, truffle oil, arborio rice" },
  ],
  dinner: [
    { name: "Duck Confit", price: "36", desc: "Crispy skin duck leg, braised lentils, orange glaze, fennel salad" },
    { name: "Pan Seared Scallops", price: "38", desc: "Cauliflower purée, brown butter, capers, raisins, toasted almonds" },
    { name: "Rack of Lamb", price: "42", desc: "Herb crusted, fondant potato, seasonal vegetables, rosemary jus" },
    { name: "Handmade Gnocchi", price: "28", desc: "Brown butter sage sauce, roasted pumpkin, pine nuts, pecorino" },
    { name: "Market Fish", price: "MP", desc: "Daily catch, seasonal preparation, ask your server" },
  ]
};

export function MenuSection() {
  return (
    <section id="menu" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4 text-foreground">Seasonal Menu</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Curated with the finest local ingredients, our menu changes with the seasons to ensure peak freshness and flavor.
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
              
              {/* Decorative Element */}
              <div className="absolute -z-10 top-10 -left-10 w-full h-full border border-primary/20 rounded-2xl" />
            </div>
          </div>

          {/* Menu Content */}
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

              {Object.entries(MENU_ITEMS).map(([category, items]) => (
                <TabsContent key={category} value={category} className="mt-0">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-8"
                  >
                    {items.map((item, idx) => (
                      <div key={idx} className="group">
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="font-serif text-xl font-medium text-foreground group-hover:text-primary transition-colors">
                            {item.name}
                          </h3>
                          <div className="flex-grow mx-4 border-b border-dotted border-muted-foreground/30 h-px" />
                          <span className="font-medium text-lg">{item.price}</span>
                        </div>
                        <p className="text-muted-foreground text-sm font-light italic">{item.desc}</p>
                      </div>
                    ))}
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
