export type WorkspaceSurfaceState =
  | "healthy"
  | "attention_needed"
  | "degraded"
  | "paused";

export type WorkspaceStatusCard = Readonly<{
  state: WorkspaceSurfaceState;
  subject: string;
  whatHappened: string;
  whatItMeans: string;
  actionLabel: string;
  lastSuccessfulEventLabel: string | null;
}>;

export function buildOpenClawRuntimeState(input: {
  runtimeStatus: Exclude<WorkspaceSurfaceState, "healthy">;
  lastSuccessfulEventLabel: string | null;
}): WorkspaceStatusCard {
  return {
    state: input.runtimeStatus,
    subject: "OpenClaw runtime",
    whatHappened:
      input.runtimeStatus === "paused"
        ? "OpenClaw-backed execution is paused."
        : "OpenClaw draft intelligence is unavailable.",
    whatItMeans:
      input.runtimeStatus === "paused"
        ? "Operator will not execute OpenClaw-backed work until the workspace is resumed."
        : "Operator is using safe fallback templates, so tailored drafting is reduced.",
    actionLabel:
      input.runtimeStatus === "paused"
        ? "Resume the workspace when you are ready to continue."
        : "Retry runtime or continue reviewing fallback drafts.",
    lastSuccessfulEventLabel: input.lastSuccessfulEventLabel,
  };
}

export function buildSyncStalledState(input: {
  providerLabel: string;
  state: "attention_needed" | "degraded";
  lastSuccessfulEventLabel: string | null;
}): WorkspaceStatusCard {
  return {
    state: input.state,
    subject: `${input.providerLabel} sync`,
    whatHappened: input.lastSuccessfulEventLabel
      ? `Invoice sync has not completed successfully since ${input.lastSuccessfulEventLabel}.`
      : "Invoice sync has not completed successfully.",
    whatItMeans: "New or updated overdue invoices may be missing from the queue.",
    actionLabel: `Retry sync or reconnect ${input.providerLabel}.`,
    lastSuccessfulEventLabel: input.lastSuccessfulEventLabel,
  };
}

export function buildDeliveryFailureState(input: {
  approvalItemLabel: string;
}): WorkspaceStatusCard {
  return {
    state: "degraded",
    subject: "Delivery failure",
    whatHappened: `The approved follow-up for ${input.approvalItemLabel} was not delivered.`,
    whatItMeans: "The client has not been contacted.",
    actionLabel: "Retry delivery, switch channel, or edit and resend.",
    lastSuccessfulEventLabel: null,
  };
}
