import { parseISO } from "date-fns";

export type SheetColumnMapping = Readonly<{
  invoiceId: string;
  clientName: string;
  amountDue: string;
  dueDate: string;
  status: string;
  clientEmail?: string;
  clientPhone?: string;
  lastFollowUpAt?: string;
  notes?: string;
}>;

export type NormalizedInvoice = Readonly<{
  invoiceId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  amountDue: number;
  dueDate: string;
  status: string;
  lastFollowUpAt?: string;
  notes?: string;
}>;

export class InvoiceNormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceNormalizationError";
  }
}

function readMappedValue(
  row: Record<string, string>,
  column?: string,
): string | undefined {
  if (!column) {
    return undefined;
  }

  const value = row[column];
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function requireMappedValue(row: Record<string, string>, column: string, label: string) {
  const value = readMappedValue(row, column);
  if (!value) {
    throw new InvoiceNormalizationError(`${label} is required.`);
  }

  return value;
}

function validateIsoDate(value: string, label: string) {
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new InvoiceNormalizationError(`${label} must be a valid ISO date.`);
  }

  return value;
}

export function normalizeMappedInvoiceRow(
  row: Record<string, string>,
  mapping: SheetColumnMapping,
): NormalizedInvoice {
  const clientEmail = readMappedValue(row, mapping.clientEmail);
  const clientPhone = readMappedValue(row, mapping.clientPhone);

  if (!clientEmail && !clientPhone) {
    throw new InvoiceNormalizationError(
      "At least one client contact field is required (email or phone).",
    );
  }

  const amountDueRaw = requireMappedValue(row, mapping.amountDue, "Amount due");
  const amountDue = Number(amountDueRaw.replaceAll(",", ""));

  if (!Number.isFinite(amountDue)) {
    throw new InvoiceNormalizationError("Amount due must be numeric.");
  }

  const dueDate = validateIsoDate(
    requireMappedValue(row, mapping.dueDate, "Due date"),
    "Due date",
  );

  const lastFollowUpAt = readMappedValue(row, mapping.lastFollowUpAt);

  return {
    invoiceId: requireMappedValue(row, mapping.invoiceId, "Invoice ID"),
    clientName: requireMappedValue(row, mapping.clientName, "Client name"),
    clientEmail,
    clientPhone,
    amountDue,
    dueDate,
    status: requireMappedValue(row, mapping.status, "Status").toLowerCase(),
    lastFollowUpAt: lastFollowUpAt
      ? validateIsoDate(lastFollowUpAt, "Last follow-up")
      : undefined,
    notes: readMappedValue(row, mapping.notes),
  };
}
