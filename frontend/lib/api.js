const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function req(path, { method = 'GET', body, auth = true } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({ success: false, message: 'Bad response' }));
  if (!res.ok || json.success === false) {
    const err = new Error(json.message || `Request failed (${res.status})`);
    err.details = json.details;
    throw err;
  }
  return json.data;
}

export const api = {
  login: (email, password) => req('/api/auth/login', { method: 'POST', body: { email, password } }),
  me: () => req('/api/auth/me'),
  logout: () => req('/api/auth/logout', { method: 'POST' }),
  dashboard: () => req('/api/dashboard'),
  trends: (params = '') => req(`/api/trends${params}`),
  research: () => req('/api/trends/research', { method: 'POST' }),
  analyse: () => req('/api/trends/analyse', { method: 'POST' }),
  contents: (params = '') => req(`/api/content${params}`),
  content: (id) => req(`/api/content/${id}`),
  createContent: (body) => req('/api/content', { method: 'POST', body }),
  updateContent: (id, body) => req(`/api/content/${id}`, { method: 'PATCH', body }),
  deleteContent: (id) => req(`/api/content/${id}`, { method: 'DELETE' }),
  stage: (id, stage) => req(`/api/content/${id}/${stage}`, { method: 'POST' }),
  schedule: (id, body) => req(`/api/content/${id}/schedule`, { method: 'POST', body }),
  publishNow: (id) => req(`/api/content/${id}/publish`, { method: 'POST' }),
  scheduled: () => req('/api/schedule'),
  updateScheduled: (id, body) => req(`/api/schedule/${id}`, { method: 'PATCH', body }),
  published: () => req('/api/published'),
  videos: () => req('/api/videos'),
  fbStatus: () => req('/api/facebook'),
  fbConnect: () => req('/api/facebook/connect', { method: 'POST' }),
  fbDisconnect: (id) => req(`/api/facebook/${id}/disconnect`, { method: 'POST' }),
  automation: () => req('/api/automation'),
  updateAutomation: (body) => req('/api/automation', { method: 'PATCH', body }),
  runAutomation: () => req('/api/automation/run', { method: 'POST' }),
  getSettings: (k) => req(`/api/settings/${k}`),
  updateSettings: (k, body) => req(`/api/settings/${k}`, { method: 'PATCH', body }),
  jobs: (params = '') => req(`/api/jobs${params}`),
  retryJob: (id) => req(`/api/jobs/${id}/retry`, { method: 'POST' }),
  usage: () => req('/api/usage'),
  music: () => req('/api/music'),
  testStatus: () => req('/api/test/status'),
  testGeminiModels: () => req('/api/test/gemini-models'),
  testScript: (topic) => req('/api/test/script', { method: 'POST', body: { topic } }),
  testVeoSubmit: (prompt) => req('/api/test/video-submit', { method: 'POST', body: { prompt } }),
  testVeoStatus: (operationId) => req(`/api/test/video-status?operationId=${encodeURIComponent(operationId)}`),
  testSlideshow: (body) => req('/api/test/slideshow', { method: 'POST', body }),
  testHFVideo: (prompt) => req('/api/test/hf-video', { method: 'POST', body: { prompt } }),
  testHFVideoModels: () => req('/api/test/hf-video-models'),
  storySettings: () => req('/api/story/settings'),
  updateStorySettings: (body) => req('/api/story/settings', { method: 'PATCH', body }),
  storyHistory: () => req('/api/story/history'),
  postStoryNow: () => req('/api/story/post-story-now', { method: 'POST' }),
  postVideoNow: (topic) => req('/api/story/post-video-now', { method: 'POST', body: { topic } }),
};
