import { z } from "zod";

export const SearchRequestSchema = z.object({
  dir: z.string(),
  query: z.string(),
  top_k: z.number().int().min(1).max(500).default(12),
  provider: z.string().default("local"),
  hf_token: z.string().optional(),
  openai_key: z.string().optional(),

  use_fast: z.boolean().default(false),
  fast_kind: z.string().optional(),
  use_captions: z.boolean().default(false),
  use_ocr: z.boolean().default(false),

  favorites_only: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  date_from: z.number().optional(),
  date_to: z.number().optional(),
  camera: z.string().optional(),
  iso_min: z.number().int().optional(),
  iso_max: z.number().int().optional(),
  f_min: z.number().optional(),
  f_max: z.number().optional(),
  flash: z.string().optional(),
  wb: z.string().optional(),
  metering: z.string().optional(),
  alt_min: z.number().optional(),
  alt_max: z.number().optional(),
  heading_min: z.number().optional(),
  heading_max: z.number().optional(),
  place: z.string().optional(),
  has_text: z.boolean().default(false),
  person: z.string().optional(),
  persons: z.array(z.string()).default([]),
  sharp_only: z.boolean().default(false),
  exclude_underexp: z.boolean().default(false),
  exclude_overexp: z.boolean().default(false),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;

export const SearchResultItemSchema = z.object({
  path: z.string(),
  score: z.number(),
});

export const SearchResponseSchema = z.object({
  search_id: z.string().nullable().optional(),
  results: z.array(SearchResultItemSchema).default([]),
  cached: z.boolean().default(false),
  cache_key: z.string().optional(),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;
