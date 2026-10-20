import { z } from "zod";
import { optionalText, requiredText } from "@/lib/validation";

export const updateClassSchema = z.object({
  id: z.uuid(),
  name: requiredText(40),
  room: optionalText(40),
  capacity: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? Number(value) : null))
    .pipe(
      z
        .number({ error: "classes.errors.capacity" })
        .int({ error: "classes.errors.capacity" })
        .min(1, { error: "classes.errors.capacity" })
        .max(200, { error: "classes.errors.capacity" })
        .nullable(),
    ),
  homeroomStaffId: z
    .string()
    .optional()
    .transform((value) => value || null)
    .pipe(z.uuid().nullable()),
});
export type UpdateClassInput = z.input<typeof updateClassSchema>;
