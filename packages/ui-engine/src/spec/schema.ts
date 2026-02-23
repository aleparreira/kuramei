import { z } from 'zod';

// --- TypeScript Types ---

export type UISpecType = 'navigation';

export interface NavigationSpec {
  type: 'navigation';
  version: '1.0';
  destination: string;
  departureTime?: string;
  avoidTolls?: boolean;
  preferredApp?: 'waze' | 'google-maps' | 'apple-maps';
}

export type UISpec = NavigationSpec;

export interface UISpecToken {
  spec: UISpec;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

// --- Zod Validators ---

export const NavigationSpecSchema = z.object({
  type: z.literal('navigation'),
  version: z.literal('1.0'),
  destination: z.string().min(1),
  departureTime: z.string().optional(),
  avoidTolls: z.boolean().optional(),
  preferredApp: z.enum(['waze', 'google-maps', 'apple-maps']).optional(),
});

export const UISpecSchema = NavigationSpecSchema;

export const UISpecTokenSchema = z.object({
  spec: UISpecSchema,
  userId: z.string().min(1),
  createdAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
});
