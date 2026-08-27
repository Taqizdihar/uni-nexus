/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider,
} from "react-router-dom";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { PermissionGate } from "./components/auth/PermissionGate";
import { AppLayout } from "./components/layout/AppLayout";
import { Landing } from "./pages/public/Landing";
import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";
import { Dashboard } from "./pages/global/Dashboard";
import { Users as UsersManagement } from "./pages/global/Users";
import { Profile } from "./pages/global/Profile";
import { CraftOrders } from "./pages/craft/Orders";
import { CraftPrinters } from "./pages/craft/Printers";
import { CraftProduction } from "./pages/craft/Production";
import { CraftProducts } from "./pages/craft/Products";
import { CraftMaterials } from "./pages/craft/Materials";
import { CraftFinance } from "./pages/craft/Finance";
import { CraftCustomers } from "./pages/craft/Customers";
import { CraftProcurement } from "./pages/craft/Procurement";
import { CraftAnalytics } from "./pages/craft/Analytics";
import { CraftMarketplace } from "./pages/craft/Marketplace";
import { CraftAutomations } from "./pages/craft/Automations";
import { StudioProjects } from "./pages/studio/Projects";
import { StudioClients } from "./pages/studio/Clients";
import { StudioServices } from "./pages/studio/Services";
import { StudioEquipment } from "./pages/studio/Equipment";
import { StudioBilling } from "./pages/studio/Billing";
import { StudioVendors } from "./pages/studio/Vendors";
import { StudioFinance } from "./pages/studio/Finance";
import { PlannedModulePage } from "./components/common/PlannedModulePage";
import {
  FileText,
  Wallet,
  Settings,
  Bell,
  Users,
  ShieldAlert,
  FileArchive,
} from "lucide-react";

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route
          path="finance"
          element={
            <PlannedModulePage
              title="Keuangan Terpadu"
              description="Buku besar konsolidasi untuk Craft dan Studio."
              stage="Tahap Berikutnya"
              icon={Wallet}
            />
          }
        />
        <Route
          path="documents"
          element={
            <PlannedModulePage
              title="Pusat Dokumen"
              description="Penyimpanan dan berbagi file terpusat."
              stage="Lanjutan"
              icon={FileArchive}
            />
          }
        />
        <Route
          path="settings"
          element={
            <PlannedModulePage
              title="Pengaturan Sistem"
              description="Pengaturan global aplikasi dan ruang kerja."
              stage="Tahap Berikutnya"
              icon={Settings}
            />
          }
        />
        <Route
          path="notifications"
          element={
            <PlannedModulePage
              title="Notifikasi"
              description="Peringatan sistem dan pemberitahuan pengguna."
              stage="Tahap Berikutnya"
              icon={Bell}
            />
          }
        />
        <Route
          path="users"
          element={
            <PermissionGate permission="users.manage">
              <UsersManagement />
            </PermissionGate>
          }
        />
        <Route path="profile" element={<Profile />} />
        <Route
          path="audit-log"
          element={
            <PlannedModulePage
              title="Log Audit"
              description="Pelacakan aktivitas sistem dan log keamanan."
              stage="Lanjutan"
              icon={ShieldAlert}
            />
          }
        />
        <Route path="craft/orders/*" element={<CraftOrders />} />
        <Route
          path="craft/production/*"
          element={
            <PermissionGate permission="craft.production.read">
              <CraftProduction />
            </PermissionGate>
          }
        />
        <Route
          path="craft/products/*"
          element={
            <PermissionGate permission="craft.products.read">
              <CraftProducts />
            </PermissionGate>
          }
        />
        <Route
          path="craft/printers/*"
          element={
            <PermissionGate permission="craft.printers.read">
              <CraftPrinters />
            </PermissionGate>
          }
        />
        <Route
          path="craft/materials/*"
          element={
            <PermissionGate permission="craft.materials.read">
              <CraftMaterials />
            </PermissionGate>
          }
        />
        <Route path="craft/finance/*" element={<PermissionGate permission="craft.finance.read"><CraftFinance /></PermissionGate>} />
        <Route
          path="craft/customers/*"
          element={
            <PermissionGate permission="craft.customers.read">
              <CraftCustomers />
            </PermissionGate>
          }
        />
        <Route
          path="craft/partners"
          element={<Navigate to="/app/craft/customers/partners" replace />}
        />
        <Route
          path="craft/procurement/*"
          element={
            <PermissionGate permission="craft.procurement.read">
              <CraftProcurement />
            </PermissionGate>
          }
        />
        <Route path="craft/analytics/*" element={<PermissionGate permission="craft.analytics.read"><CraftAnalytics /></PermissionGate>} />
        <Route
          path="craft/marketplace/*"
          element={
            <PermissionGate permission="craft.marketplace.read">
              <CraftMarketplace />
            </PermissionGate>
          }
        />
        <Route path="craft/automations/*" element={<PermissionGate permission="craft.automations.read"><CraftAutomations /></PermissionGate>} />
        <Route
          path="studio/projects/*"
          element={
            <PermissionGate permission="studio.projects.read">
              <StudioProjects />
            </PermissionGate>
          }
        />
        <Route
          path="studio/clients/*"
          element={
            <PermissionGate permission="studio.clients.read">
              <StudioClients />
            </PermissionGate>
          }
        />
        <Route
          path="studio/services/*"
          element={
            <PermissionGate permission="studio.services.read">
              <StudioServices />
            </PermissionGate>
          }
        />
        <Route
          path="studio/equipment/*"
          element={
            <PermissionGate permission="studio.equipment.read">
              <StudioEquipment />
            </PermissionGate>
          }
        />
        <Route
          path="studio/billing/*"
          element={
            <PermissionGate permission="studio.billing.read">
              <StudioBilling />
            </PermissionGate>
          }
        />
        <Route path="studio/vendors/*" element={<PermissionGate permission="studio.vendors.read"><StudioVendors /></PermissionGate>} />
        <Route
          path="studio/finance/*"
          element={
            <PermissionGate permission="studio.finance.read">
              <StudioFinance />
            </PermissionGate>
          }
        />
        <Route
          path="studio/analytics"
          element={
            <PlannedModulePage
              title="Laporan & Analitik"
              description="Metrik performa studio."
              stage="Lanjutan"
              icon={FileText}
            />
          }
        />
        <Route
          path="studio/automations"
          element={
            <PlannedModulePage
              title="Otomasi"
              description="Otomasi alur kerja studio."
              stage="Lanjutan"
              icon={FileText}
            />
          }
        />
        <Route
          path="*"
          element={
            <PlannedModulePage
              title="Dalam Pengembangan"
              description="Modul ini direncanakan untuk pembaruan mendatang."
              stage="Tahap Berikutnya"
              icon={FileText}
            />
          }
        />
      </Route>
    </>,
  ),
);

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <RouterProvider router={router} />
      </WorkspaceProvider>
    </AuthProvider>
  );
}
