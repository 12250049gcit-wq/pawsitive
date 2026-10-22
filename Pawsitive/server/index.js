require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Pet, Application, Counter, Settings } = require('./models');

const ROOT = path.resolve(__dirname, '../..');
const PORT = process.env.PORT || 3006;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pawsitive';
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const app = express();
app.use(express.json({ limit: '8mb' })); // pet photos arrive as resized data URLs

/* ---------- front end (served from the project root, only the files it needs) ---------- */
['index.html', 'styles.css', 'app.js', 'mock-api.js'].forEach((f) => app.get(f === 'index.html' ? '/' : '/' + f, (_, res) => res.sendFile(path.join(ROOT, f))));
app.use('/image', express.static(path.join(ROOT, 'image')));

/* ---------- helpers ---------- */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const safe = (u) => { const o = u.toJSON(); delete o.password; delete o.favourites; return o; };
const token = (u) => jwt.sign({ id: u.id, role: u.role }, SECRET, { expiresIn: '7d' });
const auth = (...roles) => (req, res, next) => {
  try {
    const t = (req.headers.authorization || '').replace('Bearer ', '');
    req.user = jwt.verify(t, SECRET);
  } catch { return res.status(401).json({ error: 'Please log in to continue.' }); }
  if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have access to this.' });
  next();
};
const STAFF = ['Admin', 'Volunteer'];

/* ---------- auth ---------- */
app.post('/api/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  const u = await User.findOne({ email: String(email || '').trim().toLowerCase() });
  if (!u || !(await bcrypt.compare(String(password || ''), u.password)))
    return res.status(401).json({ error: 'Incorrect email, password or role. Please check and try again.' });
  res.json({ token: token(u), user: safe(u) });
}));
app.post('/api/auth/signup', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  const requestedRole = req.body.role || 'Adopter';
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '');
  if (!cleanName || !cleanEmail || !cleanPassword || cleanPassword.length < 8) {
    return res.status(400).json({ error: 'Name and email are required. Password must be at least 8 characters.' });
  }
  // Public registration can create adopters and volunteers, but never administrators.
  if (!['Adopter', 'Volunteer'].includes(requestedRole)) {
    return res.status(403).json({ error: 'Admin accounts must be created by an authorised administrator.' });
  }
  if (requestedRole === 'Volunteer' && (!String(req.body.shelter || '').trim() || !/^[+\d][\d\s-]{6,}$/.test(String(req.body.phone || '').trim()))) {
    return res.status(400).json({ error: 'Volunteer sign-up requires a shelter name and valid phone number.' });
  }
  if (await User.exists({ email: cleanEmail })) return res.status(409).json({ error: 'An account with this email already exists.' });
  // Store only a salted bcrypt hash. Never save the plain-text password.
  const passwordHash = await bcrypt.hash(cleanPassword, 12);
  const u = await User.create({
    name: cleanName,
    email: cleanEmail,
    password: passwordHash,
    role: requestedRole,
    ...(requestedRole === 'Volunteer' ? { shelter: String(req.body.shelter).trim(), phone: String(req.body.phone).trim() } : {})
  });
  res.status(201).json({ token: token(u), user: safe(u) });
}));

/* ---------- pets ---------- */
app.get('/api/pets', wrap(async (_, res) => res.json(await Pet.find().sort('createdAt'))));
app.get('/api/pets/:id', wrap(async (req, res) => {
  const p = await Pet.findById(req.params.id).catch(() => null);
  p ? res.json(p) : res.status(404).json({ error: 'This pet could not be found.' });
}));
app.post('/api/pets', auth(...STAFF), wrap(async (req, res) => res.status(201).json(await Pet.create(req.body))));
app.put('/api/pets/:id', auth(...STAFF), wrap(async (req, res) => {
  const p = await Pet.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  p ? res.json(p) : res.status(404).json({ error: 'This pet could not be found.' });
}));
app.delete('/api/pets/:id', auth(...STAFF), wrap(async (req, res) => { await Pet.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

/* ---------- favourites (per logged-in adopter) ---------- */
app.get('/api/favourites', auth('Adopter'), wrap(async (req, res) => {
  const u = await User.findById(req.user.id).populate('favourites');
  res.json(u ? u.favourites : []);
}));
app.post('/api/favourites/:petId/toggle', auth('Adopter'), wrap(async (req, res) => {
  const u = await User.findById(req.user.id), id = req.params.petId;
  const has = u.favourites.some((f) => f.equals(id));
  u.favourites = has ? u.favourites.filter((f) => !f.equals(id)) : [...u.favourites, id];
  await u.save(); res.json({ favourite: !has });
}));

/* ---------- applications ---------- */
app.get('/api/applications', auth(), wrap(async (req, res) => {
  const filter = req.user.role === 'Adopter' ? { email: (await User.findById(req.user.id)).email } : {};
  res.json(await Application.find(filter).sort('-createdAt'));
}));
app.get('/api/applications/:code', auth(), wrap(async (req, res) => {
  const a = await Application.findOne({ code: req.params.code });
  a ? res.json(a) : res.status(404).json({ error: 'This application could not be found.' });
}));
app.post('/api/applications', auth('Adopter'), wrap(async (req, res) => {
  const me = await User.findById(req.user.id);
  const c = await Counter.findOneAndUpdate({ _id: 'application' }, { $inc: { seq: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true });
  const a = await Application.create({ ...req.body, email: me.email, status: 'Pending', code: 'PAW-' + c.seq });
  res.status(201).json(a);
}));
app.patch('/api/applications/:code/status', auth(...STAFF), wrap(async (req, res) => {
  const { status, note } = req.body;
  if (!['Pending', 'Approved', 'Rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const a = await Application.findOneAndUpdate({ code: req.params.code }, { status, ...(note ? { note } : {}) }, { new: true });
  a ? res.json(a) : res.status(404).json({ error: 'This application could not be found.' });
}));

/* ---------- users, settings, profile ---------- */
app.get('/api/users', auth('Admin'), wrap(async (_, res) => res.json((await User.find()).map(safe))));
app.get('/api/settings', auth('Admin'), wrap(async (_, res) => res.json((await Settings.findOne()) || {})));
app.put('/api/settings', auth('Admin'), wrap(async (req, res) => res.json(await Settings.findOneAndUpdate({}, req.body, { new: true, upsert: true }))));
app.put('/api/profile', auth(), wrap(async (req, res) => {
  const { name, shelter, phone } = req.body;
  const updated = await User.findByIdAndUpdate(req.user.id, { ...(name !== undefined ? { name } : {}), ...(shelter !== undefined ? { shelter } : {}), ...(phone !== undefined ? { phone } : {}) }, { new: true, runValidators: true });
  res.json(safe(updated));
}));

app.get('/api/health', (_, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }));
app.use('/api', (_, res) => res.status(404).json({ error: 'Not found.' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.name === 'ValidationError' ? 400 : 500).json({ error: err.name === 'ValidationError' ? err.message : 'Something went wrong. Please try again.' });
});

/* ---------- demo staff accounts ---------- */
// Ensure the Admin and Volunteer demo accounts exist even when the database
// already has pets and therefore does not need the full first-run seed.
// Existing passwords are preserved here; run `npm run setup:staff` to reset
// the demo staff credentials intentionally.
async function ensureDemoStaffAccounts() {
  const demoPassword = process.env.DEMO_STAFF_PASSWORD || 'paw123';
  const accounts = [
    { name: 'Pema Lhaki', email: 'admin@pawsitive.bt', role: 'Admin' },
    { name: 'Karma Yangzom', email: 'volunteer@pawsitive.bt', role: 'Volunteer', shelter: 'GCIT Animal Shelter', phone: '+975 17123456' },
  ];
  for (const account of accounts) {
    const exists = await User.findOne({ email: account.email });
    if (!exists) {
      const password = await bcrypt.hash(demoPassword, 12);
      await User.create({ ...account, password });
      console.log(`Created demo ${account.role} account: ${account.email}`);
    }
  }
}

/* ---------- start ---------- */
mongoose.connect(MONGO_URI).then(async () => {
  console.log('MongoDB connected');
  if (!(await Pet.estimatedDocumentCount())) await require('./seed')(); // first run: load demo data
  await ensureDemoStaffAccounts();
  app.listen(PORT, () => console.log(`Pawsitive running on http://localhost:${PORT}`));
}).catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
