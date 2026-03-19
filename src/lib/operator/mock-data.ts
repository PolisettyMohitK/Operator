import type {
  ApprovalChannel,
  ApprovalItem,
  TeamMember,
} from "@/lib/operator/domain/approval-policy";

export const workspace = {
  name: "Operator Closed Alpha",
  businessName: "Northline Advisory",
  businessType: "Fractional operations consultancy",
  owner: "Aarav Kulkarni",
  tone: "Direct, calm, respectful, and firm when an invoice is genuinely overdue.",
};

export const queueMetrics = [
  {
    label: "Cash at risk",
    value: "$28.4K",
    detail: "Across 17 active overdue invoices",
    trend: "+12% from last week",
  },
  {
    label: "Pending approvals",
    value: "06",
    detail: "2 urgent, 4 due today",
    trend: "3 need cross-channel confirmation",
  },
  {
    label: "Auto-prepared drafts",
    value: "14",
    detail: "Generated in the last 24 hours",
    trend: "91% required no structural rewrite",
  },
  {
    label: "Recovered this month",
    value: "$9.8K",
    detail: "Across 5 accounts",
    trend: "Median payment delay down 4 days",
  },
] as const;

export const approvalItems: (ApprovalItem & {
  clientName: string;
  amountDue: number;
  risk: "urgent" | "watch" | "routine";
  reason: string;
  preview: string;
  channelLabel: string;
})[] = [
  {
    id: "approval_201",
    invoiceId: "INV-201",
    status: "pending",
    channel: "email",
    clientName: "Northline Studio",
    amountDue: 4800,
    risk: "urgent",
    reason: "18 days overdue. Last follow-up was 9 days ago. Client opened the previous email twice.",
    preview:
      "Hi Elena, I wanted to bring invoice INV-201 back to the top of your queue. We are now past the original due date and would appreciate confirmation on the payment timing today.",
    channelLabel: "Gmail",
  },
  {
    id: "approval_202",
    invoiceId: "INV-202",
    status: "edited",
    channel: "whatsapp",
    clientName: "Harbor & Finch",
    amountDue: 950,
    risk: "watch",
    reason: "4 days overdue. Client prefers WhatsApp reminders over email.",
    preview:
      "Hello Sam, a quick note that invoice INV-202 is now overdue. Please let me know if you need the invoice resent or if payment is already in motion.",
    channelLabel: "WhatsApp",
  },
  {
    id: "approval_203",
    invoiceId: "INV-203",
    status: "pending",
    channel: "email",
    clientName: "Aster Lane",
    amountDue: 3200,
    risk: "urgent",
    reason: "13 days overdue. Owner flagged this account for firm follow-up language.",
    preview:
      "Hi Morgan, we still have not seen payment for invoice INV-203. Please confirm the payment date or let us know today if there is a blocker we should resolve immediately.",
    channelLabel: "Gmail",
  },
];

export const invoices = [
  {
    invoiceId: "INV-201",
    clientName: "Northline Studio",
    dueDate: "2026-03-01",
    amountDue: 4800,
    status: "Overdue",
    channel: "Email + Web",
    owner: "Aarav",
    lastFollowUpAt: "Mar 10",
  },
  {
    invoiceId: "INV-202",
    clientName: "Harbor & Finch",
    dueDate: "2026-03-15",
    amountDue: 950,
    status: "Needs approval",
    channel: "WhatsApp",
    owner: "Rhea",
    lastFollowUpAt: "Mar 17",
  },
  {
    invoiceId: "INV-203",
    clientName: "Aster Lane",
    dueDate: "2026-03-06",
    amountDue: 3200,
    status: "Overdue",
    channel: "Email + WhatsApp",
    owner: "Aarav",
    lastFollowUpAt: "Mar 08",
  },
  {
    invoiceId: "INV-204",
    clientName: "Pineglass Collective",
    dueDate: "2026-03-22",
    amountDue: 720,
    status: "Upcoming",
    channel: "Web",
    owner: "Mina",
    lastFollowUpAt: "—",
  },
] as const;

export const clients = [
  {
    name: "Northline Studio",
    contact: "Elena Hart",
    lastTouchpoint: "Opened reminder email 2h ago",
    balance: "$4,800",
    sentiment: "Warm relationship, delayed AP process",
  },
  {
    name: "Harbor & Finch",
    contact: "Sam Cole",
    lastTouchpoint: "Responded via WhatsApp yesterday",
    balance: "$950",
    sentiment: "Prefers concise mobile follow-ups",
  },
  {
    name: "Aster Lane",
    contact: "Morgan Yu",
    lastTouchpoint: "No reply after last two reminders",
    balance: "$3,200",
    sentiment: "Escalation allowed after 14 days",
  },
] as const;

export const activityFeed = [
  {
    title: "Draft approved and sent",
    detail: "Rhea approved INV-202 through WhatsApp. Operator synced the status to the queue.",
    timestamp: "09:14",
    channel: "WhatsApp",
  },
  {
    title: "Queue item escalated",
    detail: "INV-201 crossed the urgent threshold. Operator promoted it to the owner lane.",
    timestamp: "08:37",
    channel: "Web",
  },
  {
    title: "Reminder opened",
    detail: "Northline Studio opened the previous Gmail reminder twice within 40 minutes.",
    timestamp: "07:52",
    channel: "Email",
  },
] as const;

export const teamMembers: TeamMember[] = [
  {
    id: "owner_1",
    name: "Aarav Kulkarni",
    role: "owner",
  },
  {
    id: "approver_1",
    name: "Rhea D'Souza",
    role: "approver",
  },
  {
    id: "staff_1",
    name: "Mina Park",
    role: "staff",
  },
];

export const integrations = [
  {
    name: "Gmail",
    status: "Connected",
    detail: "Using hello@northlineadvisory.com for email reminders",
  },
  {
    name: "Google Sheets",
    status: "Connected",
    detail: "Invoice workbook mapped to Operator normalized schema",
  },
  {
    name: "WhatsApp",
    status: "Pending setup",
    detail: "Actionable notifications available once Business API credentials are supplied",
  },
  {
    name: "OpenClaw Worker",
    status: "Configured",
    detail: "Scoped worker adapter available for draft generation and rationale",
  },
] as const;

export const onboardingSteps = [
  "Business identity",
  "Business type",
  "Owner profile",
  "Team invites",
  "Communication tone",
  "Connect Gmail",
  "Connect Google Sheets",
  "Map invoice IDs",
  "Map client contacts",
  "Map amounts, due dates, and statuses",
  "Set reminder cadence",
  "Choose approvers and channels",
] as const;

export const channelMatrix: {
  channel: ApprovalChannel | "web";
  state: string;
  note: string;
}[] = [
  {
    channel: "web",
    state: "Canonical",
    note: "Full edit, review, and audit trail flow lives in the Operator dashboard.",
  },
  {
    channel: "email",
    state: "Active",
    note: "Pending approvals are summarized with signed action links and deep-links back into the queue.",
  },
  {
    channel: "whatsapp",
    state: "Action surface",
    note: "Approvers can accept or reject quickly, then fall back to the dashboard for richer edits.",
  },
];
