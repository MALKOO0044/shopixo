import { z } from 'zod';

export const productSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .transform((s) => s.trim())
    .transform((s) => s.replace(/\s+/g, '-'))
    .transform((s) => s.toLowerCase()),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be a positive number'),
  stock: z.coerce.number().int().min(0, 'Stock must be a non-negative integer'),
  // Category is required in DB; default to 'General' if not provided
  category: z
    .string()
    .optional()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : 'General')),
  // Accept a comma-separated string from the form and transform it into a string[]
  images: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return [] as string[];
      return val
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    })
    .refine((arr) => Array.isArray(arr) && arr.length > 0, {
      message: 'الرجاء إضافة صورة أو فيديو واحد على الأقل',
      path: ['images'],
    }),
  // Optional publishing flag (defaults to true when omitted)
  is_active: z
    .union([z.boolean(), z.literal('true'), z.literal('false'), z.null()])
    .optional()
    .transform((v) => (v === 'false' || v === false ? false : true)),
});
