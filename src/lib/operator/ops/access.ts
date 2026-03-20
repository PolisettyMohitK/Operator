type ViewerRole = "owner" | "staff" | "approver";

export function canAccessOpsSurface(input: {
  viewerUserId: string;
  viewerRole: ViewerRole;
  opsUserIds: string[];
  nodeEnv?: string;
}) {
  if (input.opsUserIds.includes(input.viewerUserId)) {
    return true;
  }

  return input.nodeEnv !== "production" && input.viewerRole === "owner";
}
