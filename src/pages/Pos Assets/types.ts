export type TaxType = "VATABLE" | "EXEMPT" | "ZERO";
export type TaxMode = "VAT" | "NON_VAT";

export interface Item { id: string; name: string; sku: string; price: number; taxType: TaxType; stock: number }
export interface Line { itemId: string; name: string; price: number; qty: number; taxType: TaxType }
export interface Totals { gross: number; vatable: number; vat: number; exempt: number; zero: number }

export interface Sale {
  id: string; no: string; at: string; lines: Line[]; totals: Totals;
  tendered: number; change: number; mode: TaxMode;
  voided: boolean; voidReason?: string; voidedAt?: string;
  /** Z-reading counter that closed this sale. Closed sales can no longer be voided. */
  zNo?: number;
  /** Browser session that created the sale (stored in the sheet for traceability). */
  sessionId?: string;
}

export interface Settings {
  businessName: string; tin: string; address: string; taxMode: TaxMode;
  /** Filled in after BIR accreditation / PTU. Printed on receipts and readings. */
  minNo: string; serialNo: string; ptuNo: string;
  eInvoiceEnabled: boolean;
  /** Your own backend endpoint that relays to the BIR. Never put BIR credentials in the browser. */
  eInvoiceEndpoint: string;
  /** Google Apps Script web app link (ends in /exec) and its access token. Kept on this device only. */
  sheetsUrl: string; sheetsToken: string;
}

/** An X-reading (snapshot, closes nothing) or Z-reading (closes the day). */
export interface Reading {
  kind: "X" | "Z"; id: string; at: string;
  counter: number; resetCounter: number;
  begInvoice: string; endInvoice: string; invoiceCount: number; voidCount: number;
  gross: number; voids: number; net: number;
  vatable: number; vatExempt: number; zeroRated: number; vat: number; nonVat: number;
  begGrandTotal: number; endGrandTotal: number;
}

export type OutboxStatus = "PENDING" | "SENT" | "FAILED" | "CANCELLED";
export interface OutboxItem {
  saleId: string; no: string; status: OutboxStatus; attempts: number; lastError?: string; sentAt?: string;
}

/**
 * In memory the app still works with one Store.
 * Saved on this device (localStorage): sessionId, settings, cart.
 * Saved in the Google Sheet: items, sales, readings, outbox (nextNo is derived from sales).
 */
export interface Store {
  sessionId: string;
  settings: Settings; items: Item[]; sales: Sale[];
  cart: { itemId: string; qty: number }[]; nextNo: number;
  readings: Reading[];  // newest first
  outbox: OutboxItem[]; // newest first
}

export const EMPTY: Store = {
  sessionId: "",
  settings: {
    businessName: "", tin: "", address: "", taxMode: "VAT",
    minNo: "", serialNo: "", ptuNo: "", eInvoiceEnabled: false, eInvoiceEndpoint: "",
    sheetsUrl: "", sheetsToken: "",
  },
  items: [], sales: [], cart: [], nextNo: 1, readings: [], outbox: [],
};