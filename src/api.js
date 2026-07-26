const BASE = 'https://apigateway.webtour.ph';

async function apiFetch(path, token, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || data?.detail || 'Request failed';
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data;
}

export function fetchAllOrders(token) {
  return apiFetch('/orders/admin/all', token);
}

export function updateOrderStatus(id, status, token) {
  return apiFetch(`/orders/${id}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
