// Central definition of storeadmin (merchant portal) user roles.
//
// `user_type` (integer, from the API in `user.user_type`) is the role
// discriminator. The portal API (`POST /auth/dashboard/login`) only lets
// `user_type >= 2` sign in.
//
//   1  CUSTOMER      Mobile-app customer. Not a real portal role.
//   2  BRANCH_ADMIN  Scoped to a single branch (`user.branch_id`). Nav limited to
//                    BRANCH_ADMIN_ALLOWED_PAGES. Does NOT receive kiosk orders.
//   3  SUPER_ADMIN   Full access: every page, every branch, kiosk orders, branch
//                    + user management. Has no `branch_id`.
//   4  ADMIN         Same DATA access as SUPER_ADMIN in Orders (all branches,
//                    kiosk orders, can cancel), but NAV limited to
//                    ADMIN_ALLOWED_PAGES. Created with no branch.

export const ROLE = {
  CUSTOMER: 1,
  BRANCH_ADMIN: 2,
  SUPER_ADMIN: 3,
  ADMIN: 4,
};

export const ROLE_LABELS = {
  [ROLE.CUSTOMER]: 'Customer',
  [ROLE.BRANCH_ADMIN]: 'Branch Admin',
  [ROLE.SUPER_ADMIN]: 'Super Admin',
  [ROLE.ADMIN]: 'Admin',
};

// Nav pages each restricted role may open. Anything else is hidden from the nav
// and blocked from rendering even if reached programmatically. `null` = all pages.
export const ADMIN_ALLOWED_PAGES = ['orders', 'products', 'reports', 'notifications'];
export const BRANCH_ADMIN_ALLOWED_PAGES = ['orders', 'products', 'notifications'];

// user_type values allowed to sign in to the merchant portal.
export const PORTAL_ROLES = [
  ROLE.CUSTOMER,
  ROLE.BRANCH_ADMIN,
  ROLE.SUPER_ADMIN,
  ROLE.ADMIN,
];

// Roles that see every branch's data (no branch scoping) and kiosk orders.
// Super Admin (3) and Admin (4).
export function canReceiveKioskOrders(userType) {
  return Number(userType) >= ROLE.SUPER_ADMIN;
}

export function isRestrictedAdmin(userType) {
  return Number(userType) === ROLE.ADMIN;
}

export function isBranchAdmin(userType) {
  return Number(userType) === ROLE.BRANCH_ADMIN;
}

// True for full-access Super Admin (or the branchless legacy case).
export function isSuperAdmin(session) {
  const type = Number(session?.user_type);
  if (type === ROLE.ADMIN || type === ROLE.BRANCH_ADMIN) return false;
  return type === ROLE.SUPER_ADMIN || session?.branch_id == null;
}

// Pages the given session may open, or `null` when unrestricted (Super Admin).
export function allowedPages(session) {
  const type = Number(session?.user_type);
  if (type === ROLE.ADMIN) return ADMIN_ALLOWED_PAGES;
  if (type === ROLE.BRANCH_ADMIN) return BRANCH_ADMIN_ALLOWED_PAGES;
  return null;
}
