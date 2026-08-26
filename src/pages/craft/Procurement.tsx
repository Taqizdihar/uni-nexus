import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProcurementOverviewPage } from "./procurement/ProcurementOverviewPage";
import { SuppliersPage } from "./procurement/SuppliersPage";
import { SupplierFormPage } from "./procurement/SupplierFormPage";
import { SupplierDetailPage } from "./procurement/SupplierDetailPage";
import { PurchaseRequestsPage } from "./procurement/PurchaseRequestsPage";
import { PurchaseRequestCreatePage } from "./procurement/PurchaseRequestCreatePage";
import { PurchaseRequestDetailPage } from "./procurement/PurchaseRequestDetailPage";
import { PurchaseOrdersPage } from "./procurement/PurchaseOrdersPage";
import { PurchaseOrderCreatePage } from "./procurement/PurchaseOrderCreatePage";
import { PurchaseOrderDetailPage } from "./procurement/PurchaseOrderDetailPage";
import { GoodsReceiptsPage } from "./procurement/GoodsReceiptsPage";
import { GoodsReceiptCreatePage } from "./procurement/GoodsReceiptCreatePage";
import { SupplierInvoicesPage } from "./procurement/SupplierInvoicesPage";
import { ProcurementHistoryPage } from "./procurement/ProcurementHistoryPage";

export function CraftProcurement() {
  return (
    <Routes>
      <Route index element={<ProcurementOverviewPage />} />
      <Route path="suppliers" element={<SuppliersPage />} />
      <Route path="suppliers/new" element={<SupplierFormPage />} />
      <Route path="suppliers/:id/edit" element={<SupplierFormPage edit />} />
      <Route path="suppliers/:id" element={<SupplierDetailPage />} />
      <Route path="requests" element={<PurchaseRequestsPage />} />
      <Route path="requests/new" element={<PurchaseRequestCreatePage />} />
      <Route path="requests/:id" element={<PurchaseRequestDetailPage />} />
      <Route path="orders" element={<PurchaseOrdersPage />} />
      <Route path="orders/new" element={<PurchaseOrderCreatePage />} />
      <Route path="orders/:id" element={<PurchaseOrderDetailPage />} />
      <Route path="receipts" element={<GoodsReceiptsPage />} />
      <Route path="receipts/new" element={<GoodsReceiptCreatePage />} />
      <Route path="invoices" element={<SupplierInvoicesPage />} />
      <Route path="history" element={<ProcurementHistoryPage />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
