import { useQuery, useMutation } from "@tanstack/react-query";
import { MenuItem, Category, insertMenuItemSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, Save, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function AdminMenuManager() {
    const { toast } = useToast();
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

    // 1. Fetch Data
    const { data: items, isLoading: itemsLoading } = useQuery<MenuItem[]>({
        queryKey: ["/api/menu-items"],
    });

    const { data: categories } = useQuery<Category[]>({
        queryKey: ["/api/categories"],
    });

    // 2. Setup Mutations (Create, Update, Delete)
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

    // 3. Form Setup
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

    // 4. Helper Functions
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
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-800">
                    {editingItem ? <Edit className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-blue-600" />}
                    {editingItem ? "Edit Dish Details" : "Add New Dish"}
                </h3>
                
                <div className="mt-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit((v) => editingItem ? updateMutation.mutate({ id: editingItem.id, values: v }) : createMutation.mutate(v))}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <FormField control={form.control} name="categoryId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
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
                                        <FormLabel>Dish Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Truffle Risotto" {...field} className="bg-white" required />
                                        </FormControl>
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="price" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Price (cents)</FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="2400" 
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
                                <FormItem className="mb-4">
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <textarea
                                            placeholder="Description of ingredients..."
                                            className="w-full p-2 border rounded bg-white min-h-[80px] text-sm"
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
                                        variant="outline"
                                        className="flex items-center gap-2"
                                    >
                                        <X size={16} /> Cancel
                                    </Button>
                                )}
                            </div>
                        </form>
                    </Form>
                </div>
            </div>

            {/* Table List */}
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
                        {items?.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4">
                                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                                        {categories?.find(c => c.id === item.categoryId)?.name}
                                    </span>
                                </td>
                                <td className="p-4 font-medium text-gray-900">{item.name}</td>
                                <td className="p-4 font-mono text-gray-600">${(item.price / 100).toFixed(2)}</td>
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
                                        onClick={() => { if (confirm("Delete this item?")) deleteMutation.mutate(item.id); }}
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