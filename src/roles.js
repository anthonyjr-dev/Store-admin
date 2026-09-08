// Central definition of storeadmin (merchant portal) user roles.
//
// `user_type` (integer, returned by the API in `user.user_type`) is the role
// discriminator. The portal API (`POST /auth/dashboard/login`) only lets
// `user_type >= 2` sign in.
//
//   1  CUSTOMER      Mobile-app customer. Not a real portal role.
//   2  BRANCH_ADMIN  Scoped to a single branch (`user.branch_id`). Sees only that
//                    branch's orders (enforced server-side). No Branches/Users nav.
//                    Does NOT receive kiosk orders.
//   3  SUPER_ADMIN   Full access: every page, every branch's data, kiosk orders,
//                    branch + user management. Has no `branch_id`.
//   4  ADMIN         Same DATA access as SUPER_ADMIN (all branches, kiosk orders,
//                    can cancel orders) but NAVIGATION is limited to
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

// Pages a ROLE.ADMIN user may open. Anything else is hidden from the nav and
// blocked from rendering even if reached programmatically.
export const ADMIN_ALLOWED_PAGES = ['orders', 'notifications', 'reports'];

// user_type values allowed to sign in to the merchant portal.
export const PORTAL_ROLES = [
  ROLE.CUSTOMER,
  ROLE.BRANCH_ADMIN,
  ROLE.SUPER_ADMIN,
  ROLE.ADMIN,
];

// Roles that see every branch's data (no branch scoping) and kiosk orders.
export function canReceiveKioskOrders(userType) {
  return Number(userType) >= ROLE.SUPER_ADMIN;
}

// True for the navigation-restricted ADMIN role.
export function isRestrictedAdmin(userType) {
  return Number(userType) === ROLE.ADMIN;
}

// True for full-access roles (Super Admin, or the branchless legacy case).
export function isSuperAdmin(session) {
  const type = Number(session?.user_type);
  if (isRestrictedAdmin(type)) return false;
  return type === ROLE.SUPER_ADMIN || session?.branch_id == null;
}
