import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Printer,
  Box,
  Layers,
  Wallet,
  Users,
  FolderKanban,
  Briefcase,
  FileText,
  Settings,
  Bell,
  Calendar,
  ChevronRight,
  ArrowRightLeft,
  FileArchive,
  ShieldAlert,
  Zap,
  Database,
  Network,
  PackageSearch,
  HardDrive,
  CircleDollarSign,
} from "lucide-react";

interface NavSubItem {
  name: string;
  path: string;
}

interface NavItem {
  name: string;
  icon: React.ElementType;
  path: string;
  subItems?: NavSubItem[];
  permission?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const craftNav: NavGroup[] = [
  {
    label: "GLOBAL",
    items: [
      { name: "Dasbor Global", icon: LayoutDashboard, path: "/app/dashboard" },
    ],
  },
  {
    label: "OPERASIONAL",
    items: [
      {
        name: "Pesanan",
        icon: ShoppingCart,
        path: "/app/craft/orders",
        subItems: [
          { name: "Semua Pesanan", path: "/app/craft/orders" },
          { name: "Pesanan Baru", path: "/app/craft/orders/new" },
          { name: "Draf Pesanan", path: "/app/craft/orders/drafts" },
          { name: "Prioritas Produksi", path: "/app/craft/orders/priority" },
          { name: "Antrean Produksi", path: "/app/craft/orders/queue" },
          { name: "Pesanan Custom", path: "/app/craft/orders/custom" },
          { name: "Pesanan Mitra", path: "/app/craft/orders/partners" },
          { name: "Pesanan Selesai", path: "/app/craft/orders/completed" },
          {
            name: "Dibatalkan / Dikembalikan",
            path: "/app/craft/orders/cancelled",
          },
        ],
      },
      {
        name: "Produksi",
        icon: Layers,
        path: "/app/craft/production",
        permission: "craft.production.read",
        subItems: [
          { name: "Papan Produksi", path: "/app/craft/production" },
          { name: "Produksi Aktif", path: "/app/craft/production/active" },
          { name: "Antrean Cetak", path: "/app/craft/production/queue" },
          { name: "Pekerjaan Cetak", path: "/app/craft/production/jobs" },
          { name: "Cetak Gagal", path: "/app/craft/production/failures" },
          { name: "Kontrol Kualitas", path: "/app/craft/production/qc" },
          { name: "Kalender Produksi", path: "/app/craft/production/calendar" },
        ],
      },
      {
        name: "Produk & Desain",
        icon: PackageSearch,
        path: "/app/craft/products",
        permission: "craft.products.read",
        subItems: [
          { name: "Katalog Produk", path: "/app/craft/products" },
          {
            name: "Pustaka Desain 3D",
            path: "/app/craft/products/design-library",
          },
          { name: "Profil Cetak", path: "/app/craft/products/print-profiles" },
          {
            name: "Biaya & Penetapan Harga",
            path: "/app/craft/products/cost-pricing",
          },
        ],
      },
      {
        name: "Printer",
        icon: Printer,
        path: "/app/craft/printers",
        permission: "craft.printers.read",
        subItems: [
          { name: "Daftar Printer", path: "/app/craft/printers" },
          { name: "Aktivitas Saat Ini", path: "/app/craft/printers/activity" },
          { name: "Riwayat Cetak", path: "/app/craft/printers/history" },
          { name: "Perawatan", path: "/app/craft/printers/maintenance" },
          { name: "Masalah Printer", path: "/app/craft/printers/issues" },
        ],
      },
      {
        name: "Material",
        icon: Box,
        path: "/app/craft/materials",
        permission: "craft.materials.read",
        subItems: [
          {
            name: "Inventaris Filament",
            path: "/app/craft/materials/filament",
          },
          { name: "Spool Filament", path: "/app/craft/materials/spools" },
          { name: "Pergerakan Stok", path: "/app/craft/materials/movements" },
          { name: "Stok Menipis", path: "/app/craft/materials/low-stock" },
          { name: "Limbah Filament", path: "/app/craft/materials/waste" },
        ],
      },
    ],
  },
  {
    label: "BISNIS",
    items: [
      {
        name: "Pelanggan & Mitra",
        icon: Users,
        path: "/app/craft/customers",
        permission: "craft.customers.read",
        subItems: [
          { name: "Pelanggan", path: "/app/craft/customers" },
          { name: "Mitra", path: "/app/craft/customers/partners" },
        ],
      },
      {
        name: "Pengadaan",
        icon: PackageSearch,
        path: "/app/craft/procurement",
        permission: "craft.procurement.read",
        subItems: [
          { name: "Ringkasan Pengadaan", path: "/app/craft/procurement" },
          { name: "Pemasok", path: "/app/craft/procurement/suppliers" },
          {
            name: "Permintaan Pembelian",
            path: "/app/craft/procurement/requests",
          },
          { name: "Pesanan Pembelian", path: "/app/craft/procurement/orders" },
          {
            name: "Penerimaan Barang",
            path: "/app/craft/procurement/receipts",
          },
          { name: "Tagihan Pemasok", path: "/app/craft/procurement/invoices" },
          { name: "Riwayat Pengadaan", path: "/app/craft/procurement/history" },
        ],
      },
      {
        name: "Keuangan",
        icon: CircleDollarSign,
        path: "/app/craft/finance",
        permission: "craft.finance.read",
        subItems: [
          { name: "Ringkasan Keuangan", path: "/app/craft/finance" },
          { name: "Transaksi", path: "/app/craft/finance/transactions" },
          { name: "Kas & Bank", path: "/app/craft/finance/treasury" },
          { name: "Pendapatan", path: "/app/craft/finance/income" },
          { name: "Pengeluaran", path: "/app/craft/finance/expenses" },
          { name: "Piutang Pelanggan", path: "/app/craft/finance/receivables" },
          { name: "Hutang Pemasok", path: "/app/craft/finance/payables" },
          { name: "HPP & Profitabilitas", path: "/app/craft/finance/profitability" },
          {
            name: "Kalkulator Biaya Produk",
            path: "/app/craft/finance/calculator",
          },
          { name: "Arus Kas", path: "/app/craft/finance/cash-flow" },
          { name: "Anggaran", path: "/app/craft/finance/budgets" },
          { name: "Jurnal & Periode", path: "/app/craft/finance/accounting" },
        ],
      },
      {
        name: "Laporan & Analitik",
        icon: LayoutDashboard,
        path: "/app/craft/analytics",
        permission: "craft.analytics.read",
        subItems: [
          { name: "Ringkasan Analitik", path: "/app/craft/analytics" },
          { name: "Penjualan", path: "/app/craft/analytics/sales" },
          { name: "Pesanan", path: "/app/craft/analytics/orders" },
          { name: "Produk", path: "/app/craft/analytics/products" },
          { name: "Kanal Penjualan", path: "/app/craft/analytics/channels" },
          { name: "Pelanggan & Mitra", path: "/app/craft/analytics/customers" },
          { name: "Produksi", path: "/app/craft/analytics/production" },
          { name: "Printer", path: "/app/craft/analytics/printers" },
          { name: "Material", path: "/app/craft/analytics/materials" },
          { name: "Pengadaan", path: "/app/craft/analytics/procurement" },
          { name: "Profitabilitas", path: "/app/craft/analytics/profitability" },
        ],
      },
    ],
  },
  {
    label: "SISTEM",
    items: [
      {
        name: "Marketplace & Kanal Penjualan",
        icon: Network,
        path: "/app/craft/marketplace",
        permission: "craft.marketplace.read",
        subItems: [
          { name: "Ringkasan Kanal", path: "/app/craft/marketplace" },
          { name: "Kanal Penjualan", path: "/app/craft/marketplace/channels" },
          { name: "Impor Pesanan", path: "/app/craft/marketplace/import" },
          { name: "Pemetaan Produk", path: "/app/craft/marketplace/products" },
          { name: "Aturan Biaya", path: "/app/craft/marketplace/fees" },
          { name: "Settlement Marketplace", path: "/app/craft/marketplace/settlements" },
          { name: "Integrasi Marketplace", path: "/app/craft/marketplace/integrations" },
          { name: "Riwayat Sinkronisasi", path: "/app/craft/marketplace/sync-history" },
        ],
      },
      {
        name: "Otomasi", icon: Zap, path: "/app/craft/automations", permission: "craft.automations.read",
        subItems: [
          { name: "Ringkasan Otomasi", path: "/app/craft/automations" },
          { name: "Aturan Otomasi", path: "/app/craft/automations/rules" },
          { name: "Template Otomasi", path: "/app/craft/automations/templates" },
          { name: "Riwayat Eksekusi", path: "/app/craft/automations/runs" },
          { name: "Pemicu & Aksi", path: "/app/craft/automations/catalog" },
        ],
      },
    ],
  },
];

const studioNav: NavGroup[] = [
  {
    label: "GLOBAL",
    items: [
      { name: "Dasbor Global", icon: LayoutDashboard, path: "/app/dashboard" },
    ],
  },
  {
    label: "OPERASIONAL",
    items: [
      {
        name: "Proyek",
        icon: FolderKanban,
        path: "/app/studio/projects",
        permission: "studio.projects.read",
        subItems: [
          { name: "Semua Proyek", path: "/app/studio/projects" },
          { name: "Proyek Aktif", path: "/app/studio/projects/active" },
          { name: "Proyek Baru", path: "/app/studio/projects/new" },
          { name: "Tahapan Proyek", path: "/app/studio/projects/milestones" },
        ],
      },
      { name: "Klien", icon: Users, path: "/app/studio/clients", permission: "studio.clients.read" },
      {
        name: "Layanan", icon: Briefcase, path: "/app/studio/services", permission: "studio.services.read",
        subItems: [
          { name: "Katalog Layanan", path: "/app/studio/services" },
          { name: "Kategori Layanan", path: "/app/studio/services/categories" },
          { name: "Paket Layanan", path: "/app/studio/services/packages" },
        ],
      },
      {
        name: "Peralatan & Aset",
        icon: HardDrive,
        path: "/app/studio/equipment",
        permission: "studio.equipment.read",
        subItems: [
          { name: "Ringkasan Aset", path: "/app/studio/equipment" },
          { name: "Daftar Peralatan", path: "/app/studio/equipment/assets" },
          { name: "Jadwal Penggunaan", path: "/app/studio/equipment/assignments" },
          { name: "Perawatan", path: "/app/studio/equipment/maintenance" },
        ],
      },
    ],
  },
  {
    label: "BISNIS",
    items: [
      {
        name: "Penawaran & Penagihan",
        icon: FileText,
        path: "/app/studio/billing",
        permission: "studio.billing.read",
        subItems: [
          { name: "Penawaran", path: "/app/studio/billing/quotations" },
          { name: "Invoice", path: "/app/studio/billing/invoices" },
          {
            name: "Tagihan Belum Dibayar",
            path: "/app/studio/billing/outstanding",
          },
        ],
      },
      {
        name: "Vendor / Freelancer / Mitra",
        icon: Users,
        path: "/app/studio/vendors",
        permission: "studio.vendors.read",
        subItems: [
          { name: "Semua Pihak", path: "/app/studio/vendors" },
          { name: "Vendor", path: "/app/studio/vendors/vendor" },
          { name: "Freelancer", path: "/app/studio/vendors/freelancers" },
          { name: "Mitra Studio", path: "/app/studio/vendors/partners" },
          { name: "Penugasan", path: "/app/studio/vendors/assignments" },
        ],
      },
      {
        name: "Keuangan",
        icon: CircleDollarSign,
        path: "/app/studio/finance",
        subItems: [
          { name: "Ringkasan Keuangan", path: "/app/studio/finance" },
          { name: "Transaksi", path: "/app/studio/finance/transactions" },
        ],
      },
      {
        name: "Laporan & Analitik",
        icon: LayoutDashboard,
        path: "/app/studio/analytics",
      },
    ],
  },
  {
    label: "SISTEM",
    items: [{ name: "Otomasi", icon: Zap, path: "/app/studio/automations" }],
  },
];

const globalToolsNav: NavGroup = {
  label: "FITUR GLOBAL",
  items: [
    { name: "Keuangan Terpadu", icon: Wallet, path: "/app/finance" },
    { name: "Pusat Dokumen", icon: FileArchive, path: "/app/documents" },
    { name: "Kalender & Tugas", icon: Calendar, path: "/app/calendar" },
    { name: "Notifikasi", icon: Bell, path: "/app/notifications" },
    {
      name: "Manajemen Pengguna",
      icon: Users,
      path: "/app/users",
      permission: "users.manage",
    },
    { name: "Log Audit", icon: ShieldAlert, path: "/app/audit-log" },
    { name: "Integrasi", icon: Network, path: "/app/integrations" },
    { name: "Pusat Otomasi", icon: Zap, path: "/app/automations" },
    { name: "Pusat Laporan", icon: LayoutDashboard, path: "/app/reports" },
    { name: "Data Master", icon: Database, path: "/app/master-data" },
    { name: "Pengaturan", icon: Settings, path: "/app/settings" },
  ],
};

const SidebarItem: React.FC<{ item: NavItem }> = ({ item }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActive =
    location.pathname === item.path ||
    location.pathname.startsWith(`${item.path}/`);

  useEffect(() => {
    if (isActive) setIsOpen(true);
  }, [isActive]);

  const hasSubItems = item.subItems && item.subItems.length > 0;

  if (hasSubItems) {
    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full text-left flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors",
            isActive
              ? "bg-[var(--nexus-cream-soft)] text-[var(--nexus-yellow-deep)]"
              : "text-[var(--nexus-charcoal)] hover:bg-gray-50",
          )}
        >
          <div className="flex items-center gap-3">
            <item.icon className="w-4 h-4" />
            {item.name}
          </div>
          <ChevronRight
            className={cn(
              "w-4 h-4 transition-transform",
              isOpen && "rotate-90",
            )}
          />
        </button>
        {isOpen && (
          <div className="pl-9 space-y-1 mt-1">
            {item.subItems!.map((subItem) => (
              <NavLink
                key={subItem.path}
                to={subItem.path}
                end={subItem.path === item.path}
                className={({ isActive }) =>
                  cn(
                    "block px-3 py-1.5 rounded-md text-sm transition-colors",
                    isActive
                      ? "text-[var(--nexus-yellow-deep)] font-semibold"
                      : "text-gray-500 hover:text-[var(--nexus-charcoal)] hover:bg-gray-50",
                  )
                }
              >
                {subItem.name}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          isActive
            ? "bg-[var(--nexus-cream-soft)] text-[var(--nexus-yellow-deep)]"
            : "text-[var(--nexus-charcoal)] hover:bg-gray-50",
        )
      }
    >
      <item.icon className="w-4 h-4" />
      {item.name}
    </NavLink>
  );
};

export function Sidebar() {
  const { activeWorkspace } = useWorkspace();
  const { hasPermission } = useAuth();
  const navGroups = activeWorkspace === "craft" ? craftNav : studioNav;

  return (
    <aside className="w-64 bg-white border-r border-[var(--nexus-border)] flex flex-col h-full shrink-0">
      <div className="h-16 flex items-center px-6">
        <h1 className="font-['Techniqo'] font-bold text-2xl tracking-widest text-[#E5B800]">
          UNI-NEXUS
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-4 space-y-8">
        {navGroups.map((group) => (
          <div key={group.label}>
            <h3 className="px-3 text-xs font-semibold text-[var(--nexus-muted)] tracking-wider mb-2">
              {group.label}
            </h3>
            <div className="space-y-1">
              {group.items
                .filter(
                  (item) => !item.permission || hasPermission(item.permission),
                )
                .map((item) => (
                  <SidebarItem key={item.name} item={item} />
                ))}
            </div>
          </div>
        ))}

        <div>
          <h3 className="px-3 text-xs font-semibold text-[var(--nexus-muted)] tracking-wider mb-2 mt-4">
            {globalToolsNav.label}
          </h3>
          <div className="space-y-1">
            {globalToolsNav.items.map((item) => {
              if (item.permission && !hasPermission(item.permission))
                return null;
              return <SidebarItem key={item.name} item={item} />;
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
