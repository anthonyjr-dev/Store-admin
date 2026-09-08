import axios from 'axios';

const API = axios.create({
  baseURL: 'https://api.bfc.net.ph',
  timeout: 15000,
});

export const bookLalamoveApi = (bfcOrderId, opts = {}) =>
  API.post(`/lalamove/orders/${bfcOrderId}/book`, opts).then((r) => r.data);

export const getLalamoveStatusApi = (bfcOrderId) =>
  API.get(`/lalamove/orders/${bfcOrderId}/status`).then((r) => r.data);

export const cancelLalamoveApi = (bfcOrderId) =>
  API.delete(`/lalamove/orders/${bfcOrderId}/cancel`).then((r) => r.data);
