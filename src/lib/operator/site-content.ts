import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  BellRing,
  ChartNoAxesCombined,
  CheckCheck,
  Files,
  MailCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export type NavItem = Readonly<{
  href: string;
  label: string;
}>;

export type Principle = Readonly<{
  title: string;
  description: string;
  icon: LucideIcon;
}>;

export type FeatureCallout = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
}>;

export const marketingNavigation: NavItem[] = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/security", label: "Security" },
  { href: "/pricing", label: "Pricing" },
  { href: "/join-alpha", label: "Join Alpha" },
];

export const marketingPrinciples: Principle[] = [
  {
    title: "Nothing sends without a human",
    description:
      "Operator drafts, prioritizes, and explains. Owners or delegated approvers decide what leaves the business.",
    icon: ShieldCheck,
  },
  {
    title: "Every action is traceable",
    description:
      "A durable timeline records what happened, why it happened, and which channel delivered it.",
    icon: Files,
  },
  {
    title: "Business-owned channels only",
    description:
      "Approved follow-ups go out through the business' connected Gmail or WhatsApp flow, not an anonymous system inbox.",
    icon: MailCheck,
  },
  {
    title: "Cash risk stays visible",
    description:
      "Overdue exposure, stalled accounts, and candidate reminders remain visible in a persistent control room.",
    icon: ChartNoAxesCombined,
  },
];

export const howItWorksSteps = [
  {
    step: "01",
    title: "Connect the revenue stack",
    description:
      "Operator maps Gmail, Google Sheets, and your approval team without requiring a terminal or admin-heavy setup.",
  },
  {
    step: "02",
    title: "Surface what deserves action",
    description:
      "Invoices are normalized, overdue cash is classified, and follow-up drafts are prepared with clear reasoning.",
  },
  {
    step: "03",
    title: "Review once, send everywhere",
    description:
      "Approvals stay synchronized across the dashboard, email alerts, and WhatsApp action surfaces.",
  },
];

export const featureCallouts: FeatureCallout[] = [
  {
    eyebrow: "Queue control",
    title: "A queue built for decisions, not browsing",
    description:
      "High-signal approval cards pair the draft, account context, and risk level so an approver can act without spelunking through history.",
    bullets: [
      "Reasoned draft recommendation from the Operator worker",
      "Client timeline with previous reminders and account notes",
      "Signed action links and delegated approval support",
    ],
  },
  {
    eyebrow: "Client memory",
    title: "A timeline that remembers the business relationship",
    description:
      "Operator does not just know an invoice is overdue. It knows the client, the recent replies, and how aggressively you want to push.",
    bullets: [
      "Structured business profile and communication tone",
      "Last follow-up spacing rules and escalation cadence",
      "Persistent notes for exceptions, VIPs, and legal sensitivities",
    ],
  },
  {
    eyebrow: "Recovery visibility",
    title: "Cash recovery without spreadsheet theater",
    description:
      "The control room turns messy spreadsheets into operational intelligence that a busy owner can actually use.",
    bullets: [
      "Cash at risk, overdue concentration, and stalled approvals",
      "Cross-channel delivery outcomes and retry state",
      "Operator-owned activity log for audits and debriefs",
    ],
  },
];

export const securityHighlights = [
  "Explicit approval gates before irreversible outbound actions",
  "Role-based permissions for owners, staff, and delegated approvers",
  "Scoped account context for every worker execution",
  "Complete action logging across web, email, and WhatsApp surfaces",
];

export const pricingCards = [
  {
    name: "Closed Alpha",
    price: "Free",
    note: "For the first design partners",
    description:
      "Operator ships with white-glove support while the core overdue recovery workflow is hardened.",
    features: [
      "One workspace with owner, staff, and approver roles",
      "Gmail, Google Sheets, web, email, and WhatsApp approval surfaces",
      "Product feedback loop with direct implementation access",
    ],
  },
  {
    name: "Planned Personal",
    price: "$9 / month",
    note: "Future launch tier",
    description:
      "The intended long-term price point for solo operators who need background work handled without hiring operations staff.",
    features: [
      "Unlimited monitoring for invoice follow-up",
      "Persistent memory and business-aware drafts",
      "Auditability and approvals without enterprise complexity",
    ],
  },
];

export const joinAlphaReasons = [
  {
    title: "A genuine workflow, not a demo loop",
    description:
      "Operator is being built against one hard business problem with real integrations and a visible approval queue.",
    icon: CheckCheck,
  },
  {
    title: "Fast operational nudges",
    description:
      "Email and WhatsApp keep pending approvals visible without forcing users to live inside another dashboard.",
    icon: BellRing,
  },
  {
    title: "AI where it matters",
    description:
      "The model layer drafts and prioritizes. The product layer enforces permissions, reliability, and accountability.",
    icon: Sparkles,
  },
  {
    title: "Designed for small businesses",
    description:
      "This is not enterprise workflow theatre. It is premium operational software for owners who still do too much by hand.",
    icon: BadgeCheck,
  },
];
