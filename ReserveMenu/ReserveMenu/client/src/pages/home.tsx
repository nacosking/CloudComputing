import { Layout } from "@/components/layout";
import { Hero } from "@/components/hero";
import { MenuSection } from "@/components/menu-section";
import { BookingForm } from "@/components/booking-form";

export default function Home() {
  return (
    <Layout>
      <Hero />
      
      <MenuSection />

      <section id="book" className="py-24 relative overflow-hidden">
        {/* Background Pattern/Color */}
        <div className="absolute inset-0 bg-primary/5" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-5">
              <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6 text-foreground">
                A Table Awaits
              </h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                Whether it's a romantic dinner for two, a family celebration, or a business lunch, 
                we provide the perfect setting for memorable moments. 
                <br /><br />
                For parties larger than 8, please contact us directly to arrange a private dining experience.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Phone</p>
                    <p className="text-muted-foreground">+1 (555) 123-4567</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Email</p>
                    <p className="text-muted-foreground">reservations@lumiere.com</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-7">
              <BookingForm />
            </div>
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
