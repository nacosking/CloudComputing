import { AdminMenuManage } from "@/components/AdminMenuManager";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { LayoutDashboard, LogOut, Globe, Shield } from "lucide-react";

export default function AdminPage() {
    const [, navigate] = useLocation();
    const { logout, user } = useAuth();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
            {/* Elegant Header */}
            <header className="bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                            <Shield className="w-6 h-6" />
                        </div>
                        <h1 className="font-serif text-2xl font-bold tracking-tight">
                            Lumière<span className="text-primary">.</span> <span className="text-muted-foreground font-light text-xl ml-2">Admin</span>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex flex-col items-end mr-4">
                        <span className="text-sm font-bold">{user?.name}</span>
                        <span className="text-[10px] uppercase tracking-widest text-primary font-bold">Administrator</span>
                    </div>
                    <Button 
                        onClick={() => navigate("/")}
                        variant="outline" 
                        size="sm"
                        className="rounded-full gap-2 hidden sm:flex"
                    >
                        <Globe className="w-4 h-4" /> Live Site
                    </Button>
                    <Button 
                        onClick={handleLogout}
                        variant="ghost" 
                        size="sm" 
                        className="rounded-full text-destructive hover:bg-destructive/10 gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            {/* Content Area */}
            <main className="container mx-auto py-12 px-4 max-w-7xl">
                <div className="mb-12 text-center md:text-left">
                    <h2 className="text-5xl font-bold font-serif text-neutral-900 dark:text-neutral-100 mb-3 tracking-tight">
                        Culinary <span className="text-primary italic">Command</span>
                    </h2>
                    <p className="text-neutral-500 dark:text-neutral-400 text-lg max-w-2xl font-light">
                        Curate your seasonal offerings and perfect the presentation of every dish at Lumière Bistro.
                    </p>
                </div>

                <AdminMenuManage />
            </main>
        </div>
    );
}
