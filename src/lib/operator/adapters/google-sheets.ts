import { resolveConnectedAccountCredentials } from "@/lib/operator/credentials/resolver";
import {
  getCredentialEncryptionSecret,
  getGoogleSheetsAdapterConfig,
  type GoogleSheetsAdapterConfig,
} from "@/lib/operator/integrations/env";

export type SheetSyncRecord = Readonly<Record<string, string>>;
export type GoogleSheetsFetchPayload = Readonly<{
  spreadsheetId: string;
  range: string;
}>;

export interface GoogleSheetsAdapter {
  fetchRows(payload: GoogleSheetsFetchPayload): Promise<SheetSyncRecord[]>;
}

export class GoogleSheetsAdapterNotConfiguredError extends Error {
  constructor() {
    super("Google Sheets adapter is not configured.");
  }
}

export class GoogleSheetsFetchError extends Error {
  constructor(message: string) {
    super(message);
  }
}

function buildSheetsUrl(
  payload: GoogleSheetsFetchPayload,
  config: GoogleSheetsAdapterConfig,
) {
  const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(payload.spreadsheetId)}/values/${encodeURIComponent(payload.range)}`;
  const url = new URL(baseUrl);

  if (config.apiKey) {
    url.searchParams.set("key", config.apiKey);
  }

  return url.toString();
}

function toSheetRecords(values: string[][]) {
  const [headers, ...rows] = values;

  if (!headers?.length) {
    return [];
  }

  return rows.map((row) =>
    Object.fromEntries(
      headers.map((header, index) => [header, row[index] ?? ""]),
    ),
  );
}

export class EnvBackedGoogleSheetsAdapter implements GoogleSheetsAdapter {
  constructor(
    private readonly config: GoogleSheetsAdapterConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async fetchRows(payload: GoogleSheetsFetchPayload) {
    const response = await this.fetchImpl(buildSheetsUrl(payload, this.config), {
      headers: this.config.accessToken
        ? {
            Authorization: `Bearer ${this.config.accessToken}`,
          }
        : undefined,
    });

    if (!response.ok) {
      throw new GoogleSheetsFetchError(
        `Google Sheets fetch failed with ${response.status}: ${await response.text()}`,
      );
    }

    const data = (await response.json()) as { values?: string[][] };
    return toSheetRecords(data.values ?? []);
  }
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

export function getGoogleSheetsAdapter(
  env: Readonly<Record<string, string | undefined>> = process.env,
  fetchImpl: typeof fetch = fetch,
) {
  const config = getGoogleSheetsAdapterConfig(env);

  if (!config) {
    throw new GoogleSheetsAdapterNotConfiguredError();
  }

  return new EnvBackedGoogleSheetsAdapter(config, fetchImpl);
}

export async function getGoogleSheetsAdapterForOrganization(
  input: Readonly<{
    organizationId: string;
    env?: Readonly<Record<string, string | undefined>>;
    fetchImpl?: typeof fetch;
  }>,
) {
  const env = input.env ?? process.env;
  const encryptionSecret = getCredentialEncryptionSecret(env);
  const credentials = await resolveConnectedAccountCredentials({
    encryptionSecret,
    organizationId: input.organizationId,
    provider: "google_sheets",
  });

  if (!credentials?.accessToken) {
    throw new GoogleSheetsAdapterNotConfiguredError();
  }

  return new EnvBackedGoogleSheetsAdapter(
    {
      accessToken: credentials.accessToken,
      apiKey: null,
    },
    input.fetchImpl ?? fetch,
  );
}
