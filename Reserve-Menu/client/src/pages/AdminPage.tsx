import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, ArrowLeft, Save, X } from "lucide-react";

interface MenuItem {
    id: number;
    category: string;
    name: string;
    price: string;
    description: string;
}

export default function AdminPage() {
    const [, navigate] = useLocation();
    const [location] = useLocation();
    const { logout } = useAuth();
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [isEditing, setIsEditing] = useState<number | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState({ 
        category: "dinner", 
        name: "", 
        price: "", 
        description: "" 
    });

    // Fetch All Items on Load
    useEffect(() => {
        fetchMenu();
    }, [location]);

    const fetchMenu = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/menu');
            const data = await res.json();
            const allItems = [...data.breakfast, ...data.lunch, ...data.dinner];
            setItems(allItems);
        } catch (err) {
            console.error("Failed to load menu:", err);
        } finally {
            setLoading(false);
        }
    };

    // Handle DELETE
    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this item?")) return;

        await fetch(`/api/menu/${id}`, { method: 'DELETE' });
        setItems(items.filter(item => item.id !== id));
    };

    // Handle ADD / UPDATE Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const url = isEditing ? `/api/menu/${isEditing}` : '/api/menu';
        const method = isEditing ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (res.ok) {
            setIsEditing(null);
            setFormData({ category: "dinner", name: "", price: "", description: "" });
            setIsDialogOpen(false);
            fetchMenu();
        }
    };

    // Fill Form for Editing
    const startEdit = (item: MenuItem) => {
        setIsEditing(item.id);
        setFormData({
            category: item.category,
            name: item.name,
            price: item.price,
            description: item.description
        });
        setIsDialogOpen(true);
    };

    const handleBackToHome = () => {
        window.scrollTo(0, 0);
        navigate("/");
    };

    const handleLogout = () => {
        logout();
        window.scrollTo(0, 0);
        navigate("/");
    };

    const handleDialogClose = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) {
            setIsEditing(null);
            setFormData({ category: "dinner", name: "", price: "", description: "" });
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-foreground text-background py-6 border-b border-border">
                <div className="container mx-auto px-4 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={handleBackToHome}
                            className="font-serif text-2xl font-bold block hover:opacity-80 transition-opacity"
                        >
                            Lumière<span className="text-primary">.</span>
                        </button>
                        <div className="h-8 w-[1px] bg-background/20 hidden md:block" />
                        <p className="text-foreground/60 font-medium hidden md:block uppercase tracking-wider text-sm">
                            Admin Dashboard
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <Button
                            onClick={handleBackToHome}
                            variant="outline"
                            className="border-background/30 text-background hover:bg-background hover:text-foreground"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Home
                        </Button>
                        <Button
                            onClick={handleLogout}
                            variant="ghost"
                            className="text-background hover:bg-background/20"
                        >
                            Log Out
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="container mx-auto p-6 md:p-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-bold font-serif mb-2 text-foreground">
                            Menu Management
                        </h1>
                        <p className="text-muted-foreground">
                            Add, edit or remove items from your seasonal menu.
                        </p>
                    </div>

                    {/* Add Menu Item Dialog */}
                    <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
                        <DialogTrigger asChild>
                            <Button className="shadow-lg shadow-primary/20 h-11 px-6">
                                <Plus className="mr-2 h-4 w-4" /> Add Menu Item
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle className="font-serif text-2xl">
                                    {isEditing ? "Edit Menu Item" : "Add New Menu Item"}
                                </DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Category</label>
                                    <select
                                        className="w-full p-2 border rounded-lg bg-background h-11"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="breakfast">Breakfast</option>
                                        <option value="lunch">Lunch</option>
                                        <option value="dinner">Dinner</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Dish Name</label>
                                    <Input
                                        placeholder="e.g. Grilled Salmon"
                                        className="h-11"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Price</label>
                                    <Input
                                        placeholder="e.g. 24"
                                        className="h-11"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <textarea
                                        placeholder="Brief description of the dish"
                                        className="w-full p-2 border rounded-lg bg-background min-h-[80px]"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button type="submit" className="flex-1 h-11">
                                        <Save className="w-4 h-4 mr-2" />
                                        {isEditing ? "Update Item" : "Add Item"}
                                    </Button>
                                    {isEditing && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => handleDialogClose(false)}
                                            className="h-11"
                                        >
                                            <X className="w-4 h-4 mr-2" />
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Menu Table */}
                <Card className="border-border/50 shadow-xl overflow-hidden">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-bold py-4 pl-6">Category</TableHead>
                                    <TableHead className="font-bold py-4">Name</TableHead>
                                    <TableHead className="font-bold py-4">Price</TableHead>
                                    <TableHead className="text-right font-bold py-4 pr-6">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                            No menu items yet. Click "Add Menu Item" to get started.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map(item => (
                                        <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="py-4 pl-6">
                                                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                                    {item.category}
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-medium py-4">{item.name}</TableCell>
                                            <TableCell className="py-4 font-serif font-bold text-lg">
                                                ${item.price}
                                            </TableCell>
                                            <TableCell className="text-right py-4 pr-6">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="hover:bg-primary/10 hover:text-primary transition-colors"
                                                        onClick={() => startEdit(item)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="hover:bg-destructive/10 hover:text-destructive transition-colors"
                                                        onClick={() => handleDelete(item.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}