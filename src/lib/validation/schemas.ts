import { z } from "zod";

export const fieldTypeSchema = z.enum([
  "text",
  "long_text",
  "number",
  "decimal",
  "date",
  "datetime",
  "url",
  "image",
  "boolean",
  "select",
  "multi_select",
  "rating",
]);

export const trackerFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  icon: z.string().trim().min(1).max(40),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color"),
  category: z.string().trim().min(1).max(40),
});

export const fieldFormSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[a-z][a-z0-9_]*$/, "Lowercase letters, numbers, underscores; must start with a letter"),
  label: z.string().trim().min(1).max(60),
  field_type: fieldTypeSchema,
  is_personal: z.boolean().default(false),
  is_required: z.boolean().default(false),
  show_in_card: z.boolean().default(false),
  help_text: z.string().trim().max(200).optional().or(z.literal("")),
  options: z.array(z.object({ value: z.string().trim().min(1), label: z.string().trim().min(1) })).optional(),
});

export const statusFormSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[a-z][a-z0-9_]*$/, "Lowercase letters, numbers, underscores; must start with a letter"),
  label: z.string().trim().min(1).max(40),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color"),
  is_default: z.boolean().default(false),
});

export const itemFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  subtitle: z.string().trim().max(200).optional().or(z.literal("")),
  image_url: z.string().trim().url().max(1000).optional().or(z.literal("")),
  backdrop_url: z.string().trim().url().max(1000).optional().or(z.literal("")),
  status_id: z.string().uuid().optional().or(z.literal("")),
  rating: z.coerce.number().min(0).max(10).optional().nullable(),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  is_favorite: z.boolean().optional(),
});
