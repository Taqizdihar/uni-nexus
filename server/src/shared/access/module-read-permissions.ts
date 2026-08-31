/** Canonical source-module to read-permission mapping shared by cross-module features. */
export const moduleReadPermissions: Record<string, string> = {
  craft_orders: 'craft.orders.read', craft_production: 'craft.production.read', craft_products: 'craft.products.read',
  craft_printers: 'craft.printers.read', craft_materials: 'craft.materials.read', craft_customers: 'craft.customers.read',
  craft_finance: 'craft.finance.read', craft_procurement: 'craft.procurement.read', craft_marketplace: 'craft.marketplace.read',
  craft_analytics: 'craft.analytics.read', craft_automations: 'craft.automations.read',
  studio_projects: 'studio.projects.read', studio_clients: 'studio.clients.read', studio_services: 'studio.services.read',
  studio_equipment: 'studio.equipment.read', studio_billing: 'studio.billing.read', studio_vendors: 'studio.vendors.read',
  studio_finance: 'studio.finance.read', studio_analytics: 'studio.analytics.read', studio_automations: 'studio.automations.read',
  documents: 'documents.read',
  reports: 'reports.read', finance: 'finance.read', dashboard: 'dashboard.read',
  master_data: 'master_data.read',
  calendar: 'calendar.read', tasks: 'tasks.read',
};

export const moduleReadPermissionFor = (moduleCode?: string | null, businessUnitCode = 'CRAFT') => {
  const normalized = String(moduleCode || '').trim().toLowerCase();
  if (normalized === 'automations') return String(businessUnitCode).toUpperCase() === 'STUDIO' ? 'studio.automations.read' : 'craft.automations.read';
  return moduleReadPermissions[normalized] || null;
};
