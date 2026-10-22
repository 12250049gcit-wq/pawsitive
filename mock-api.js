/* Pawsitive API client. All persistent data is read from/written to the Express + MongoDB API. */
const Api = (() => {
  const SESSION = 'pawsitive-user';
  const TOKEN = 'pawsitive-token';
  let favouriteIds = [];
  const session = () => { try { return JSON.parse(sessionStorage.getItem(SESSION)); } catch { return null; } };
  const token = () => sessionStorage.getItem(TOKEN);
  async function request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token()) headers.Authorization = `Bearer ${token()}`;
    const response = await fetch(`/api${path}`, { ...options, headers });
    const data = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `Request failed (${response.status}).`);
    return data;
  }
  const saveSession = async (data) => {
    sessionStorage.setItem(TOKEN, data.token);
    sessionStorage.setItem(SESSION, JSON.stringify(data.user));
    try { favouriteIds = (await request('/favourites')).map((p) => p._id || p.id); } catch { favouriteIds = []; }
    return data.user;
  };
  const petOut = (p) => ({ ...p, id: p._id || p.id });
  const appOut = (a) => ({ ...a, id: a.code || a.id, date: a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : a.date });
  return {
    session,
    logout() { sessionStorage.removeItem(SESSION); sessionStorage.removeItem(TOKEN); favouriteIds = []; },
    async login(email, password) { return saveSession(await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })); },
    async signup(data) { return saveSession(await request('/auth/signup', { method: 'POST', body: JSON.stringify(data) })); },
    async pets() { return (await request('/pets')).map(petOut); },
    async pet(id) { return petOut(await request(`/pets/${encodeURIComponent(id)}`)); },
    async savePet(pet) {
      const body = { name: pet.name, type: pet.type, age: pet.age, sex: pet.sex || 'Female', breed: pet.breed, energy: pet.energy, space: pet.space, exp: pet.exp || 'None', ...(pet.photo ? { photo: pet.photo } : {}) };
      const saved = pet.id ? await request(`/pets/${encodeURIComponent(pet.id)}`, { method: 'PUT', body: JSON.stringify(body) }) : await request('/pets', { method: 'POST', body: JSON.stringify(body) });
      return petOut(saved);
    },
    async deletePet(id) { await request(`/pets/${encodeURIComponent(id)}`, { method: 'DELETE' }); return true; },
    async apps() { return (await request('/applications')).map(appOut); },
    async app(id) { return appOut(await request(`/applications/${encodeURIComponent(id)}`)); },
    async apply(data) { return appOut(await request('/applications', { method: 'POST', body: JSON.stringify(data) })); },
    async setStatus(id, status, note = '') { return appOut(await request(`/applications/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status, note }) })); },
    async users() { return request('/users'); },
    favs() { return [...favouriteIds]; },
    async toggleFav(id) {
      const result = await request(`/favourites/${encodeURIComponent(id)}/toggle`, { method: 'POST' });
      favouriteIds = result.favourite ? [...new Set([...favouriteIds, id])] : favouriteIds.filter((x) => x !== id);
      return result.favourite;
    },
    async settings() { return request('/settings'); },
    async saveSettings(s) { return request('/settings', { method: 'PUT', body: JSON.stringify(s) }); },
    async saveProfile(p) {
      const user = await request('/profile', { method: 'PUT', body: JSON.stringify(p) });
      sessionStorage.setItem(SESSION, JSON.stringify(user)); return user;
    },
    reset() { this.logout(); }
  };
})();
