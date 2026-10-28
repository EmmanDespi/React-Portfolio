import type { Sale, Settings } from "./types";

/**
 * Structured invoice data, ready to hand to an e-invoicing connector.
 * This is the POS's OWN format ("pos-einvoice-draft-1"), not the BIR schema.
 * When the BIR's JSON spec applies to you, change only `toPayload`.
 */
export interface EInvoicePayload {
  schema: "pos-einvoice-draft-1";
  documentType: "SALES_INVOICE";
  invoiceNo: string;
  issuedAt: string;
  seller: { name: string; tin: string; address: string; vatRegistered: boolean; machineId: string; serialNo: string; permitToUse: string };
  lines: { description: string; quantity: number; unitPrice: number; taxType: string; lineTotal: number }[];
  totals: { gross: number; vatable: number; vatExempt: number; zeroRated: number; vat: number };
  payment: { method: "CASH"; tendered: number; change: number };
}

export function toPayload(x: Sale, st: Settings): EInvoicePayload {
  return {
    schema: "pos-einvoice-draft-1",
    documentType: "SALES_INVOICE",
    invoiceNo: x.no,
    issuedAt: x.at,
    seller: {
      name: st.businessName, tin: st.tin, address: st.address, vatRegistered: x.mode === "VAT",
      machineId: st.minNo, serialNo: st.serialNo, permitToUse: st.ptuNo,
    },
    lines: x.lines.map((l) => ({
      description: l.name, quantity: l.qty, unitPrice: l.price, taxType: l.taxType,
      lineTotal: Math.round(l.price * l.qty * 100) / 100,
    })),
    totals: { gross: x.totals.gross, vatable: x.totals.vatable, vatExempt: x.totals.exempt, zeroRated: x.totals.zero, vat: x.totals.vat },
    payment: { method: "CASH", tendered: x.tendered, change: x.change },
  };
}

export type Transmitter = (payload: EInvoicePayload) => Promise<void>;

/** Posts JSON to YOUR backend, which holds the BIR credentials and talks to the BIR. */
export function httpTransmitter(endpoint: string): Transmitter {
  return async (payload) => {
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(`Server replied ${res.status}`);
  };
}
