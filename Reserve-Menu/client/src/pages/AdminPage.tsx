import { AdminMenuManager } from "@/components/AdminMenuManager";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Admin Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <h1 className="font-serif text-2xl font-bold text-gray-900">
                        Lumière<span className="text-primary">.</span> Admin
                    </h1>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Dashboard</span>
                </div>

                <div className="flex gap-4">
                    <Link href="/">
                        <Button variant="outline" size="sm">View Site</Button>
                    </Link>
                    <Link href="/auth">
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            Log Out
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Main Content: The Menu Manager */}
            <main className="container mx-auto py-12 px-4">
                <div className="max-w-5xl mx-auto">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">Menu Management</h2>
                        <p className="text-gray-500 mt-2">Add, edit, or remove items from the seasonal menu.</p>
                    </div>

                    {/* This is the component we created earlier */}
                    <AdminMenuManager />
                </div>
            </main>
        </div>
    );
}