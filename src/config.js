// Base URL of the BFC API. Set `VITE_API_URL` in `.env` to point staging /
// local builds at a different backend; falls back to production.
export const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, '') || 'https://api.bfc.net.ph';
