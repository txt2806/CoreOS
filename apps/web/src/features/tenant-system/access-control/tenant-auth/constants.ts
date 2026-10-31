/**
 * Catalog key of this branch. The login routes themselves are `@Public()` in the
 * controller; this key guards the sign-in screen in the permission matrix.
 */
export const FEATURE_KEY = "tenant-system/access-control/tenant-auth";

/** Field limits come from `loginSchema` / `passwordChangeSchema`. */
export const MAX_USERNAME_LENGTH = 80;
export const MAX_PASSWORD_LENGTH = 72;
export const MIN_PASSWORD_LENGTH = 8;

export const SESSION_COOKIE_NOTE =
  "Phiên làm việc dùng cookie HttpOnly và tự đóng khi hết thời gian không hoạt động.";
