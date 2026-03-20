"use server";

import { revalidatePath } from "next/cache";

import { requireViewerContext } from "@/lib/operator/datalayer/viewer-context";
import {
  assertWorkspaceOwnerAccess,
  DEFAULT_REMINDER_POLICY,
  materializeChannelPolicyDefaults,
  parseChannelPolicyFormData,
  parseManagedPolicyFormData,
  parseReminderPolicyFormData,
  saveWorkspacePolicy,
  updateMemberApprovalDelegation,
} from "@/lib/operator/datalayer/workspace-admin";
import {
  getOnboardingDisplayState,
  getSettingsDisplayState,
} from "@/lib/operator/db/queries";

function revalidateWorkspaceAdminSurfaces() {
  revalidatePath("/app");
  revalidatePath("/app/activity");
  revalidatePath("/app/onboarding");
  revalidatePath("/app/settings");
  revalidatePath("/app/team");
}

export async function setMemberApprovalDelegation(
  membershipId: string,
  nextCanApprove: boolean,
) {
  const viewerContext = await requireViewerContext();

  assertWorkspaceOwnerAccess({
    viewerOrganizationId: viewerContext.organizationId,
    viewerRole: viewerContext.role,
    targetOrganizationId: viewerContext.organizationId,
  });

  await updateMemberApprovalDelegation({
    actorMembershipId: viewerContext.membershipId,
    canApprove: nextCanApprove,
    organizationId: viewerContext.organizationId,
    targetMembershipId: membershipId,
  });

  revalidateWorkspaceAdminSurfaces();
}

export async function saveWorkspaceSettings(formData: FormData) {
  const viewerContext = await requireViewerContext();

  assertWorkspaceOwnerAccess({
    viewerOrganizationId: viewerContext.organizationId,
    viewerRole: viewerContext.role,
    targetOrganizationId: viewerContext.organizationId,
  });

  const onboardingState = await getOnboardingDisplayState(viewerContext.organizationId);

  await saveWorkspacePolicy({
    actorMembershipId: viewerContext.membershipId,
    channelPolicies: parseChannelPolicyFormData(formData),
    ...parseManagedPolicyFormData(formData),
    organizationId: viewerContext.organizationId,
    reminderPolicy: onboardingState.reminderPolicy ?? DEFAULT_REMINDER_POLICY,
    toneGuidance: String(formData.get("toneGuidance") ?? ""),
    workspaceLabel: viewerContext.workspaceLabel,
  });

  revalidateWorkspaceAdminSurfaces();
}

export async function saveReminderCadence(formData: FormData) {
  const viewerContext = await requireViewerContext();

  assertWorkspaceOwnerAccess({
    viewerOrganizationId: viewerContext.organizationId,
    viewerRole: viewerContext.role,
    targetOrganizationId: viewerContext.organizationId,
  });

  const settings = await getSettingsDisplayState(viewerContext.organizationId);

  await saveWorkspacePolicy({
    actorMembershipId: viewerContext.membershipId,
    channelPolicies: materializeChannelPolicyDefaults(settings.channelStates),
    gmailSendEnabled: settings.agentPolicy.gmailSendEnabled,
    googleSheetsReadEnabled: settings.agentPolicy.googleSheetsReadEnabled,
    killSwitchEnabled: settings.agentPolicy.killSwitchEnabled,
    organizationId: viewerContext.organizationId,
    reminderPolicy: parseReminderPolicyFormData(formData),
    toneGuidance: settings.toneGuidance || viewerContext.toneGuidance,
    workspaceLabel: viewerContext.workspaceLabel,
  });

  revalidateWorkspaceAdminSurfaces();
}
