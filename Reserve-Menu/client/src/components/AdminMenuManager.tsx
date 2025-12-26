import { useState, useEffect } from "react";
import { Trash2, Edit, Plus, Save, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface MenuItem {
    id: number;
    category: string;
    name: string;
    price: number;
    description: string;
}

// ✅ NEW: Interface for Category
interface Category {
    id: number;
    name: string;
    slug: string;
}

export function AdminMenuManager() {
    const { toast } = useToast();

    const [items, setItems] = useState<MenuItem[]>([]);
    // ✅ NEW: Store real categories from DB
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState<number | null>(null);

    const [formData, setFormData] = useState({
        category: "breakfast",
        name: "",
        price: "",
        description: ""
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // ✅ 1. Fetch BOTH Menu and Categories
            const [menuRes, catRes] = await Promise.all([
                fetch('/api/menu'),
                fetch('/api/categories')
            ]);

            if (!menuRes.ok || !catRes.ok) throw new Error("Failed to fetch data");

            const menuData = await menuRes.json();
            const catData = await catRes.json();

            // Store the real categories
            setCategories(catData);

            // Flatten the grouped data
            const allItems = [
                ...(menuData.breakfast || []).map((i: any) => ({ ...i, category: 'breakfast' })),
                ...(menuData.lunch || []).map((i: any) => ({ ...i, category: 'lunch' })),
                ...(menuData.dinner || []).map((i: any) => ({ ...i, category: 'dinner' }))
            ];

            setItems(allItems);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not load data." });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this item?")) return;

        try {
            const res = await fetch(`/api/menu-items/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setItems(items.filter(item => item.id !== id));
                toast({ title: "Success", description: "Item deleted successfully" });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to delete item" });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // ✅ 2. FIX: Find the REAL ID based on the selected slug
        const selectedCategory = categories.find(c => c.slug === formData.category);

        if (!selectedCategory) {
            toast({ variant: "destructive", title: "Error", description: "Invalid Category selected" });
            return;
        }

        const payload = {
            ...formData,
            price: parseInt(formData.price) || 0,
            categoryId: selectedCategory.id // ✅ Uses the REAL ID from database
        };

        const url = isEditing ? `/api/menu-items/${isEditing}` : '/api/menu-items';
        const method = isEditing ? 'PATCH' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast({ title: "Success", description: isEditing ? "Item Updated!" : "Item Added!" });
                setIsEditing(null);
                setFormData({ category: "breakfast", name: "", price: "", description: "" });
                fetchData();
            } else {
                throw new Error("Failed to save");
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to save item." });
        }
    };

    const startEdit = (item: MenuItem) => {
        setIsEditing(item.id);
        setFormData({
            category: item.category || "breakfast",
            name: item.name,
            price: item.price.toString(),
            description: item.description || ""
        });
    };

    const cancelEdit = () => {
        setIsEditing(null);
        setFormData({ category: "breakfast", name: "", price: "", description: "" });
    };

    if (loading) return <div className="text-center py-12"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /> Loading Admin Panel...</div>;

    return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-800">
                    {isEditing ? <Edit className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-blue-600" />}
                    {isEditing ? "Edit Dish Details" : "Add New Dish"}
                </h3>

                <div className="mt-4">
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none">Category</label>
                                <Select
                                    value={formData.category}
                                    onValueChange={(val) => setFormData({ ...formData, category: val })}
                                >
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {/* ✅ 3. FIX: Dynamic Dropdown Options */}
                                        {categories.map(cat => (
                                            <SelectItem key={cat.id} value={cat.slug}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none">Dish Name</label>
                                <Input
                                    placeholder="e.g. Truffle Risotto"
                                    className="bg-white"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none">Price (cents)</label>
                                <Input
                                    placeholder="2400"
                                    type="number"
                                    className="bg-white"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2 mb-4">
                            <label className="text-sm font-medium leading-none">Description</label>
                            <textarea
                                placeholder="Description of ingredients..."
                                className="w-full p-2 border rounded bg-white min-h-[80px] text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2">
                                <Save size={16} /> {isEditing ? "Update Item" : "Add Item"}
                            </Button>

                            {isEditing && (
                                <Button
                                    type="button"
                                    onClick={cancelEdit}
                                    variant="outline"
                                    className="flex items-center gap-2"
                                >
                                    <X size={16} /> Cancel
                                </Button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                            <th className="p-4">Category</th>
                            <th className="p-4">Name</th>
                            <th className="p-4">Price</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {items.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-4 text-center text-gray-500">No items found.</td>
                            </tr>
                        )}
                        {items.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4">
                                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium capitalize">
                                        {item.category}
                                    </span>
                                </td>
                                <td className="p-4 font-medium text-gray-900">{item.name}</td>
                                <td className="p-4 font-mono text-gray-600">
                                    ${(Number(item.price) / 100).toFixed(2)}
                                </td>
                                <td className="p-4 text-right space-x-2">
                                    <Button
                                        onClick={() => startEdit(item)}
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        onClick={() => handleDelete(item.id)}
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}