import { describe, expect, it } from "vitest";

import {
  InvoiceNormalizationError,
  normalizeMappedInvoiceRow,
  type SheetColumnMapping,
} from "@/lib/operator/domain/invoice-normalization";

const mapping: SheetColumnMapping = {
  invoiceId: "Invoice Number",
  clientName: "Client Name",
  clientEmail: "Email",
  amountDue: "Outstanding",
  dueDate: "Due Date",
  status: "State",
  notes: "Notes",
};

describe("normalizeMappedInvoiceRow", () => {
  it("normalizes a valid row into the Operator invoice shape", () => {
    const invoice = normalizeMappedInvoiceRow(
      {
        "Invoice Number": "INV-104",
        "Client Name": "Marlow Studio",
        Email: "finance@marlow.studio",
        Outstanding: "1250.50",
        "Due Date": "2026-03-05",
        State: "open",
        Notes: "VIP account",
      },
      mapping,
    );

    expect(invoice).toEqual({
      invoiceId: "INV-104",
      clientName: "Marlow Studio",
      clientEmail: "finance@marlow.studio",
      clientPhone: undefined,
      amountDue: 1250.5,
      dueDate: "2026-03-05",
      status: "open",
      lastFollowUpAt: undefined,
      notes: "VIP account",
    });
  });

  it("fails when neither email nor phone is mapped", () => {
    expect(() =>
      normalizeMappedInvoiceRow(
        {
          "Invoice Number": "INV-104",
          "Client Name": "Marlow Studio",
          Outstanding: "1250.50",
          "Due Date": "2026-03-05",
          State: "open",
        },
        {
          invoiceId: "Invoice Number",
          clientName: "Client Name",
          amountDue: "Outstanding",
          dueDate: "Due Date",
          status: "State",
        },
      ),
    ).toThrowError(InvoiceNormalizationError);
  });

  it("fails when the amount is not numeric", () => {
    expect(() =>
      normalizeMappedInvoiceRow(
        {
          "Invoice Number": "INV-104",
          "Client Name": "Marlow Studio",
          Email: "finance@marlow.studio",
          Outstanding: "unknown",
          "Due Date": "2026-03-05",
          State: "open",
        },
        mapping,
      ),
    ).toThrow("Amount due");
  });
});
