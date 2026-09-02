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
import { Notifications } from "./pages/global/Notifications";
import { AuditLog } from "./pages/global/AuditLog";
import { Documents } from "./pages/global/Documents";
import { CalendarTasks } from "./pages/global/CalendarTasks";
import { UnifiedFinance } from "./pages/global/UnifiedFinance";
import { MasterData } from "./pages/global/MasterData";
import { Reports } from "./pages/global/Reports";
import { Settings as SettingsPage } from "./pages/global/Settings";
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
import { StudioAnalytics } from "./pages/studio/Analytics";
import { StudioAutomations } from "./pages/studio/Automations";
import { GlobalAutomations } from "./pages/global/automations/GlobalAutomations";
import { Integrations } from "./pages/global/integrations/Integrations";
import { PlannedModulePage } from "./components/common/PlannedModulePage";
import {
  FileText,
  Wallet,
  Settings,
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
        <Route path="dashboard" element={<PermissionGate permission="dashboard.read"><Dashboard /></PermissionGate>} />
        <Route path="finance" element={<PermissionGate permission="finance.read"><UnifiedFinance /></PermissionGate>} />
        <Route path="master-data" element={<PermissionGate permission="master_data.read"><MasterData /></PermissionGate>} />
        <Route path="reports" element={<PermissionGate permission="reports.read"><Reports /></PermissionGate>} />
        <Route
          path="documents"
          element={<PermissionGate permission="documents.read"><Documents /></PermissionGate>}
        />
        <Route path="calendar" element={<PermissionGate permission="calendar.read"><CalendarTasks /></PermissionGate>} />
        <Route
          path="settings"
          element={
            <PermissionGate permission="settings.manage"><SettingsPage /></PermissionGate>
          }
        />
        <Route path="notifications" element={<Notifications />} />
        <Route
          path="users"
          element={
            <PermissionGate permission="users.manage">
              <UsersManagement />
            </PermissionGate>
          }
        />
        <Route path="profile" element={<Profile />} />
        <Route path="automations/*" element={<PermissionGate anyOf={["craft.automations.read", "studio.automations.read"]}><GlobalAutomations /></PermissionGate>} />
        <Route path="integrations/*" element={<PermissionGate permission="integrations.read"><Integrations /></PermissionGate>} />
        <Route
          path="audit-log"
          element={<PermissionGate permission="audit.read"><AuditLog /></PermissionGate>}
        />
        <Route path="craft/orders/*" element={<PermissionGate permission="craft.orders.read"><CraftOrders /></PermissionGate>} />
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
          path="studio/analytics/*"
          element={
            <PermissionGate permission="studio.analytics.read">
              <StudioAnalytics />
            </PermissionGate>
          }
        />
        <Route path="studio/automations/*" element={<PermissionGate permission="studio.automations.read"><StudioAutomations /></PermissionGate>} />
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
