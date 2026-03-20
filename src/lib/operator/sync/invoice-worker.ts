import { and, asc, desc, eq } from "drizzle-orm";

import {
  getGoogleSheetsAdapterForOrganization,
  GoogleSheetsAdapterNotConfiguredError,
  GoogleSheetsFetchError,
  type SheetSyncRecord,
} from "@/lib/operator/adapters/google-sheets";
import {
  resolveWorkspaceEntitlements,
} from "@/lib/operator/billing/entitlements";
import { getDb } from "@/lib/operator/db/client";
import {
  activityLogs,
  clients,
  connectedAccounts,
  invoices,
  sheetMappings,
  syncRuns,
} from "@/lib/operator/db/schema";
import {
  InvoiceNormalizationError,
  normalizeMappedInvoiceRow,
  type SheetColumnMapping,
} from "@/lib/operator/domain/invoice-normalization";

type InvoiceSyncSummary = {
  processed: number;
  succeeded: number;
  failed: number;
  stalled: number;
};

type PendingInvoiceSyncRun = Readonly<{
  id: string;
  organizationId: string;
  connectedAccountId: string | null;
}>;

type ExistingClientRow = Readonly<{
  id: string;
  name: string;
}>;

type ExistingInvoiceRow = Readonly<{
  id: string;
  invoiceId: string;
}>;

type PreparedInvoiceRow = Readonly<{
  id: string;
  organizationId: string;
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  invoiceId: string;
  amountDue: string;
  dueDate: Date;
  status: string;
  lastFollowUpAt: Date | null;
  notes: string | null;
  rawSource: Record<string, unknown>;
}>;

type PreparedClientRow = Readonly<{
  id: string;
  organizationId: string;
  name: string;
  contactName: string;
  lastTouchpoint: string;
  balance: string;
  sentiment: string;
}>;

type NormalizedSheetImportRow = Readonly<{
  normalized: ReturnType<typeof normalizeMappedInvoiceRow>;
  rawSource: SheetSyncRecord;
}>;

function buildRecordId(prefix: string, seed: string) {
  return `${prefix}_${seed}_${crypto.randomUUID()}`.slice(0, 120);
}

function slugifySegment(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "record";
}

function buildClientId(clientName: string) {
  return `client_${slugifySegment(clientName)}`.slice(0, 120);
}

function buildInvoiceRowId(invoiceId: string) {
  return invoiceId.slice(0, 120);
}

function describeImportCount(count: number) {
  return `Imported ${count} invoice${count === 1 ? "" : "s"} from Google Sheets.`;
}

function buildFailureDetail(message: string) {
  return `Invoice sync failed: ${message}`;
}

function buildStalledDetail(message: string) {
  return `Invoice sync stalled: ${message}`;
}

function getSheetRange(worksheetName: string) {
  return `${worksheetName}!A:Z`;
}

function toClientLookupKey(name: string) {
  return name.trim().toLowerCase();
}

function prepareSheetImport(input: {
  organizationId: string;
  rows: NormalizedSheetImportRow[];
  existingClients: ExistingClientRow[];
  existingInvoices: ExistingInvoiceRow[];
}): Readonly<{
  clients: PreparedClientRow[];
  invoices: PreparedInvoiceRow[];
}> {
  const clientIdByName = new Map(
    input.existingClients.map((row) => [toClientLookupKey(row.name), row.id]),
  );
  const knownInvoiceIdByCode = new Map(
    input.existingInvoices.map((row) => [row.invoiceId, row.id]),
  );
  const preparedClients = new Map<string, PreparedClientRow>();
  const preparedInvoices: PreparedInvoiceRow[] = [];

  for (const row of input.rows) {
    const normalized = row.normalized;
    const clientLookupKey = toClientLookupKey(normalized.clientName);
    const clientId =
      clientIdByName.get(clientLookupKey) ?? buildClientId(normalized.clientName);

    clientIdByName.set(clientLookupKey, clientId);

    if (!preparedClients.has(clientId)) {
      preparedClients.set(clientId, {
        id: clientId,
        organizationId: input.organizationId,
        name: normalized.clientName,
        contactName:
          normalized.clientEmail ?? normalized.clientPhone ?? normalized.clientName,
        lastTouchpoint:
          normalized.notes ?? "Imported from Google Sheets invoice sync.",
        balance: String(normalized.amountDue),
        sentiment: "watch",
      });
    }

    preparedInvoices.push({
      id:
        knownInvoiceIdByCode.get(normalized.invoiceId) ??
        buildInvoiceRowId(normalized.invoiceId),
      organizationId: input.organizationId,
      clientId,
      clientName: normalized.clientName,
      clientEmail: normalized.clientEmail ?? null,
      clientPhone: normalized.clientPhone ?? null,
      invoiceId: normalized.invoiceId,
      amountDue: String(normalized.amountDue),
      dueDate: new Date(normalized.dueDate),
      status: normalized.status,
      lastFollowUpAt: normalized.lastFollowUpAt
        ? new Date(normalized.lastFollowUpAt)
        : null,
      notes: normalized.notes ?? null,
      rawSource: row.rawSource,
    });
  }

  return {
    clients: [...preparedClients.values()],
    invoices: preparedInvoices,
  };
}

async function markSyncRunState(input: {
  connectedAccountId: string | null;
  detail: string;
  organizationId: string;
  runId: string;
  status: "failed" | "stalled";
}) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await db
    .update(syncRuns)
    .set({
      detail: input.detail,
      finishedAt: new Date(),
      status: input.status,
    })
    .where(
      and(
        eq(syncRuns.id, input.runId),
        eq(syncRuns.organizationId, input.organizationId),
      ),
    );

  if (input.connectedAccountId) {
    await db
      .update(connectedAccounts)
      .set({
        lastSyncState: input.status,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(connectedAccounts.id, input.connectedAccountId),
          eq(connectedAccounts.organizationId, input.organizationId),
        ),
      );
  }

  await db.insert(activityLogs).values({
    id: buildRecordId("activity", `${input.organizationId}_${input.runId}`),
    organizationId: input.organizationId,
    actorMembershipId: null,
    subjectType: "invoice_sync",
    subjectId: input.runId,
    title: input.status === "failed" ? "Invoice sync failed" : "Invoice sync stalled",
    message: input.detail,
    metadata: {
      channel: "System",
      status: input.status,
    },
  });
}

export async function processQueuedInvoiceSyncRuns(input: Readonly<{
  organizationId: string;
}>): Promise<InvoiceSyncSummary> {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const pendingRuns = (await db
    .select({
      connectedAccountId: syncRuns.connectedAccountId,
      id: syncRuns.id,
      organizationId: syncRuns.organizationId,
    })
    .from(syncRuns)
    .where(
      and(
        eq(syncRuns.organizationId, input.organizationId),
        eq(syncRuns.kind, "invoice_sync"),
        eq(syncRuns.status, "pending"),
      ),
    )
    .orderBy(asc(syncRuns.startedAt))
    .limit(20)) as PendingInvoiceSyncRun[];

  if (pendingRuns.length === 0) {
    return {
      failed: 0,
      processed: 0,
      stalled: 0,
      succeeded: 0,
    };
  }

  const entitlements = await resolveWorkspaceEntitlements(input.organizationId);
  const [mappingRow] = await db
    .select({
      mapping: sheetMappings.mapping,
      spreadsheetId: sheetMappings.spreadsheetId,
      worksheetName: sheetMappings.worksheetName,
    })
    .from(sheetMappings)
    .where(eq(sheetMappings.organizationId, input.organizationId))
    .orderBy(desc(sheetMappings.createdAt))
    .limit(1);

  const summary: InvoiceSyncSummary = {
    failed: 0,
    processed: pendingRuns.length,
    stalled: 0,
    succeeded: 0,
  };

  for (const run of pendingRuns) {
    if (!run.connectedAccountId) {
      await markSyncRunState({
        connectedAccountId: null,
        detail: buildStalledDetail(
          "No connected Google Sheets account is attached to this sync run.",
        ),
        organizationId: run.organizationId,
        runId: run.id,
        status: "stalled",
      });
      summary.stalled += 1;
      continue;
    }

    if (!mappingRow) {
      await markSyncRunState({
        connectedAccountId: run.connectedAccountId,
        detail: buildStalledDetail(
          "A Google Sheets mapping must be configured before invoice sync can run.",
        ),
        organizationId: run.organizationId,
        runId: run.id,
        status: "stalled",
      });
      summary.stalled += 1;
      continue;
    }

    if (!entitlements.canRunBackgroundExecution) {
      await markSyncRunState({
        connectedAccountId: run.connectedAccountId,
        detail: buildStalledDetail(
          "The workspace must be active and billed before invoice sync can run.",
        ),
        organizationId: run.organizationId,
        runId: run.id,
        status: "stalled",
      });
      summary.stalled += 1;
      continue;
    }

    try {
      const connectedAccountId = run.connectedAccountId;
      const adapter = await getGoogleSheetsAdapterForOrganization({
        organizationId: run.organizationId,
      });
      const rows = await adapter.fetchRows({
        range: getSheetRange(mappingRow.worksheetName),
        spreadsheetId: mappingRow.spreadsheetId,
      });
      const normalizedRows = rows.map((row) => ({
        normalized: normalizeMappedInvoiceRow(
          row,
          mappingRow.mapping as SheetColumnMapping,
        ),
        rawSource: row,
      }));
      const existingClientRows = (await db
        .select({
          id: clients.id,
          name: clients.name,
        })
        .from(clients)
        .where(eq(clients.organizationId, input.organizationId))) as ExistingClientRow[];
      const existingInvoiceRows = (await db
        .select({
          id: invoices.id,
          invoiceId: invoices.invoiceId,
        })
        .from(invoices)
        .where(eq(invoices.organizationId, input.organizationId))) as ExistingInvoiceRow[];
      const preparedImport = prepareSheetImport({
        existingClients: existingClientRows,
        existingInvoices: existingInvoiceRows,
        organizationId: run.organizationId,
        rows: normalizedRows,
      });

      await db.transaction(async (tx) => {
        for (const clientRow of preparedImport.clients) {
          await tx
            .insert(clients)
            .values(clientRow)
            .onConflictDoUpdate({
              target: clients.id,
              set: {
                balance: clientRow.balance,
                contactName: clientRow.contactName,
                lastTouchpoint: clientRow.lastTouchpoint,
                name: clientRow.name,
                sentiment: clientRow.sentiment,
              },
            });
        }

        for (const invoiceRow of preparedImport.invoices) {
          await tx
            .insert(invoices)
            .values(invoiceRow)
            .onConflictDoUpdate({
              target: invoices.id,
              set: {
                amountDue: invoiceRow.amountDue,
                clientEmail: invoiceRow.clientEmail,
                clientId: invoiceRow.clientId,
                clientName: invoiceRow.clientName,
                clientPhone: invoiceRow.clientPhone,
                dueDate: invoiceRow.dueDate,
                invoiceId: invoiceRow.invoiceId,
                lastFollowUpAt: invoiceRow.lastFollowUpAt,
                notes: invoiceRow.notes,
                rawSource: invoiceRow.rawSource,
                status: invoiceRow.status,
              },
            });
        }

        await tx
          .update(syncRuns)
          .set({
            detail: describeImportCount(preparedImport.invoices.length),
            finishedAt: new Date(),
            status: "succeeded",
          })
          .where(
            and(
              eq(syncRuns.id, run.id),
              eq(syncRuns.organizationId, run.organizationId),
            ),
          );

        await tx
          .update(connectedAccounts)
          .set({
            lastSuccessfulSyncAt: new Date(),
            lastSyncState: "succeeded",
            reconnectReason: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(connectedAccounts.id, connectedAccountId),
              eq(connectedAccounts.organizationId, run.organizationId),
            ),
          );

        await tx.insert(activityLogs).values({
          id: buildRecordId("activity", `${run.organizationId}_${run.id}`),
          organizationId: run.organizationId,
          actorMembershipId: null,
          subjectType: "invoice_sync",
          subjectId: run.id,
          title: "Invoice sync succeeded",
          message: describeImportCount(preparedImport.invoices.length),
          metadata: {
            channel: "System",
            importedCount: preparedImport.invoices.length,
            spreadsheetId: mappingRow.spreadsheetId,
            worksheetName: mappingRow.worksheetName,
          },
        });
      });

      summary.succeeded += 1;
    } catch (error) {
      const detail =
        error instanceof GoogleSheetsAdapterNotConfiguredError
          ? buildStalledDetail(
              "Google Sheets must be connected again before invoice sync can continue.",
            )
          : error instanceof InvoiceNormalizationError ||
              error instanceof GoogleSheetsFetchError
            ? buildFailureDetail(error.message)
            : error instanceof Error
              ? buildFailureDetail(error.message)
              : buildFailureDetail("Unknown sync error.");
      const status =
        error instanceof GoogleSheetsAdapterNotConfiguredError
          ? "stalled"
          : "failed";

      await markSyncRunState({
        connectedAccountId: run.connectedAccountId,
        detail,
        organizationId: run.organizationId,
        runId: run.id,
        status,
      });

      if (status === "stalled") {
        summary.stalled += 1;
      } else {
        summary.failed += 1;
      }
    }
  }

  return summary;
}
