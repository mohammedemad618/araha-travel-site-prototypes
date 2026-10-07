// Roles and what each may do. Checked on the server for every page and action;
// the interface only hides what a role cannot use.

export const permissions = [
  'leads.read',
  'leads.write',
  'quotes.read',
  'quotes.write',
  'customers.read',
  'customers.write',
  'bookings.read',
  'bookings.write',
  'inventory.write',
  // Editing what the public website shows: trip programs, visas, destinations and images.
  'website.write',
  'finance.read',
  'finance.write',
  'suppliers.read',
  'suppliers.write',
  'visas.read',
  'visas.write',
  'reports.read',
  'accounting.read',
  'accounting.write',
  'settings.manage',
  'users.manage',
  'audit.read',
  // Downloading whole lists (customers, payments…) is limited: it is the easiest way for data to leave.
  'data.export',
] as const;
export type Permission = (typeof permissions)[number];

export const tenantRoles = ['owner', 'manager', 'sales', 'accountant', 'operations', 'viewer'] as const;
export type TenantRole = (typeof tenantRoles)[number];
export type Role = TenantRole | 'platform';

const ALL = new Set<Permission>(permissions);
const READ = new Set<Permission>(permissions.filter((p) => p.endsWith('.read')));

const ROLE_PERMISSIONS: Record<TenantRole, Set<Permission>> = {
  owner: ALL,
  manager: new Set(permissions.filter((p) => p !== 'users.manage')),
  sales: new Set<Permission>([
    'leads.read',
    'leads.write',
    'quotes.read',
    'quotes.write',
    'customers.read',
    'customers.write',
    'bookings.read',
    'bookings.write',
    'visas.read',
    'visas.write',
    'finance.read',
  ]),
  accountant: new Set<Permission>([
    'accounting.read',
    'accounting.write',
    'quotes.read',
    'customers.read',
    'bookings.read',
    'finance.read',
    'finance.write',
    'suppliers.read',
    'suppliers.write',
    'reports.read',
    'data.export',
  ]),
  operations: new Set<Permission>([
    'quotes.read',
    'customers.read',
    'customers.write',
    'bookings.read',
    'bookings.write',
    'inventory.write',
    'website.write',
    'suppliers.read',
    'visas.read',
    'visas.write',
  ]),
  viewer: new Set([...READ].filter((p) => p !== 'audit.read')),
};

export function can(role: Role, permission: Permission): boolean {
  if (role === 'platform') return true;
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export function permissionsFor(role: Role): Permission[] {
  return permissions.filter((p) => can(role, p));
}
