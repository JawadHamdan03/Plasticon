import { createInvoice } from "../src/services/invoiceServices.ts";

const result = await createInvoice(1, {
  invoiceNumber: "TEST-" + Date.now(),
  totalAmount: 100,
  dueDate: "2025-12-31",
  customerName: "Test Customer",
  currency: "ILS",
  invoiceType: "REGULAR",
});

console.log(JSON.stringify(result, null, 2));
process.exit(0);
