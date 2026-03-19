import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const transactionMock = vi.fn();
const getDbMock = vi.fn();

vi.mock("@/lib/operator/db/client", () => ({
  getDb: getDbMock,
}));

function createInsertChain() {
  return {
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  };
}

describe("processClerkWebhookEvent", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.CLERK_WEBHOOK_SECRET;
  });

  it("creates a default staff membership for user.created", async () => {
    const organizationInsert = createInsertChain();
    const membershipInsert = createInsertChain();
    const tx = {
      insert: vi
        .fn()
        .mockReturnValueOnce(organizationInsert)
        .mockReturnValueOnce(membershipInsert),
    };
    const db = {
      transaction: transactionMock.mockImplementation(async (callback) =>
        callback(tx),
      ),
    };
    getDbMock.mockReturnValue(db);

    const { processClerkWebhookEvent } = await import(
      "@/lib/operator/webhooks/clerk"
    );

    await processClerkWebhookEvent({
      object: "event",
      type: "user.created",
      data: {
        id: "user_123",
        first_name: "Aarav",
        last_name: "Kulkarni",
        email_addresses: [{ email_address: "aarav@example.com" }],
      },
      event_attributes: {
        http_request: {
          client_ip: "127.0.0.1",
          user_agent: "vitest",
        },
      },
    });

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(tx.insert).toHaveBeenCalledTimes(2);
    expect(organizationInsert.values).toHaveBeenCalledOnce();
    expect(membershipInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        canApprove: false,
        clerkUserId: "user_123",
        role: "staff",
      }),
    );
  });

  it("upserts an organization membership from organizationMembership.created", async () => {
    const organizationInsert = createInsertChain();
    const membershipInsert = createInsertChain();
    const tx = {
      insert: vi
        .fn()
        .mockReturnValueOnce(organizationInsert)
        .mockReturnValueOnce(membershipInsert),
    };
    const db = {
      transaction: vi.fn(async (callback) => callback(tx)),
    };
    getDbMock.mockReturnValue(db);

    const { processClerkWebhookEvent } = await import(
      "@/lib/operator/webhooks/clerk"
    );

    await processClerkWebhookEvent({
      object: "event",
      type: "organizationMembership.created",
      data: {
        id: "om_123",
        role: "org:admin",
        public_metadata: {
          can_approve: true,
        },
        organization: {
          id: "org_clerk_123",
          name: "Northline Advisory",
          slug: "northline-advisory",
        },
        public_user_data: {
          user_id: "user_123",
          first_name: "Aarav",
          last_name: "Kulkarni",
          identifier: "aarav@example.com",
        },
      },
      event_attributes: {
        http_request: {
          client_ip: "127.0.0.1",
          user_agent: "vitest",
        },
      },
    });

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(membershipInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        canApprove: true,
        clerkUserId: "user_123",
        role: "owner",
      }),
    );
  });
});

describe("Clerk webhook route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.CLERK_WEBHOOK_SECRET = Buffer.from("super-secret").toString(
      "base64",
    );
  });

  afterEach(() => {
    delete process.env.CLERK_WEBHOOK_SECRET;
  });

  it("returns 400 when signature verification fails", async () => {
    getDbMock.mockReturnValue({
      transaction: vi.fn(),
    });

    const { POST } = await import("@/app/api/webhooks/clerk/route");
    const request = new Request("https://operator.example.com/api/webhooks/clerk", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "webhook-id": "msg_123",
        "webhook-timestamp": `${Date.now()}`,
        "webhook-signature": "v1,invalid",
      },
      body: JSON.stringify({
        object: "event",
        type: "user.created",
        data: {
          id: "user_123",
        },
        event_attributes: {
          http_request: {
            client_ip: "127.0.0.1",
            user_agent: "vitest",
          },
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
