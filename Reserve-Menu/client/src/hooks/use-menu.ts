import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

export function useCategories() {
  return useQuery({
    queryKey: [api.categories.list.path],
    queryFn: async () => {
      const res = await fetch(api.categories.list.path);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return api.categories.list.responses[200].parse(await res.json());
    },
  });
}

export function useMenuItems(categoryId?: number) {
  return useQuery({
    queryKey: [api.menuItems.list.path, categoryId],
    queryFn: async () => {
      const url = categoryId 
        ? `${api.menuItems.list.path}?categoryId=${categoryId}` 
        : api.menuItems.list.path;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch menu items");
      return api.menuItems.list.responses[200].parse(await res.json());
    },
  });
}

export function useMenuItem(id: number) {
  return useQuery({
    queryKey: [api.menuItems.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.menuItems.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch menu item");
      return api.menuItems.get.responses[200].parse(await res.json());
    },
  });
}
