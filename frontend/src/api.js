import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({ baseURL: BASE });

// Inject parent session token if present
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('parentToken');
  if (token) cfg.headers['x-session-token'] = token;
  return cfg;
});

export default api;

/* ── Children ── */
export const getChildren    = ()       => api.get('/api/children').then(r => r.data);
export const createChild    = (data)   => api.post('/api/children', data).then(r => r.data);
export const updateChild    = (id, d)  => api.patch(`/api/children/${id}`, d).then(r => r.data);
export const adjustPoints   = (id, d)  => api.patch(`/api/children/${id}/points`, d).then(r => r.data);
export const deleteChild    = (id)     => api.delete(`/api/children/${id}`).then(r => r.data);

/* ── Tasks ── */
export const getTasks       = (params) => api.get('/api/tasks', { params }).then(r => r.data);
export const completeTask   = (id)     => api.post(`/api/tasks/${id}/complete`).then(r => r.data);
export const uncompleteTask = (id)     => api.post(`/api/tasks/${id}/uncomplete`).then(r => r.data);
export const createTask     = (data)   => api.post('/api/tasks', data).then(r => r.data);
export const updateTask     = (id, d)  => api.patch(`/api/tasks/${id}`, d).then(r => r.data);
export const deleteTask     = (id)     => api.delete(`/api/tasks/${id}`).then(r => r.data);

/* ── Templates ── */
export const getTemplates   = (params) => api.get('/api/templates', { params }).then(r => r.data);
export const createTemplate = (data)   => api.post('/api/templates', data).then(r => r.data);
export const updateTemplate = (id, d)  => api.patch(`/api/templates/${id}`, d).then(r => r.data);
export const deleteTemplate = (id)     => api.delete(`/api/templates/${id}`).then(r => r.data);

/* ── Rewards ── */
export const getRewards     = ()       => api.get('/api/rewards').then(r => r.data);
export const getAllRewards   = ()       => api.get('/api/rewards/all').then(r => r.data);
export const createReward   = (data)   => api.post('/api/rewards', data).then(r => r.data);
export const updateReward   = (id, d)  => api.patch(`/api/rewards/${id}`, d).then(r => r.data);
export const deleteReward   = (id)     => api.delete(`/api/rewards/${id}`).then(r => r.data);

/* ── Purchases ── */
export const getPurchases   = (params) => api.get('/api/purchases', { params }).then(r => r.data);
export const buyReward      = (data)   => api.post('/api/purchases', data).then(r => r.data);
export const approvePurchase= (id, d)  => api.patch(`/api/purchases/${id}/approve`, d).then(r => r.data);
export const rejectPurchase = (id, d)  => api.patch(`/api/purchases/${id}/reject`, d).then(r => r.data);
export const redeemPurchase = (id)     => api.patch(`/api/purchases/${id}/redeem`).then(r => r.data);

/* ── Auth ── */
export const unlockParent   = (payload) => api.post('/api/auth/unlock', { payload }).then(r => r.data);
export const verifySession  = (token)   => api.post('/api/auth/verify', { sessionToken: token }).then(r => r.data);
export const logoutParent   = (token)   => api.post('/api/auth/logout', { sessionToken: token }).then(r => r.data);
export const getQRCodes     = ()        => api.get('/api/auth/qr-codes').then(r => r.data);

/* ── Stats ── */
export const getOverview    = ()       => api.get('/api/stats/overview').then(r => r.data);
export const getChildStats  = (id, days) => api.get(`/api/stats/child/${id}`, { params: { days } }).then(r => r.data);
