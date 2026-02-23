import { z } from 'zod';

// --- TypeScript Types ---

export type UISpecType = 'navigation' | 'message' | 'list';

export interface NavigationSpec {
  type: 'navigation';
  version: '1.0';
  destination: string;
  departureTime?: string;
  avoidTolls?: boolean;
  preferredApp?: 'waze' | 'google-maps' | 'apple-maps';
}

export interface MessageSpec {
  type: 'message';
  title: string;
  body: string;
  actions?: Array<{ label: string; url: string }>;
}

export interface ListSpec {
  type: 'list';
  title: string;
  items: Array<{ label: string; description?: string }>;
}

export type UISpec = NavigationSpec | MessageSpec | ListSpec;

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

export const MessageSpecSchema = z.object({
  type: z.literal('message'),
  title: z.string().min(1),
  body: z.string().min(1),
  actions: z
    .array(
      z.object({
        label: z.string().min(1),
        url: z.string().url(),
      }),
    )
    .optional(),
});

export const ListSpecSchema = z.object({
  type: z.literal('list'),
  title: z.string().min(1),
  items: z.array(
    z.object({
      label: z.string().min(1),
      description: z.string().optional(),
    }),
  ),
});

export const UISpecSchema = z.discriminatedUnion('type', [
  NavigationSpecSchema,
  MessageSpecSchema,
  ListSpecSchema,
]);

export const UISpecTokenSchema = z.object({
  spec: UISpecSchema,
  userId: z.string().min(1),
  createdAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
});
