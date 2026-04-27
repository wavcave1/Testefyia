const BASE_URL = import.meta.env.VITE_API_URL || 'https://efyia-book-backend.up.railway.app';

function getToken() {
  return localStorage.getItem('efyia_token');
}

async function request(method, path, body = null, requiresAuth = false) {
  const headers = { 'Content-Type': 'application/json' };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (requiresAuth) {
    throw Object.assign(new Error('Authentication required.'), { status: 401 });
  }

  const init = { method, headers };
  if (body !== null) {
    init.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, init);
  } catch {
    throw new Error('Unable to connect to the server. Please check your internet connection.');
  }

  if (response.status === 204) return null;

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Unexpected server response (${response.status}).`);
  }

  if (!response.ok) {
    const message = data?.error || data?.message || `Request failed with status ${response.status}.`;
    throw Object.assign(new Error(message), { status: response.status, details: data?.details });
  }

  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  signup: (data) => api.post('/api/auth/signup', data),
  login: (data) => api.post('/api/auth/login', data),
  me: () => api.get('/api/auth/me'),
};

// ─── Studios ─────────────────────────────────────────────────────────────────
export const studiosApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/api/studios${qs ? `?${qs}` : ''}`);
  },
  getById: (id) => api.get(`/api/studios/${id}`),
  getBySlug: (slug) => api.get(`/api/studios/slug/${slug}`),
  create: (data) => api.post('/api/studios', data),
  update: (id, data) => api.put(`/api/studios/${id}`, data),
  delete: (id) => api.delete(`/api/studios/${id}`),
};

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const bookingsApi = {
  list: () => api.get('/api/bookings'),
  getById: (id) => api.get(`/api/bookings/${id}`),
  create: (data) => api.post('/api/bookings', data),
  updateStatus: async (id, status) => {
    const response = await api.patch(`/api/bookings/${id}/status`, { status });
    const booking = response?.booking && typeof response.booking === 'object' ? response.booking : response;
    return {
      ...booking,
      requiresManualPayment: response?.requiresManualPayment ?? booking?.requiresManualPayment ?? false,
      finalPaymentDue: response?.finalPaymentDue ?? booking?.finalPaymentDue ?? null,
      autoChargeAttempted: response?.autoChargeAttempted ?? booking?.autoChargeAttempted ?? false,
    };
  },
};

// ─── Reviews ─────────────────────────────────────────────────────────────────
export const reviewsApi = {
  listByStudio: (studioId) => api.get(`/api/reviews?studioId=${studioId}`),
  create: (data) => api.post('/api/reviews', data),
  reply: (id, ownerReply) => api.patch(`/api/reviews/${id}/reply`, { ownerReply }),
  delete: (id) => api.delete(`/api/reviews/${id}`),
};

// ─── Favorites ────────────────────────────────────────────────────────────────
export const favoritesApi = {
  list: () => api.get('/api/favorites'),
  add: (studioId) => api.post('/api/favorites', { studioId }),
  remove: (studioId) => api.delete(`/api/favorites/${studioId}`),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => api.get('/api/users'),
  updateMe: (data) => api.patch('/api/users/me', data),
  changePassword: (data) => api.post('/api/users/me/change-password', data),
  adminUpdate: (id, data) => api.patch(`/api/users/${id}`, data),
};

// ─── Public studio pages (no auth required) ───────────────────────────────────
export const publicApi = {
  getStudioBySlug: (slug) => api.get(`/api/public/studios/${slug}`),
};

// ─── Studio profile (owner-scoped branding) ───────────────────────────────────
export const studioProfileApi = {
  get: (studioId) => api.get(`/api/studio/profile${studioId ? `?studioId=${studioId}` : ''}`),
  update: (data, studioId) => api.patch(`/api/studio/profile${studioId ? `?studioId=${studioId}` : ''}`, data),
};

// ─── Studio team (members + invites) ─────────────────────────────────────────
export const studioTeamApi = {
  list: (studioId) => api.get(`/api/studio/team${studioId ? `?studioId=${studioId}` : ''}`),
  invite: (email, role, studioId) => api.post('/api/studio/team/invite', { email, role, studioId }),
  updateRole: (memberId, role) => api.patch(`/api/studio/team/${memberId}`, { role }),
  remove: (memberId) => api.delete(`/api/studio/team/${memberId}`),
};

// ─── Invite accept (public) ───────────────────────────────────────────────────
export const inviteApi = {
  getInvite: (token) => api.get(`/api/invites/${token}`),
  accept: (token, data) => api.post(`/api/invites/${token}/accept`, data),
};

// ─── Stripe Connect & Payments ───────────────────────────────────────────────
export const stripeConnectApi = {
  onboard: (studioId) => api.post('/api/connect/onboard', { studioId }),
  refresh: (studioId) => api.post('/api/connect/refresh-link', { studioId }),
  status: (studioId) => api.get(`/api/connect/status/${studioId}`),
};

export const paymentsApi = {
  createIntent: (bookingId) => api.post('/api/payments/intents', { bookingId }),
  refund: (bookingId, reason) => api.post('/api/payments/refunds', { bookingId, reason }),
};


// ─── Admin (internal control plane) ──────────────────────────────────────────
export const adminApi = {
  dashboardSummary: () => api.get('/api/admin/dashboard'),

  listAccounts: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/api/admin/accounts${qs ? `?${qs}` : ''}`);
  },
  getAccount: (id) => api.get(`/api/admin/accounts/${id}`),
  createAccount: (data) => api.post('/api/admin/accounts', data),
  updateAccount: (id, data) => api.patch(`/api/admin/accounts/${id}`, data),
  deleteAccount: (id) => api.delete(`/api/admin/accounts/${id}`),
  resetAccountPassword: (id) => api.post(`/api/admin/accounts/${id}/reset-password`, {}),
  revokeAccountSessions: (id) => api.post(`/api/admin/accounts/${id}/revoke-sessions`, {}),
  enableOwnerProfile: (id, data = {}) => api.post(`/api/admin/accounts/${id}/enable-owner-profile`, data),

  listStudios: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/api/admin/studios${qs ? `?${qs}` : ''}`);
  },
  createStudio: (data) => api.post('/api/admin/studios', data),
  updateStudio: (id, data) => api.patch(`/api/admin/studios/${id}`, data),
  deleteStudio: (id) => api.delete(`/api/admin/studios/${id}`),

  listProfiles: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    return api.get(`/api/admin/profiles${qs ? `?${qs}` : ''}`);
  },
  createProfile: (data) => api.post('/api/admin/profiles', data),
  updateProfile: (id, data) => api.patch(`/api/admin/profiles/${id}`, data),
  deleteProfile: (id) => api.delete(`/api/admin/profiles/${id}`),

  listPermissions: () => api.get('/api/admin/permissions'),
  updatePermission: (id, data) => api.patch(`/api/admin/permissions/${id}`, data),
};

export const availabilityApi = {
  getSchedule: (studioId) => api.get('/api/availability/' + studioId + '/schedule'),
  updateSchedule: (studioId, days) => api.post('/api/availability/' + studioId + '/schedule', days),
  getBlocks: (studioId, from, to) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return api.get('/api/availability/' + studioId + '/blocks' + (qs ? '?' + qs : ''));
  },
  addBlock: (studioId, data) => api.post('/api/availability/' + studioId + '/blocks', data),
  deleteBlock: (studioId, blockId) => api.delete('/api/availability/' + studioId + '/blocks/' + blockId),
  check: (studioId, date, time, hours) =>
    api.get('/api/availability/' + studioId + '/check?date=' + encodeURIComponent(date) + '&time=' + encodeURIComponent(time) + '&hours=' + hours),
};

export const bookingFilesApi = {
  list: (bookingId) => api.get('/api/booking-files/' + bookingId + '/files'),
  delete: (bookingId, fileId) => api.delete('/api/booking-files/' + bookingId + '/files/' + fileId),
  upload: async (bookingId, file, onProgress) => {
    const token = localStorage.getItem('efyia_token');
    const fd = new FormData();
    fd.append('file', file);

    const res = await fetch(BASE_URL + '/api/booking-files/' + bookingId + '/files', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: fd,
    });

    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.error || 'Upload failed'), { status: res.status });
    return data;
  },
};

export const bookingMessagesApi = {
  list: (bookingId) => api.get('/api/booking-messages/' + bookingId + '/messages'),
  send: (bookingId, message) => api.post('/api/booking-messages/' + bookingId + '/messages', { message }),
};

export const analyticsApi = {
  studio: () => api.get('/api/analytics/studio'),
};

// ─── Email domains & forwarding aliases ─────────────────────────────────────
export const emailDomainsApi = {
  listDomains: () => api.get('/api/email/domains'),
  getDomain: (domainId) => api.get(`/api/email/domains/${domainId}`),
  createDomain: (data) => api.post('/api/email/domains', data),

  getDnsRecords: (domainId) => api.get(`/api/email/domains/${domainId}/dns-records`),
  verifyDomain: (domainId) => api.post(`/api/email/domains/${domainId}/verify`, {}),

  listAliases: (domainId) => api.get(`/api/email/domains/${domainId}/aliases`),
  createAlias: (domainId, data) => api.post(`/api/email/domains/${domainId}/aliases`, data),

  updateAlias: (aliasId, data) => api.patch(`/api/email/aliases/${aliasId}`, data),
  toggleAlias: (aliasId, enabled) => api.patch(`/api/email/aliases/${aliasId}/toggle`, { enabled }),
  deleteAlias: (aliasId) => api.delete(`/api/email/aliases/${aliasId}`),

  listEvents: (studioId) => {
    const qs = studioId ? `?studioId=${encodeURIComponent(studioId)}` : '';
    return api.get(`/api/email/events${qs}`);
  },

  sendTransactional: (data) => api.post('/api/email/transactional/send', data),
};

export const depositApi = {
  payDeposit: (bookingId) => api.post('/api/payments/deposit/' + bookingId, {}),
  payFinal: (bookingId) => api.post('/api/payments/final/' + bookingId, {}),
  getFinalClientSecret: (bookingId) => api.get('/api/payments/final/' + bookingId + '/client-secret'),
};

// ─── Saved card ───────────────────────────────────────────────────────────────
export const savedCardApi = {
  get: () => api.get('/api/payments/saved-card'),
  createSetupIntent: (studioId) => api.post('/api/payments/setup-intent', studioId ? { studioId } : {}),
  remove: () => api.delete('/api/payments/saved-card'),
};

// ─── Website builder ──────────────────────────────────────────────────────────
export const websiteApi = {
  get: (studioId) => api.get(`/api/website/${studioId}`),
  create: (studioId) => api.post('/api/website', { studioId }),
  updateSettings: (websiteId, data) => api.patch(`/api/website/${websiteId}/settings`, data),
  searchDomain: (query) => api.get(`/api/domains/search?query=${encodeURIComponent(query)}`),
  purchaseDomain: (websiteId, domain) => api.post('/api/domains/purchase', { websiteId, domain }),
  getDomainStatus: (websiteId) => api.get(`/api/domains/${websiteId}/status`),
  verifyDns: (websiteId) => api.get(`/api/domains/${websiteId}/verify`),
  listPages: (websiteId) => api.get(`/api/website/${websiteId}/pages`),
  createPage: (websiteId, data) => api.post(`/api/website/${websiteId}/pages`, data),
  updatePage: (pageId, data) => api.patch(`/api/website/pages/${pageId}`, data),
  deletePage: (pageId) => api.delete(`/api/website/pages/${pageId}`),
  reorderPages: (websiteId, pageIds) => api.patch(`/api/website/${websiteId}/pages/order`, { pageIds }),
  getSections: (pageId) => api.get(`/api/website/pages/${pageId}/sections`),
  saveSections: (pageId, sections) => api.put(`/api/website/pages/${pageId}/sections`, { sections }),
};
