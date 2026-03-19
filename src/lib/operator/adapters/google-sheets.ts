export type SheetSyncRecord = Readonly<Record<string, string>>;

export interface GoogleSheetsAdapter {
  fetchRows(): Promise<SheetSyncRecord[]>;
}

export class MockGoogleSheetsAdapter implements GoogleSheetsAdapter {
  async fetchRows() {
    return [
      {
        "Invoice Number": "INV-201",
        "Client Name": "Northline Studio",
        Email: "finance@northline.studio",
        Outstanding: "4800",
        "Due Date": "2026-03-01",
        State: "open",
      },
    ];
  }
}
