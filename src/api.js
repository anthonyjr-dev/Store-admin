const BASE = 'https://api.butfirstcoffee.ph';

let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

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

  if (res.status === 401 || res.status === 403) {
    if (onUnauthorized) onUnauthorized();
    const msg = data?.message || data?.error || data?.detail || 'Session expired. Please log in again.';
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
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

export function updateOrderStatus(id, status, token, notes) {
  return apiFetch(`/orders/${id}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...(notes !== undefined ? { notes } : {}) }),
  });
}

export function confirmOrderPayment(id, token) {
  return apiFetch(`/orders/${id}/confirm-payment`, token, {
    method: 'POST',
  });
}

export function fetchProducts(category, branch_id) {
  const params = new URLSearchParams();
  if (category && category !== 'All') params.set('category', category);
  if (branch_id) params.set('branch_id', String(branch_id));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch(`/products${qs}`);
}

export function fetchStores() {
  return apiFetch('/stores');
}

export function fetchBranches(store_id) {
  const qs = store_id ? `?store_id=${store_id}` : '';
  return apiFetch(`/branches${qs}`);
}

export function createBranch(data, token) {
  return apiFetch('/branches', token, { method: 'POST', body: JSON.stringify(data) });
}

export function updateBranch(id, data, token) {
  return apiFetch(`/branches/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteBranch(id, token) {
  return apiFetch(`/branches/${id}`, token, { method: 'DELETE' });
}

export function fetchUsers(page = 1, limit = 20, name, token) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (name) params.set('name', name);
  return apiFetch(`/users?${params}`, token);
}

export function updateUser(id, data, token) {
  return apiFetch(`/users/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export function createUser(data, token) {
  return apiFetch('/users', token, { method: 'POST', body: JSON.stringify(data) });
}

export function createProduct(data, token) {
  return apiFetch('/products', token, { method: 'POST', body: JSON.stringify(data) });
}

export function updateProduct(id, data, token) {
  return apiFetch(`/products/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteProduct(id, token) {
  return apiFetch(`/products/${id}`, token, { method: 'DELETE' });
}

export async function uploadProductImage(file, token) {
  const form = new FormData();
  form.append('file', file);
  form.append('file_type', 'image');
  form.append('module_id', '1001');
  form.append('file_name', file.name);
  form.append('folder_src', 'products');

  const res = await fetch(`${BASE}/file-upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!res.ok) {
    const msg = data?.message || data?.error || 'Upload failed';
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  const filePath = data.data.file_path;
  const parts = filePath.split(/[/\\]uploads[/\\]/);
  const relative = parts[parts.length - 1].replace(/\\/g, '/');
  return `${BASE}/uploads/${relative}`;
}
