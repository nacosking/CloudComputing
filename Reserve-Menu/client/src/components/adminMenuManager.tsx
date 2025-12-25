import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Trash2, Edit, Plus, Save, X } from "lucide-react";

interface MenuItem {
    id: number;
    category: string;
    name: string;
    price: string;
    description: string;
}

export function AdminMenuManager() {
    const [location] = useLocation();
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [isEditing, setIsEditing] = useState<number | null>(null);
    const [formData, setFormData] = useState({ category: "dinner", name: "", price: "", description: "" });

    // 1. Fetch All Items on Load
    useEffect(() => {
        fetchMenu();
    }, [location]); // Added location as dependency

    const fetchMenu = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/menu');
            const data = await res.json();
            // Flatten the categories back into a single list for the table
            const allItems = [...data.breakfast, ...data.lunch, ...data.dinner];
            setItems(allItems);
        } catch (err) {
            console.error("Failed to load menu:", err);
        } finally {
            setLoading(false);
        }
    };

    // 2. Handle DELETE
    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this item?")) return;

        await fetch(`/api/menu/${id}`, { method: 'DELETE' });
        setItems(items.filter(item => item.id !== id));
    };

    // 3. Handle ADD / UPDATE Submit
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
            alert(isEditing ? "Item Updated!" : "Item Added!");
            setIsEditing(null);
            setFormData({ category: "dinner", name: "", price: "", description: "" });
            fetchMenu();
        }
    };

    // 4. Fill Form for Editing
    const startEdit = (item: MenuItem) => {
        setIsEditing(item.id);
        setFormData({
            category: item.category,
            name: item.name,
            price: item.price,
            description: item.description
        });
    };

    if (loading) return <div className="text-center py-12">Loading Admin Panel...</div>;

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto my-10">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Menu Management</h2>

            {/* --- INPUT FORM --- */}
            <form onSubmit={handleSubmit} className="mb-8 p-4 bg-gray-50 rounded border border-gray-200">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                    {isEditing ? <Edit size={18} /> : <Plus size={18} />}
                    {isEditing ? "Edit Item" : "Add New Item"}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <select
                        className="p-2 border rounded"
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                        <option value="breakfast">Breakfast</option>
                        <option value="lunch">Lunch</option>
                        <option value="dinner">Dinner</option>
                    </select>

                    <input
                        placeholder="Dish Name"
                        className="p-2 border rounded"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                    />

                    <input
                        placeholder="Price (e.g. 24)"
                        className="p-2 border rounded"
                        value={formData.price}
                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                        required
                    />
                </div>

                <textarea
                    placeholder="Description"
                    className="w-full p-2 border rounded mb-4"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                />

                <div className="flex gap-2">
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2">
                        <Save size={16} /> {isEditing ? "Update Item" : "Add Item"}
                    </button>

                    {isEditing && (
                        <button
                            type="button"
                            onClick={() => { setIsEditing(null); setFormData({ category: "dinner", name: "", price: "", description: "" }); }}
                            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex items-center gap-2"
                        >
                            <X size={16} /> Cancel
                        </button>
                    )}
                </div>
            </form>

            {/* --- MENU LIST TABLE --- */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b">
                            <th className="p-3">Category</th>
                            <th className="p-3">Name</th>
                            <th className="p-3">Price</th>
                            <th className="p-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(item => (
                            <tr key={item.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 capitalize text-gray-600">{item.category}</td>
                                <td className="p-3 font-medium">{item.name}</td>
                                <td className="p-3">${item.price}</td>
                                <td className="p-3 text-right space-x-2">
                                    <button
                                        onClick={() => startEdit(item)}
                                        className="text-blue-600 hover:text-blue-800 p-1 rounded border border-blue-200 hover:bg-blue-50"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="text-red-600 hover:text-red-800 p-1 rounded border border-red-200 hover:bg-red-50"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}