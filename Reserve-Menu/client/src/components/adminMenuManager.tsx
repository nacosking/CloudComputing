import { useQuery, useMutation } from "@tanstack/react-query";
import { MenuItem, Category, insertMenuItemSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, Save, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function AdminMenuManager() {
    const { toast } = useToast();
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

    const { data: items, isLoading: itemsLoading } = useQuery<MenuItem[]>({
        queryKey: ["/api/menu-items"],
    });

    const { data: categories } = useQuery<Category[]>({
        queryKey: ["/api/categories"],
    });

    const createMutation = useMutation({
        mutationFn: async (values: any) => {
            const res = await apiRequest("POST", "/api/menu-items", values);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
            toast({ title: "Success", description: "Item added!" });
            form.reset();
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, values }: { id: number; values: any }) => {
            const res = await apiRequest("PATCH", `/api/menu-items/${id}`, values);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
            toast({ title: "Success", description: "Item updated!" });
            setEditingItem(null);
            form.reset();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/menu-items/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
            toast({ title: "Success", description: "Item deleted!" });
        },
    });

    const form = useForm({
        resolver: zodResolver(insertMenuItemSchema),
        defaultValues: {
            name: "",
            description: "",
            price: 0,
            categoryId: 1,
            imageUrl: "",
            available: true,
        },
    });

    const startEdit = (item: MenuItem) => {
        setEditingItem(item);
        form.reset({
            name: item.name,
            description: item.description || "",
            price: item.price,
            categoryId: item.categoryId,
            imageUrl: item.imageUrl || "",
            available: item.available || true,
        });
    };

    const cancelEdit = () => {
        setEditingItem(null);
        form.reset();
    };

    if (itemsLoading) return <div className="text-center py-12"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /> Loading Admin Panel...</div>;

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto my-10">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Menu Management</h2>

            {/* --- INPUT FORM --- */}
            <div className="mb-8 p-4 bg-gray-50 rounded border border-gray-200">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                    {editingItem ? <Edit size={18} /> : <Plus size={18} />}
                    {editingItem ? "Edit Item" : "Add New Item"}
                </h3>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit((v) => editingItem ? updateMutation.mutate({ id: editingItem.id, values: v }) : createMutation.mutate(v))}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <FormField control={form.control} name="categoryId" render={({ field }) => (
                                <FormItem>
                                    <Select onValueChange={v => field.onChange(parseInt(v))} value={field.value.toString()}>
                                        <FormControl>
                                            <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input placeholder="Dish Name" {...field} className="bg-white" required />
                                    </FormControl>
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="price" render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input 
                                            placeholder="Price (in cents)" 
                                            type="number" 
                                            {...field} 
                                            onChange={e => field.onChange(parseInt(e.target.value))}
                                            className="bg-white" 
                                            required 
                                        />
                                    </FormControl>
                                </FormItem>
                            )} />
                        </div>

                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <textarea
                                        placeholder="Description"
                                        className="w-full p-2 border rounded mb-4 bg-white min-h-[100px]"
                                        {...field}
                                        value={field.value || ""}
                                    />
                                </FormControl>
                            </FormItem>
                        )} />

                        <div className="flex gap-2">
                            <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2" disabled={createMutation.isPending || updateMutation.isPending}>
                                <Save size={16} /> {editingItem ? "Update Item" : "Add Item"}
                            </Button>

                            {editingItem && (
                                <Button
                                    type="button"
                                    onClick={cancelEdit}
                                    className="bg-gray-500 text-white hover:bg-gray-600 flex items-center gap-2"
                                >
                                    <X size={16} /> Cancel
                                </Button>
                            )}
                        </div>
                    </form>
                </Form>
            </div>

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
                        {items?.map(item => (
                            <tr key={item.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 capitalize text-gray-600">
                                    {categories?.find(c => c.id === item.categoryId)?.name}
                                </td>
                                <td className="p-3 font-medium">{item.name}</td>
                                <td className="p-3">${(item.price / 100).toFixed(2)}</td>
                                <td className="p-3 text-right space-x-2">
                                    <button
                                        onClick={() => startEdit(item)}
                                        className="text-blue-600 hover:text-blue-800 p-1 rounded border border-blue-200 hover:bg-blue-50"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        onClick={() => { if (confirm("Delete this item?")) deleteMutation.mutate(item.id); }}
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
