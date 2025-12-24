import { useMutation } from "@tanstack/react-query";
import { api, type InsertReservation } from "@shared/routes";

export function useCreateReservation() {
  return useMutation({
    mutationFn: async (data: InsertReservation) => {
      const validated = api.reservations.create.input.parse(data);
      const res = await fetch(api.reservations.create.path, {
        method: api.reservations.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.reservations.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create reservation");
      }
      return api.reservations.create.responses[201].parse(await res.json());
    },
  });
}
