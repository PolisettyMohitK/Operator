import { beforeEach, describe, expect, it, vi } from "vitest";

const getDbMock = vi.fn();
const getGoogleSheetsAdapterForOrganizationMock = vi.fn();
const resolveWorkspaceEntitlementsMock = vi.fn();

vi.mock("@/lib/operator/db/client", () => ({
  getDb: getDbMock,
}));

vi.mock("@/lib/operator/adapters/google-sheets", () => ({
  GoogleSheetsAdapterNotConfiguredError: class GoogleSheetsAdapterNotConfiguredError extends Error {},
  GoogleSheetsFetchError: class GoogleSheetsFetchError extends Error {},
  getGoogleSheetsAdapterForOrganization: getGoogleSheetsAdapterForOrganizationMock,
}));

vi.mock("@/lib/operator/billing/entitlements", () => ({
  resolveWorkspaceEntitlements: resolveWorkspaceEntitlementsMock,
}));

function createReadChain<T>(rows: T[]) {
  return {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
}

function createReadAllChain<T>(rows: T[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  };
}

function createUpdateChain() {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
}

function createInsertChain() {
  return {
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  };
}

describe("processQueuedInvoiceSyncRuns", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it(
    "imports normalized Google Sheets rows into clients and invoices",
    async () => {
    const pendingRuns = createReadChain([
      {
        connectedAccountId: "connected_sheets_1",
        id: "sync_1",
        organizationId: "org_test",
      },
    ]);
    const mappingRows = createReadChain([
      {
        mapping: {
          amountDue: "Outstanding",
          clientEmail: "Email",
          clientName: "Client Name",
          dueDate: "Due Date",
          invoiceId: "Invoice Number",
          notes: "Notes",
          status: "State",
        },
        spreadsheetId: "sheet_123",
        worksheetName: "Invoices",
      },
    ]);
    const existingClientRows = createReadAllChain([
      {
        id: "client_northline_studio",
        name: "Northline Studio",
      },
    ]);
    const existingInvoiceRows = createReadAllChain([
      {
        id: "INV-201",
        invoiceId: "INV-201",
      },
    ]);
    const syncUpdate = createUpdateChain();
    const accountUpdate = createUpdateChain();
    const clientInsert = createInsertChain();
    const invoiceInsert = createInsertChain();
    const activityInsert = createInsertChain();
    const tx = {
      insert: vi
        .fn()
        .mockReturnValueOnce(clientInsert)
        .mockReturnValueOnce(invoiceInsert)
        .mockReturnValueOnce(activityInsert),
      update: vi
        .fn()
        .mockReturnValueOnce(syncUpdate)
        .mockReturnValueOnce(accountUpdate),
    };

    getDbMock.mockReturnValue({
      select: vi
        .fn()
        .mockReturnValueOnce(pendingRuns)
        .mockReturnValueOnce(mappingRows)
        .mockReturnValueOnce(existingClientRows)
        .mockReturnValueOnce(existingInvoiceRows),
      transaction: vi.fn(async (callback) => callback(tx)),
    });
    resolveWorkspaceEntitlementsMock.mockResolvedValue({
      canRunBackgroundExecution: true,
      invoiceRecoveryEnabled: true,
    });
    getGoogleSheetsAdapterForOrganizationMock.mockResolvedValue({
      fetchRows: vi.fn().mockResolvedValue([
        {
          "Client Name": "Northline Studio",
          Email: "finance@northline.test",
          "Due Date": "2026-03-01",
          "Invoice Number": "INV-201",
          Notes: "Follow up next week",
          Outstanding: "4800",
          State: "overdue",
        },
      ]),
    });

    const { processQueuedInvoiceSyncRuns } = await import(
      "@/lib/operator/sync/invoice-worker"
    );

    await expect(
      processQueuedInvoiceSyncRuns({
        organizationId: "org_test",
      }),
    ).resolves.toEqual({
      failed: 0,
      processed: 1,
      stalled: 0,
      succeeded: 1,
    });

    expect(clientInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "client_northline_studio",
        organizationId: "org_test",
      }),
    );
    expect(invoiceInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        clientEmail: "finance@northline.test",
        invoiceId: "INV-201",
        organizationId: "org_test",
        status: "overdue",
      }),
    );
    expect(syncUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.stringContaining("Imported 1 invoice"),
        status: "succeeded",
      }),
    );
    expect(accountUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({
        lastSyncState: "succeeded",
      }),
    );
    },
    10_000,
  );

  it(
    "marks the sync as failed and preserves existing data when rows are invalid",
    async () => {
    const pendingRuns = createReadChain([
      {
        connectedAccountId: "connected_sheets_1",
        id: "sync_1",
        organizationId: "org_test",
      },
    ]);
    const mappingRows = createReadChain([
      {
        mapping: {
          amountDue: "Outstanding",
          clientEmail: "Email",
          clientName: "Client Name",
          dueDate: "Due Date",
          invoiceId: "Invoice Number",
          status: "State",
        },
        spreadsheetId: "sheet_123",
        worksheetName: "Invoices",
      },
    ]);
    const syncUpdate = createUpdateChain();
    const accountUpdate = createUpdateChain();

    getDbMock.mockReturnValue({
      select: vi
        .fn()
        .mockReturnValueOnce(pendingRuns)
        .mockReturnValueOnce(mappingRows),
      transaction: vi.fn(),
      update: vi
        .fn()
        .mockReturnValueOnce(syncUpdate)
        .mockReturnValueOnce(accountUpdate),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      }),
    });
    resolveWorkspaceEntitlementsMock.mockResolvedValue({
      canRunBackgroundExecution: true,
      invoiceRecoveryEnabled: true,
    });
    getGoogleSheetsAdapterForOrganizationMock.mockResolvedValue({
      fetchRows: vi.fn().mockResolvedValue([
        {
          "Client Name": "Northline Studio",
          "Due Date": "2026-03-01",
          "Invoice Number": "INV-201",
          Outstanding: "4800",
          State: "overdue",
        },
      ]),
    });

    const { processQueuedInvoiceSyncRuns } = await import(
      "@/lib/operator/sync/invoice-worker"
    );

    await expect(
      processQueuedInvoiceSyncRuns({
        organizationId: "org_test",
      }),
    ).resolves.toEqual({
      failed: 1,
      processed: 1,
      stalled: 0,
      succeeded: 0,
    });

    expect(syncUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.stringContaining("failed"),
        status: "failed",
      }),
    );
    expect(getDbMock().transaction).not.toHaveBeenCalled();
    },
    10_000,
  );
});
