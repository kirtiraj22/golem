import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

import { MAX_ASSETS } from "@/lib/types";

const BASE58_KEY = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const BASE58_SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{64,90}$/;

export const walletSchema = z
  .string()
  .regex(BASE58_KEY, "Invalid public key")
  .refine((value) => {
    try {
      new PublicKey(value);
      return true;
    } catch {
      return false;
    }
  }, "Invalid public key");

export const signatureSchema = z
  .string()
  .regex(BASE58_SIGNATURE, "Invalid transaction signature");

export const challengeBodySchema = z.object({ wallet: walletSchema });

export const verifyChallengeBodySchema = z.object({
  wallet: walletSchema,
  nonce: z.string().regex(/^[0-9a-f]{32}$/),
  signature: z.string().min(86).max(90),
});

export const profileUpdateSchema = z
  .object({
    display_name: z.string().trim().min(1).max(50).nullable().optional(),
    bio: z.string().trim().max(500).nullable().optional(),
    website_url: z
      .string()
      .trim()
      .max(200)
      .regex(/^https?:\/\//, "Must start with http:// or https://")
      .nullable()
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "No fields to update");

const tagsSchema = z
  .array(z.string().trim().toLowerCase().min(1).max(30))
  .max(10);

export const createCampaignMetadataSchema = z.object({
  signature: signatureSchema,
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(5000).nullable().optional(),
  category: z.string().trim().min(1).max(40).nullable().optional(),
  tags: tagsSchema.default([]),
});

export const updateCampaignMetadataSchema = z
  .object({
    title: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    category: z.string().trim().min(1).max(40).nullable().optional(),
    tags: tagsSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "No fields to update");

export const listCampaignsQuerySchema = z.object({
  status: z.enum(["ACTIVE", "CLOSED", "SETTLED"]).optional(),
  category: z.string().trim().min(1).max(40).optional(),
  tag: z.string().trim().toLowerCase().min(1).max(30).optional(),
  company: walletSchema.optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(["newest", "deadline", "budget"]).default("newest"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const myCampaignsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const assetCaptionSchema = z.string().trim().max(300).optional();

export const assetIndexSchema = z.coerce
  .number()
  .int()
  .min(0)
  .max(MAX_ASSETS - 1);

export const signatureBodySchema = z.object({ signature: signatureSchema });

export const transactionsQuerySchema = z.object({
  instruction: z
    .enum([
      "create_campaign",
      "register_asset",
      "fund_campaign",
      "vote",
      "close_campaign",
      "finalize_asset",
      "claim_reward",
      "refund_campaign",
    ])
    .optional(),
  wallet: walletSchema.optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const analyticsQuerySchema = z.object({
  format: z.enum(["json", "csv"]).default("json"),
});

export function searchParams(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams);
}

export function sanitizeSearch(value: string): string {
  return value.replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
}