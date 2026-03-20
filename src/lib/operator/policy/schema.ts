import { z } from "zod";

export const workspaceAgentPolicySchema = z.object({
  version: z.number().int().positive(),
  workspaceLabel: z.string().min(1),
  agent: z.object({
    name: z.string().min(1),
    toneGuidance: z.string().min(1),
  }),
  tools: z.object({
    gmailSend: z.boolean(),
    googleSheetsRead: z.boolean(),
  }),
  approvals: z.object({
    requireHumanApproval: z.literal(true),
  }),
  automation: z.object({
    paused: z.boolean(),
    killSwitch: z.boolean(),
  }),
  channels: z.object({
    web: z.boolean(),
    email: z.boolean(),
  }),
});

export type WorkspaceAgentPolicy = z.infer<typeof workspaceAgentPolicySchema>;

export const runtimeConfigSchema = z.object({
  workspaceLabel: z.string().min(1),
  executionPolicy: z.enum(["require-approval", "paused"]),
  toolPermissions: z.object({
    gmailSend: z.boolean(),
    googleSheetsRead: z.boolean(),
  }),
  deliveryChannels: z.object({
    web: z.boolean(),
    email: z.boolean(),
  }),
});

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;
