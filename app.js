/* Pawsitive MVP front end. Data comes only from the `Api` object (js/mock-api.js).
   Images are loaded from the /images folder: <pet name lowercase>.jpg, hero.jpg */
const $app = document.getElementById('app');
const S = { q: '', match: {}, mode: 'login', role: 'Adopter' };
const ACCESS = {
  pets: ['Adopter'], cats: ['Adopter'], dogs: ['Adopter'], match: ['Adopter'], pet: ['Adopter'], apply: ['Adopter'], submitted: ['Adopter'], myapps: ['Adopter'], favs: ['Adopter'],
  'a-dash': ['Admin'], 'a-users': ['Admin'], 'a-reports': ['Admin'], 'a-settings': ['Admin'],
  'a-pets': ['Admin', 'Volunteer'], 'a-apps': ['Admin', 'Volunteer'], 'a-pet': ['Admin', 'Volunteer'], 'a-added': ['Admin', 'Volunteer'],
  approved: ['Admin', 'Volunteer'], rejected: ['Admin', 'Volunteer'], 'a-review': ['Admin'],
  'v-dash': ['Volunteer'], 'v-detail': ['Volunteer'], 'v-status': ['Volunteer'], 'v-profile': ['Volunteer'],
};
const HOME = { Adopter: 'pets', Admin: 'a-dash', Volunteer: 'v-dash' };
const ROLE_HINT = { Adopter: 'Browse pets, save favourites and apply to adopt or foster.', Volunteer: 'Manage shelter pets and update application statuses.', Admin: 'Oversee pets, applications, users and reports.' };

/* ---------- small helpers ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const go = (h) => { location.hash = '#/' + h; };
const slug = (n) => n.toLowerCase().replace(/\s+/g, '-');
const route = () => (location.hash.slice(2) || 'home').split('/')[0];
const animalFallback = (p) => `<span class="image-fallback" aria-hidden="true">${p.type === 'Dog' ? 'DOG' : 'CAT'}</span>`;
const imgExts = {
  bluy: 'webp', buddy: 'webp', cooper: 'webp', puby: 'webp',
  bob: 'jpeg', charli: 'jpeg', charlie: 'jpeg', coco: 'jpeg', kuru: 'jpeg',
  lily: 'jpeg', misty: 'jpeg', mochi: 'jpeg', nala: 'jpeg', oreo: 'jpeg',
  rocky: 'jpeg', zebra: 'jpeg', sweets: 'jpeg', winter: 'jpeg',
  kitty: 'avif', max: 'avif'
};

const pic = (p, h) => {
  const nameSlug = slug(p.name);
  const ext = imgExts[nameSlug] || 'jpg';
  return `<div class="ph" ${h ? `style="height:${h}px"` : ''}>${animalFallback(p)}<img src="${p.photo ? p.photo : `image/${nameSlug}.${ext}`}" alt="${esc(p.name)}, a ${esc(p.breed)}" loading="lazy" decoding="async" onerror="this.remove()"></div>`;
};
const photoPreview = (p) => S.photo
  ? `<div class="ph" style="height:200px"><img src="${S.photo}" alt="Selected pet photo"></div>`
  : (p && p.name ? pic(p, 200) : `<div class="ph" style="height:200px;font-size:60px" role="img" aria-label="No photo selected">Photo</div>`);
// shrink a chosen/captured image so it fits comfortably in browser storage
const shrink = (src) => new Promise((res, rej) => {
  const im = new Image();
  im.onload = () => { const k = Math.min(1, 640 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.8)); };
  im.onerror = () => rej(new Error('That file could not be read as an image.')); im.src = src;
});
const statusCls = (s) => ({ Pending: 'pend', Approved: 'ok', Rejected: 'bad' }[s]);
function toast(msg, bad) {
  const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg;
  document.getElementById('toast').append(t); setTimeout(() => t.remove(), 3500);
}
function ask(msg) {
  return new Promise((res) => {
    const d = document.createElement('dialog');
    d.innerHTML = `<p style="margin-bottom:18px">${esc(msg)}</p><div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn sm out" value="no">Cancel</button><button class="btn sm red" value="yes">Delete</button></div>`;
    d.addEventListener('click', (e) => { if (e.target.value) { d.close(); d.remove(); res(e.target.value === 'yes'); } });
    d.addEventListener('cancel', () => { d.remove(); res(false); });
    document.body.append(d); d.showModal();
  });
}
function check(form, rules) { // shows an accessible message under each invalid field
  let ok = true;
  for (const [id, [test, msg]] of Object.entries(rules)) {
    const el = form.elements[id]; const bad = !test(el.value.trim());
    el.setAttribute('aria-invalid', bad); document.getElementById('e-' + id).textContent = bad ? msg : '';
    if (bad && ok) { el.focus(); ok = false; }
  }
  return ok;
}
const req = (m) => [(v) => v.length > 0, m];
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const field = (id, label, o = {}) => `<label for="${id}">${label}</label>${o.opts
  ? `<select id="${id}" name="${id}" aria-describedby="e-${id}"><option value="">${o.ph || 'Select'}</option>${o.opts.map((x) => `<option ${x === o.val ? 'selected' : ''}>${x}</option>`).join('')}</select>`
  : `<input id="${id}" name="${id}" type="${o.type || 'text'}" value="${esc(o.val)}" placeholder="${o.ph || ''}" ${o.ro ? 'readonly' : ''} autocomplete="${o.ac || 'off'}" aria-describedby="e-${id}">`}<div class="err" id="e-${id}" role="alert"></div>`;

/* ---------- shared layout ---------- */
const FOOT = `<footer><div><div class="logo" style="color:#fff;margin-bottom:12px">Pawsitive</div><p>Empowering pet parents with data-driven insights and professional care. Because every pet deserves a healthy, happy life.</p></div>
<div><h2>Platform</h2><a href="#/about">Health Monitoring</a><a href="#/about">Nutrition Guide</a><a href="#/about">Community Hub</a><a href="#/about">Professional Consultation</a></div>
<div><h2>Company</h2><a href="#/about">About Us</a><a href="#/about">Our Vet Network</a><a href="#/about">Careers</a><a href="#/about">Press Kit</a></div>
<div><h2>Legal</h2><a href="#/about">Privacy Policy</a><a href="#/about">Terms of Service</a><a href="#/about">Cookie Settings</a><a href="#/about">Security</a></div></footer>`;
const LOGO = `<a href="#/home" class="logo" aria-label="Pawsitive home"><img class="brand-mark" src="image/pawsitive-mark.svg" alt=""><span class="brand-copy">Pawsitive<span class="brand-tagline">ADOPT · FOSTER · GIVE LOVE</span></span></a>`;
const BURGER = `<button class="burger" aria-label="Menu" aria-expanded="false" onclick="A.menu(this)">Menu</button>`;
const links = (items, r) => items.map(([t, h]) => `<a href="#/${h}" ${h === r ? 'class="on" aria-current="page"' : ''}>${t}</a>`).join('');
function pubNav(u) {
  const r = route();
  const navLinks = u
    ? [['Home', 'home'], ['Pets', 'pets'], ['About', 'about'], ['Favourites', 'favs'], ['Applications', 'myapps']]
    : [['Home', 'home'], ['About', 'about']];
  return `<header class="top">${LOGO}${BURGER}<nav class="nav" aria-label="Main">${links(navLinks, r)}</nav>
  ${u ? `<button class="btn" onclick="A.logout()">Sign Out</button>` : `<span class="auth-actions"><a href="#/login" class="landing-login" onclick="S.mode='login'">Log In</a><a class="btn" href="#/login" onclick="S.mode='signup'">Create Account</a></span>`}</header>`;
}
const volNav = () => `<header class="top">${LOGO}${BURGER}<nav class="nav" aria-label="Volunteer">${links([['Dashboard', 'v-dash'], ['Manage Pets', 'a-pets'], ['Applications', 'a-apps'], ['Update Status', 'v-status'], ['Profile', 'v-profile']], route())}<a href="#/login" onclick="A.logout();return false">Logout</a></nav></header>`;
const backBar = (t) => `<header class="top">${t || LOGO}<a href="javascript:history.back()" style="font-weight:600" aria-label="Go back">← Back</a></header>`;
const pub = (body, u, cls = '') => pubNav(u) + `<main id="main" tabindex="-1" class="wrap ${cls}">${body}</main>` + FOOT;
const plain = (head, body) => head + `<main id="main" tabindex="-1" class="wrap">${body}</main>` + FOOT;
function staff(u, active, body) {
  if (u.role === 'Volunteer') return volNav() + `<main id="main" tabindex="-1" class="wrap">${body}</main>` + FOOT;
  const side = [['Dashboard', 'a-dash'], ['Manage Pets', 'a-pets'], ['Applications', 'a-apps'], ['Users', 'a-users'], ['Reports', 'a-reports'], ['Settings', 'a-settings']]
    .map(([n, r]) => `<a href="#/${r}" ${r === active ? 'class="on" aria-current="page"' : ''}>${n}</a>`).join('');
  return `<header class="top">${LOGO}</header><div class="shell"><nav class="side" aria-label="Admin">${side}<a href="#/login" class="out" onclick="A.logout();return false">Log Out</a></nav><main id="main" tabindex="-1">${body}</main></div>` + FOOT;
}
const petCard = (p, favs, meta = true) => `<article class="card"><a class="pet" href="#/pet/${p.id}">${pic(p)}</a><h3><a href="#/pet/${p.id}">${esc(p.name)}</a><button class="heart" aria-pressed="${favs.includes(p.id)}" aria-label="Favourite ${esc(p.name)}" onclick="A.fav('${p.id}',this)">${favs.includes(p.id) ? 'Saved' : 'Save'}</button></h3>${meta ? `<p class="mut">${p.age} year${p.age > 1 ? 's' : ''} • ${p.sex} • ${p.type}</p>` : ''}</article>`;
const grid = (list, favs, cls = 'g3', meta) => list.length ? `<div class="grid ${cls}">${list.map((p) => petCard(p, favs, meta)).join('')}</div>` : `<p class="card center mut" role="status">No pets match your search. Try a different name, breed or type, or clear your filters.</p>`;
const SP = { Apartment: 0, House: 1, 'Large Space': 2 }, EX = { None: 0, Some: 1, Experienced: 2 };
const matches = (p, m) => (!m.space || SP[p.space] <= SP[m.space]) && (!m.energy || p.energy === m.energy) && (!m.exp || EX[p.exp] <= EX[m.exp]);
const visible = (pets) => pets.filter((p) => matches(p, S.match) && (`${p.name} ${p.breed} ${p.type}`).toLowerCase().includes(S.q.toLowerCase()));
const appRow = (a, rej) => `<div class="row gr"><b style="width:150px">${esc(a.adopter)}</b><span class="mut" style="width:120px">Pet: ${esc(a.pet)}</span><span class="mut" style="flex:1">${rej ? esc(a.note || 'No reason recorded') : a.type}</span><span class="mut">${a.date}</span><span><span class="btn sm ${rej ? 'red' : ''}" aria-hidden="true">${a.status}</span> <a class="btn sm ${rej ? 'red' : ''}" href="#/a-review/${a.id}" aria-label="View application ${a.id}">View</a></span></div>`;
const details = (a, pet) => `<div class="card" style="margin-bottom:16px"><b>Applicant</b><p>${esc(a.adopter)} <span class="mut">${esc(a.email)}</span></p></div><div class="card" style="margin-bottom:16px"><b>Pet Information</b><p>${esc(a.pet)} <span class="mut">${pet ? `${pet.breed} • ${pet.age} years • ${pet.sex}` : ''}</span></p></div><div class="card" style="margin-bottom:16px"><b>Application Information</b><div class="grid g3" style="margin-top:10px"><div><small class="mut">Living Situation</small><br><b>${esc(a.living || 'Not provided')}</b></div><div><small class="mut">Previous Pet Experience</small><br><b>${esc(a.experience || 'Not provided')}</b></div><div><small class="mut">Application Type</small><br><b>${a.type}</b></div></div></div>`;
const optGroup = (key, title, items) => `<h2 style="margin-top:26px">${title}</h2><div class="grid g3" role="radiogroup" aria-label="${title}">${items.map(([i, t]) => `<button class="opt ${S.match[key] === t ? 'on' : ''}" role="radio" aria-checked="${S.match[key] === t}" onclick="A.pick('${key}','${t}',this)"><span aria-hidden="true">${i}</span>${t}</button>`).join('')}</div>`;

/* ---------- pages ---------- */
const P = {
  async home(_, u) {
    return pub(`<div class="grid g2 split landing-hero" style="align-items:center"><div><p class="eyebrow">ADOPT · FOSTER · GIVE LOVE</p><h1 style="font-size:clamp(34px,5vw,52px)">A loving home starts with a little connection.</h1><p class="mut" style="margin-bottom:22px;max-width:300px">Adopt or foster a cat or dog and give them a second chance at a happy life.</p><div class="landing-actions"><a class="btn" href="#/login" onclick="S.mode='signup'">Get Started</a><a class="btn out" href="#/login" onclick="S.mode='login'">Log In</a></div><p class="mut landing-note">Create an account or sign in to browse pets, save favourites and apply to adopt or foster.</p></div><div class="ph" style="height:270px"><img src="image/landingP.webp" alt="A puppy and a kitten together" onerror="this.remove()"></div></div>
    <section class="home-intro"><p class="eyebrow">A kinder way to find a companion</p><h2>Every pet deserves to belong.</h2><p class="mut">Finding the right companion is about more than a photograph. Pawsitive helps you compare a pet’s personality, energy level and needs with your daily life, then follow a clear path from first interest to application.</p><div class="grid g3 story-cards"><article class="step"><span class="number-mark">01</span><h3>Discover their story</h3><p class="mut">Explore pet profiles with practical details to help you make an informed and thoughtful choice.</p></article><article class="step"><span class="number-mark">02</span><h3>Find a good fit</h3><p class="mut">Use lifestyle filters to consider your living space, experience and the level of activity you can offer.</p></article><article class="step"><span class="number-mark">03</span><h3>Stay informed</h3><p class="mut">Submit an application and return to your dashboard to check its progress and read updates.</p></article></div><div class="card reassurance"><h2>Adoption is a relationship, not a transaction.</h2><p class="mut">Take your time, ask questions and consider the long-term care a pet needs. Pawsitive is designed to make the journey clearer for adopters, fosters and shelter teams alike.</p><a class="btn" href="#/about">Learn about our approach</a></div></section>`, u);
  },
  async login() {
    const su = S.mode === 'signup';
    return `<main id="main" tabindex="-1" class="split" style="display:grid;grid-template-columns:1fr 1fr;flex:1"><div style="background:var(--g);color:#fff;padding:50px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:18px">${LOGO.replace('class="logo"', 'class="logo" style="color:#fff"')}<h1 style="margin:0">Join Pawsitive</h1><p>Give a pet a second chance at a happy life.</p><div class="ph" style="width:100%;height:260px;background:#3c9d77"><img src="image/signup.avif" alt="A German shepherd watching a kitten on a tree stump" onerror="this.remove()"></div></div>
    <div style="padding:36px 24px;max-width:440px;margin:auto;width:100%"><div class="card" style="background:var(--g);color:#fff"><h2>${su ? 'Create account' : 'Welcome Back'}</h2><p style="font-size:13px">${su ? 'Choose Adopter to find a pet or Volunteer to help manage shelter care.' : 'Log in and we will take you straight to your dashboard.'}</p></div>
    <form id="f" novalidate onsubmit="A.auth(event)">${su ? `<div role="radiogroup" aria-label="Select your role" style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">${['Adopter', 'Volunteer'].map((r) => `<button type="button" role="radio" aria-checked="${r === S.role}" class="chip ${r === S.role ? 'on' : ''}" onclick="A.role('${r}',this)">${r}</button>`).join('')}</div><p class="mut" id="role-hint" style="margin-top:8px;font-size:13px">${ROLE_HINT[S.role]}</p>` : ''}
    ${su ? field('name', 'Full name', { ac: 'name' }) : ''}${field('email', 'Email', { type: 'email', ac: 'email' })}${field('password', 'Password', { type: 'password', ac: su ? 'new-password' : 'current-password' })}${su ? `<div id="vol" ${S.role === 'Volunteer' ? '' : 'hidden'}>${field('shelter', 'Shelter name', { ph: 'e.g. GCIT Animal Shelter' })}${field('phone', 'Phone number', { type: 'tel', ac: 'tel' })}</div>` : ''}
    <button class="btn wide" style="border-radius:8px">${su ? 'Sign Up' : 'Log In'}</button></form>
    <p class="center" style="margin-top:16px;font-size:14px">${su ? 'Already have an account?' : "Don't have an account?"} <a style="font-weight:700;text-decoration:underline" href="javascript:void 0" onclick="S.mode='${su ? 'login' : 'signup'}';render()">${su ? 'Log In' : 'Sign Up'}</a></p>
    <p class="mut center" style="margin-top:10px;font-size:12px">Demo accounts (run the demo setup script first), password <b>paw123</b>: adopter@pawsitive.bt, volunteer@pawsitive.bt, admin@pawsitive.bt. Admin accounts are provisioned by trusted staff, not public sign-up.</p></div></main>` + FOOT;
  },
  async pets(_, u) {
    const [pets, favs] = [await Api.pets(), Api.favs()]; const f = Object.keys(S.match).length;
    return pub(`<h1>Available Pets</h1><div style="display:flex;gap:14px;margin-bottom:14px"><div style="flex:1"><label class="sr" for="q">Search pets</label><input id="q" type="search" value="${esc(S.q)}" placeholder="Search by name, breed or type..." oninput="A.search(this.value)"></div><a class="btn out" href="#/match">Filter${f ? ` (${f})` : ''}</a></div>
    <div style="display:flex;gap:12px;margin-bottom:18px;flex-wrap:wrap"><a class="chip on" href="#/pets">All</a><a class="chip" href="#/cats">Cats</a><a class="chip" href="#/dogs">Dogs</a>${f ? `<a class="chip" href="javascript:void 0" onclick="S.match={};render()">Clear filters ×</a>` : ''}</div><div id="pg" aria-live="polite">${grid(visible(pets), favs)}</div>`, u);
  },
  async cats(_, u) { return P._type('Cat', 'Cats'); },
  async dogs(_, u) { return P._type('Dog', 'Dogs'); },
  async _type(type, title) { const [pets, favs] = [await Api.pets(), Api.favs()]; return plain(backBar(), `<h1 style="font-size:26px">${title}</h1>${grid(pets.filter((p) => p.type === type), favs, 'g4', false)}`); },
  async match(_, u) {
    return pub(`<h1>Find Your Perfect Match</h1>${optGroup('space', 'Living Space', [['A', 'Apartment'], ['H', 'House'], ['L', 'Large Space']])}${optGroup('energy', 'Energy Level', [['1', 'Low'], ['2', 'Medium'], ['3', 'High']])}${optGroup('exp', 'Previous Pet Experience', [['1', 'None'], ['2', 'Some'], ['3', 'Experienced']])}<a class="btn wide" style="margin-top:26px" href="#/pets">Apply Filters</a><p class="center" style="margin-top:12px"><a style="text-decoration:underline" href="javascript:void 0" onclick="S.match={};render()">Clear all</a></p>`, u);
  },
  async pet(id, u) {
    const p = await Api.pet(id), fav = Api.favs().includes(p.id);
    return pub(`<div class="grid g2 split" style="align-items:center"><div>${pic(p, 340)}</div><div><h1 style="margin-bottom:4px">${esc(p.name)}</h1><p class="mut">${p.age} year${p.age > 1 ? 's' : ''} • ${p.sex} • ${esc(p.breed)}</p><div style="display:flex;gap:10px;margin:14px 0;flex-wrap:wrap"><span class="tag">${p.energy} Energy</span><span class="tag">${p.type}</span><span class="tag">${p.exp === 'None' ? 'Beginner Friendly' : p.exp + ' owners'}</span></div>
    <h2>About ${esc(p.name)}</h2><p class="mut">${esc(p.name)} is a ${p.age}-year-old ${p.sex.toLowerCase()} ${esc(p.breed.toLowerCase())} with ${p.energy.toLowerCase()} energy, looking for a loving home.</p><h3 style="margin-top:14px">Living Space</h3><p class="mut">${p.space}${p.space === 'Large Space' ? '' : ' or larger'}</p><h3 style="margin-top:12px">Experience</h3><p class="mut" style="margin-bottom:20px">${p.exp === 'None' ? 'Beginner Friendly' : p.exp}</p>
    <a class="btn wide" style="margin-bottom:12px" href="#/apply/foster?pet=${p.id}" onclick="S.pet='${p.id}'">Apply for fostering</a><a class="btn wide" style="margin-bottom:12px" href="#/apply/adopt" onclick="S.pet='${p.id}'">Apply for Adoption</a><button class="btn out wide" onclick="A.fav('${p.id}',this,true)" aria-pressed="${fav}">${fav ? 'Saved to favourites' : 'Save to Favorites'}</button></div></div>`, u);
  },
  async apply(type, u) {
    const p = await Api.pet(S.pet || 'p12'), t = type === 'foster' ? 'Fostering' : 'Adoption';
    return pub(`<h1>${t} Application</h1><p class="mut">Applying for <b>${esc(p.name)}</b></p><form class="card" style="padding:28px;margin-top:20px" novalidate onsubmit="A.apply(event,'${t}','${p.id}')"><h2>Personal Information</h2><div class="grid g2">
    <div>${field('fullName', 'Full Name', { val: u.name, ac: 'name' })}${field('phone', 'Phone Number', { type: 'tel', ac: 'tel' })}${field('living', 'Living Situation', { opts: ['Apartment', 'House', 'House with yard', 'Large Space'] })}</div>
    <div>${field('email', 'Email Address', { type: 'email', val: u.email, ac: 'email' })}${field('address', 'Address', { ac: 'street-address' })}${field('experience', 'Previous Pet Experience', { opts: ['None', 'Some', 'Experienced'] })}</div></div><div style="text-align:right;margin-top:20px"><button class="btn" style="padding:13px 60px">Submit</button></div></form>`, u);
  },
  async submitted(id, u) {
    const a = await Api.app(id);
    return `<header class="top">${LOGO}</header><main id="main" tabindex="-1" class="wrap center"><div class="tick" aria-hidden="true">Done</div><h1 style="color:var(--dg)">Application Submitted!</h1><p class="mut" style="margin:18px 0 30px">Thank you for applying to give ${esc(a.pet)} a loving home.</p><div class="card" style="background:var(--mint);max-width:300px;margin:auto"><small class="mut">Application ID</small><h2 style="color:var(--dg);margin:10px 0 0">#${a.id}</h2></div><div style="max-width:260px;margin:30px auto 0"><a class="btn sm wide" style="padding:16px" href="#/myapps">View My Applications</a><a class="btn sm out wide" style="padding:16px;margin-top:12px" href="#/pets">Back to Home</a></div></main>` + FOOT;
  },
  async myapps(_, u) {
    const mine = (await Api.apps()).filter((a) => a.email === u.email), tab = S.tab || 'Adoption', list = mine.filter((a) => a.type === tab), pets = await Api.pets();
    return pub(`<h1>My Applications</h1><div style="display:flex;gap:12px;margin-bottom:20px">${['Adoption', 'Fostering'].map((t) => `<button class="chip ${t === tab ? 'on' : ''}" aria-pressed="${t === tab}" onclick="S.tab='${t}';render()">${t}</button>`).join('')}</div>${list.length ? list.map((a) => `<div class="row"><div style="display:flex;gap:16px;align-items:center">${pic(pets.find((p) => p.id === a.petId) || { name: a.pet, type: 'Cat', breed: '' }).replace('class="ph"', 'class="ph" style="width:78px;height:50px;font-size:24px"')}<div><b>${esc(a.pet)}</b><br><small class="mut">${a.type} • ${a.id}</small></div></div><span class="pill ${statusCls(a.status)}">${a.status}</span></div>`).join('') : `<p class="card center mut" role="status">You have no ${tab.toLowerCase()} applications yet. <a href="#/pets" style="text-decoration:underline">Browse pets</a> to get started.</p>`}`, u);
  },
  async favs(_, u) {
    const ids = Api.favs(), pets = (await Api.pets()).filter((p) => ids.includes(p.id));
    return pub(`<h1>My Favourites</h1><p class="mut" style="margin:-8px 0 20px">Pets you have saved so you can come back to them later.</p>${pets.length ? grid(pets, ids) : `<div class="card center" role="status"><div class="tick" aria-hidden="true">Saved</div><p class="mut">You have not saved any pets yet. Tap the heart on a pet to add it here.</p><a class="btn" style="margin-top:16px" href="#/pets">Browse pets</a></div>`}`, u);
  },
  async about(_, u) {
    return pub(`<div class="center"><h1 style="color:var(--dg);margin:0">About Pawsitive</h1><b>Give Them a Brighter Tomorrow</b></div><div class="card" style="margin:24px 0"><h2 style="color:var(--dg);font-size:17px">Our Mission</h2><p class="mut">Pawsitive brings prospective adopters and foster carers together with cats and dogs seeking safe, caring homes. We aim to make the process easier to understand, with useful pet information, lifestyle matching and application updates in one place.</p></div><div class="grid g3">${[['01', 'Lifestyle Matching', 'Choose by energy level, living space and previous pet experience so your new companion can thrive in your home.'], ['02', 'Simple Applications', 'Share the information shelters need through a clear application process designed to reduce confusion and unnecessary steps.'], ['03', 'Transparent Tracking', 'Review your application status and any feedback in one place, helping you understand what happens next.']].map(([i, t, d]) => `<div class="card"><b><span aria-hidden="true">${i}</span> ${t}</b><p class="mut" style="margin-top:8px">${d}</p></div>`).join('')}</div><div class="card" style="background:var(--mint);margin:22px 0"><h2 style="color:var(--dg);font-size:17px">For Shelters</h2><p class="mut">Manage pets and review adoption or fostering applications in one place.</p></div><p class="center"><b>The Pawsitive Journey</b></p><p class="center" style="color:var(--dg);font-weight:700;margin-top:8px"><a href="#/pets">Browse</a> → <a href="#/match">Filter</a> → <a href="#/pets">View Pet</a> → <a href="#/pets">Apply</a> → <a href="#/myapps">Track</a></p>`, u);
  },

  /* ----- admin ----- */
  async 'a-dash'(_, u) {
    const [pets, apps, users] = await Promise.all([Api.pets(), Api.apps(), Api.users()]), pend = apps.filter((a) => a.status === 'Pending');
    const stats = [['Available Pets', pets.length], ['Pending Applications', pend.length], ['Adoptions Completed', apps.filter((a) => a.type === 'Adoption' && a.status === 'Approved').length], ['Active Volunteers', users.filter((x) => x.role === 'Volunteer').length]];
    return staff(u, 'a-dash', `<h1>Dashboard</h1><div class="grid g4" style="margin-bottom:22px">${stats.map(([t, n]) => `<div class="card stat"><small class="mut">${t}</small><b>${n}</b></div>`).join('')}</div><div class="grid g2">
    <div class="card"><div style="display:flex;justify-content:space-between;margin-bottom:12px"><h2>Manage Pets</h2><a class="btn sm" href="#/a-pet/new">+ Add Pet</a></div>${pets.slice(-3).map((p) => `<div class="row gr"><b>${esc(p.name)}</b><a style="color:var(--dg)" href="#/a-pet/${p.id}">Edit</a></div>`).join('')}</div>
    <div class="card"><h2>Applications</h2>${pend.slice(0, 3).map((a) => `<a class="row gr" href="#/a-review/${a.id}"><b>${esc(a.adopter)}</b><span class="mut">${esc(a.pet)}</span></a>`).join('') || '<p class="mut">No pending applications.</p>'}</div>
    <div class="card"><h2>Recent Users</h2><ul class="mut" style="padding-left:18px;line-height:2">${users.slice(-4).reverse().map((x) => `<li>${esc(x.name)}</li>`).join('')}</ul></div>
    <div class="card"><h2>Recent Activity</h2><ul class="mut" style="padding-left:18px;line-height:2">${apps.slice(0, 4).map((a) => `<li>${esc(a.pet)} application ${a.status.toLowerCase()}</li>`).join('')}</ul></div></div>`);
  },
  async 'a-pets'(_, u) {
    const pets = await Api.pets();
    return staff(u, 'a-pets', `<h1>Manage Pets</h1><div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:16px"><div style="flex:1;max-width:300px"><label class="sr" for="fq">Search pets</label><input id="fq" type="search" placeholder="Search pets" oninput="A.filterList(this.value)"></div><a class="btn sm" href="#/a-pet/new">+ Add Pet</a></div><div id="pl">${pets.map((p) => `<div class="row" data-n="${esc(p.name.toLowerCase())}"><b>${esc(p.name)} <small class="mut">${p.type} • ${esc(p.breed)}</small></b><span><a style="color:var(--dg);margin-right:16px" href="#/a-pet/${p.id}" aria-label="Edit ${esc(p.name)}">Edit</a><button class="mut" style="background:none;border:0;cursor:pointer;font-size:inherit" onclick="A.del('${p.id}','${esc(p.name)}')" aria-label="Delete ${esc(p.name)}">Delete</button></span></div>`).join('')}</div><p id="none" class="card center mut" role="status" hidden>No pets match your search.</p>`);
  },
  async 'a-pet'(id, u) {
    const p = id === 'new' ? {} : await Api.pet(id); S.photo = p.photo || '';
    return `<header class="top">${LOGO}</header><main id="main" tabindex="-1" class="wrap" style="max-width:780px"><h1>${p.id ? 'Edit Pet' : 'Add New Pet'}</h1><form class="card" novalidate onsubmit="A.savePet(event,'${p.id || ''}')"><b>Pet Photo</b><p class="mut" style="margin:6px 0 12px">Add a photo by uploading one from your device or taking one with your camera.</p><div id="pp" style="margin-bottom:12px;max-width:320px">${photoPreview(p)}</div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px"><button type="button" class="btn sm out" onclick="document.getElementById('pf').click()">Upload photo</button><button type="button" class="btn sm out" onclick="A.camera()">Take photo</button><button type="button" class="btn sm out" id="rm" onclick="A.clearPhoto()" ${S.photo ? '' : 'hidden'}>Remove photo</button></div><label class="sr" for="pf">Upload pet photo</label><input id="pf" type="file" accept="image/*" hidden onchange="A.photoFile(this)"><label class="sr" for="pc">Take pet photo</label><input id="pc" type="file" accept="image/*" capture="environment" hidden onchange="A.photoFile(this)"><div class="grid g2"><div>${field('name', 'Pet Name', { val: p.name, ph: 'Enter pet name' })}${field('age', 'Age (years)', { type: 'number', val: p.age, ph: 'Select age' })}${field('energy', 'Energy Level', { opts: ['Low', 'Medium', 'High'], val: p.energy, ph: 'Select level' })}</div><div>${field('type', 'Animal Type', { opts: ['Dog', 'Cat'], val: p.type, ph: 'Select type' })}${field('breed', 'Breed', { val: p.breed, ph: 'Enter breed' })}${field('space', 'Living Space', { opts: ['Apartment', 'House', 'Large Space'], val: p.space, ph: 'Select space' })}</div></div>
    <div style="text-align:right;margin-top:18px"><a class="btn sm out" href="javascript:history.back()">Cancel</a> <button class="btn sm">${p.id ? 'Save Pet' : 'Add Pet'}</button></div></form></main>` + FOOT;
  },
  async 'a-added'(arg, u) {
    return `<header class="top">${LOGO}</header><main id="main" tabindex="-1" class="wrap"><div class="card center" style="max-width:460px;margin:20px auto;padding:34px"><div class="tick" aria-hidden="true">Done</div><h1 style="color:var(--dg);font-size:24px">Pet ${arg === 'edit' ? 'Updated' : 'Added'} Successfully!</h1><a class="btn sm" style="margin-top:30px;padding:12px 24px" href="#/a-pets">Back to Manage Pets</a></div></main>` + FOOT;
  },
  async 'a-apps'(_, u) {
    const list = (await Api.apps()).filter((a) => a.status === 'Pending');
    return staff(u, 'a-apps', `<h1>Applications</h1><div style="display:flex;gap:12px;margin-bottom:20px"><a class="chip on" href="#/a-apps" style="background:var(--dg)" aria-current="page">Pending</a><a class="chip" href="#/approved">Approved</a><a class="chip" href="#/rejected">Rejected</a></div>${list.map((a) => `<div class="row"><b>${esc(a.adopter)} <small class="mut">for ${esc(a.pet)}</small></b><a style="color:var(--dg)" href="#/${u.role === 'Admin' ? 'a-review' : 'v-detail'}/${a.id}" aria-label="View application ${a.id}">View</a></div>`).join('') || `<p class="card center mut" role="status">No pending applications. Great work!</p>`}`);
  },
  async approved() { return P._list('Approved'); },
  async rejected() { return P._list('Rejected'); },
  async _list(s) {
    const list = (await Api.apps()).filter((a) => a.status === s), rej = s === 'Rejected';
    return backBar(`<b style="color:var(--dg)"><span aria-hidden="true">P</span> Pawsitive Admin</b>`) + `<main id="main" tabindex="-1" class="wrap"><h1 class="${rej ? 'bad' : ''}" style="color:${rej ? '' : 'var(--dg)'}">${s} Applications</h1><div class="card"><h2 class="${rej ? 'bad' : ''}">${s} Applicants</h2>${list.map((a) => appRow(a, rej)).join('') || '<p class="mut">Nothing here yet.</p>'}</div></main>`;
  },
  async 'a-review'(id, u) {
    const a = await Api.app(id), pet = await Api.pet(a.petId).catch(() => null);
    return staff(u, 'a-apps', `<h1>Application Review</h1>${details(a, pet)}<div class="card"><b>Status: <span class="${statusCls(a.status)}">${a.status}</span></b>${a.note ? `<p class="mut">Reason: ${esc(a.note)}</p>` : ''}<label for="why">Reason (used if rejecting)</label><select id="why"><option>Incomplete Documents</option><option>Housing Not Suitable</option><option>Eligibility Not Met</option><option>Application Withdrawn</option></select><div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px"><button class="btn sm" onclick="A.decide('${a.id}','Approved')">Approve</button><button class="btn sm red" onclick="A.decide('${a.id}','Rejected')">Reject</button></div></div>`);
  },
  async 'a-users'(_, u) { const us = await Api.users(); return staff(u, 'a-users', `<h1>User Management</h1><p class="mut page-lead">Review registered accounts and their access roles. Use the search field to find a person by name or email before reviewing account details.</p><div class="card"><label for="user-search">Search users</label><input id="user-search" type="search" placeholder="Search by name, email or role" oninput="A.filterUsers(this.value)"><div id="user-list" class="user-list" style="margin-top:18px">${us.map((x) => `<article class="user-item" data-user="${esc((x.name+' '+x.email+' '+x.role).toLowerCase())}"><div><strong>${esc(x.name)}</strong><p class="mut">${esc(x.email || 'Email unavailable')}</p></div><span class="role-label">${esc(x.role)}</span></article>`).join('')}</div><p id="user-empty" class="mut" role="status" hidden>No users match that search. Try a different name, email or role.</p><p class="mut" style="margin-top:16px">Account roles help determine which parts of the platform each person can access. Admin access should be granted only to trusted staff.</p></div>`); },
  async 'a-reports'(_, u) {
    const d = [7, 11.5, 15, 12.5, 18, 22, 19, 26, 30], pts = d.map((v, i) => `${40 + i * 62},${200 - v * 5.6}`).join(' ');
    return staff(u, 'a-reports', `<h1>Reports</h1><div class="card"><h2 style="color:var(--dg);font-size:22px">Monthly Adoption Analytics</h2><p class="mut">Track adoption trends and shelter performance. <b>Sample data (mock).</b></p>
    <div class="grid g2 split" style="grid-template-columns:2fr 1fr;margin:18px 0"><div class="card" style="border:1px solid #eee"><b>Adoptions Over Time</b><svg viewBox="0 0 570 230" width="100%" role="img" aria-label="Line chart: adoptions rose from 7 in January to 30 in September"><polygon points="40,200 ${pts} 536,200" fill="#e8f5e9"/><polyline points="${pts}" fill="none" stroke="#2e7d32" stroke-width="2"/>${d.map((v, i) => `<circle cx="${40 + i * 62}" cy="${200 - v * 5.6}" r="4" fill="#2e7d32"/><text x="${40 + i * 62}" y="220" font-size="11" text-anchor="middle" fill="#555">${'JanFebMarAprMayJunJulAugSep'.substr(i * 3, 3)}</text>`).join('')}</svg></div>
    <div class="card center" style="border:1px solid #eee"><b>Adoption Types</b><svg viewBox="0 0 100 100" width="160" role="img" aria-label="Donut chart: 54% dogs, 31% cats, 15% others"><g fill="none" stroke-width="18" transform="rotate(-90 50 50)"><circle cx="50" cy="50" r="32" stroke="#2e7d32" stroke-dasharray="108.6 201"/><circle cx="50" cy="50" r="32" stroke="#4caf6a" stroke-dasharray="62.3 201" stroke-dashoffset="-108.6"/><circle cx="50" cy="50" r="32" stroke="#b7dcc2" stroke-dasharray="30.1 201" stroke-dashoffset="-170.9"/></g><text x="50" y="53" font-size="14" font-weight="700" text-anchor="middle">78</text></svg><p class="mut">Dogs 42 (54%) • Cats 24 (31%) • Others 12 (15%)</p></div></div>
    <div class="grid g4">${[['01', 'Total Adoptions', 78, 12], ['02', 'Dog Adoptions', 42, 16], ['03', 'Cat Adoptions', 24, 8], ['04', 'Other Adoptions', 12, 5]].map(([i, t, n, p]) => `<div class="card stat" style="border:1px solid #eee"><span aria-hidden="true">${i}</span> <small>${t}</small><b>${n}</b><small class="ok">↑ ${p}% vs last month</small></div>`).join('')}</div></div>`);
  },
  async 'a-settings'(_, u) {
    const s = await Api.settings();
    return staff(u, 'a-settings', `<h1>Settings</h1><form class="card" style="max-width:560px" novalidate onsubmit="A.saveSettings(event)">${field('shelter', 'Shelter Name', { val: s.shelter })}${field('email', 'Email', { type: 'email', val: s.email })}${field('phone', 'Phone', { val: s.phone })}${field('notifications', 'Notifications', { opts: ['Email', 'SMS', 'Off'], val: s.notifications })}<div style="text-align:right;margin-top:16px"><button class="btn sm">Save Changes</button></div></form>`);
  },

  /* ----- volunteer ----- */
  async 'v-dash'(_, u) {
    const apps = (await Api.apps()).slice(0, 3);
    return staff(u, '', `<h1 style="margin:0">Shelter Dashboard</h1><p class="mut" style="margin-bottom:22px">Manage pets and applications</p><div class="grid g2">${[['01', 'Add Pet', 'a-pet/new'], ['02', 'View Applications', 'a-apps'], ['03', 'Manage Pets', 'a-pets'], ['04', 'Update Status', 'v-status']].map(([i, t, r]) => `<a class="card center pet" href="#/${r}" style="padding:30px"><div style="font-size:26px" aria-hidden="true">${i}</div><b>${t}</b></a>`).join('')}</div><h2 style="margin-top:32px">Recent Applications</h2>${apps.map((a) => `<a class="row" href="#/v-detail/${a.id}"><b style="width:30%">${esc(a.pet)}</b><span class="mut" style="width:30%">${a.type}</span><b class="${statusCls(a.status)}">${a.status}</b></a>`).join('')}`);
  },
  async 'v-detail'(id, u) {
    const a = await Api.app(id), pet = await Api.pet(a.petId).catch(() => null);
    return staff(u, '', `<h1>Application Details</h1>${details(a, pet)}<div class="card"><b>Application Status</b><div style="display:flex;gap:20px;align-items:center;margin-top:10px"><span class="pill ${statusCls(a.status)}">${a.status}</span><a class="btn sm" href="#/v-status/${a.id}">Update Status</a></div></div>`);
  },
  async 'v-status'(id, u) {
    const apps = await Api.apps(), a = id ? await Api.app(id) : apps.find((x) => x.status === 'Pending') || apps[0];
    S.newStatus = a.status;
    return staff(u, '', `<h1>Update Status</h1><div class="card" style="max-width:520px;margin:auto;padding:28px"><h2 style="margin:0">${esc(a.adopter)}</h2><p class="mut">Application for ${esc(a.pet)} (${a.id})</p><b style="display:block;margin:22px 0 10px">Current Status</b><div role="radiogroup" aria-label="Status" style="display:flex;gap:10px;flex-wrap:wrap">${['Pending', 'Approved', 'Rejected'].map((s) => `<button role="radio" aria-checked="${s === a.status}" class="chip ${s === a.status ? 'on' : ''}" onclick="A.setNew('${s}',this)">${s}</button>`).join('')}</div><div class="center" style="margin-top:40px"><button class="btn sm" style="padding:12px 34px" onclick="A.saveStatus('${a.id}')">Save Status</button></div></div>`);
  },
  async 'v-profile'(_, u) {
    return staff(u, '', `<h1>Volunteer Profile</h1><form class="card" style="max-width:540px;margin:auto" novalidate onsubmit="A.profile(event)"><div class="tick profile-mark" aria-hidden="true">Volunteer</div>${field('name', 'Volunteer Name', { val: u.name, ro: 1 })}${field('email', 'Email', { val: u.email, ro: 1, type: 'email' })}${field('shelter', 'Shelter', { val: u.shelter, ro: 1 })}${field('phone', 'Phone', { val: u.phone, ro: 1 })}<div style="display:flex;gap:24px;justify-content:center;margin-top:20px"><button class="btn sm" id="eb" type="submit">Edit Profile</button><a class="btn sm" href="#/login" onclick="A.logout();return false">Logout</a></div></form>`);
  },
};

/* ---------- actions (called from the HTML above) ---------- */
const A = {
  filterUsers(q) { const term = q.toLowerCase().trim(); let count = 0; document.querySelectorAll('.user-item').forEach((el) => { const show = el.dataset.user.includes(term); el.hidden = !show; if (show) count++; }); const empty = document.getElementById('user-empty'); if (empty) empty.hidden = count > 0; },
  menu(b) { const n = b.parentElement.querySelector('.nav, .side') || document.querySelector('.nav'); const o = n.classList.toggle('open'); b.setAttribute('aria-expanded', o); },
  logout() { Api.logout(); S.match = {}; go('login'); toast('You have been signed out.'); },
  role(r, el) { S.role = r; document.querySelectorAll('[role=radiogroup] .chip').forEach((c) => { c.classList.toggle('on', c === el); c.setAttribute('aria-checked', c === el); }); const h = document.getElementById('role-hint'); if (h) h.textContent = ROLE_HINT[r]; const v = document.getElementById('vol'); if (v) v.hidden = r !== 'Volunteer'; },
  async auth(e) {
    e.preventDefault(); const f = e.target, su = S.mode === 'signup';
    const rules = { email: [isEmail, 'Enter a valid email address, e.g. name@example.com.'], password: [(v) => v.length >= 5, 'Password must be at least 5 characters.'] };
    if (su) rules.name = req('Enter your full name.');
    if (su && S.role === 'Volunteer') { rules.shelter = req('Enter your shelter name.'); rules.phone = [(v) => /^[+\d][\d\s-]{6,}$/.test(v), 'Enter a valid phone number (at least 7 digits).']; }
    if (!check(f, rules)) return;
    try {
      const u = su ? await Api.signup({ name: f.name.value.trim(), email: f.email.value.trim(), password: f.password.value, role: S.role, shelter: f.shelter.value.trim(), phone: f.phone.value.trim() }) : await Api.login(f.email.value.trim(), f.password.value);
      toast(`Welcome, ${u.name}!`); go(HOME[u.role]);
    } catch (err) { toast(err.message, true); document.getElementById('e-password').textContent = err.message; }
  },
  search(v) { S.q = v; Api.pets().then((p) => { document.getElementById('pg').innerHTML = grid(visible(p), Api.favs()); }); },
  async fav(id, el, label) { try { const on = await Api.toggleFav(id); el.setAttribute('aria-pressed', on); el.textContent = label ? (on ? 'Saved to favourites' : 'Save to favourites') : (on ? 'Saved' : 'Save'); toast(on ? 'Saved to favourites.' : 'Removed from favourites.'); if (route() === 'favs') render(); } catch (err) { toast(err.message || 'Could not update favourites.', true); } },
  pick(key, val, el) { const same = S.match[key] === val; same ? delete S.match[key] : (S.match[key] = val); el.parentElement.querySelectorAll('.opt').forEach((o) => { o.classList.remove('on'); o.setAttribute('aria-checked', false); }); if (!same) { el.classList.add('on'); el.setAttribute('aria-checked', true); } },
  async apply(e, type, petId) {
    e.preventDefault(); const f = e.target, pet = await Api.pet(petId);
    if (!check(f, { fullName: [(v) => v.length > 1, 'Enter your full name.'], email: [isEmail, 'Enter a valid email address.'], phone: [(v) => /^[+\d][\d\s-]{6,}$/.test(v), 'Enter a valid phone number (at least 7 digits).'], address: req('Enter your address.'), living: req('Choose your living situation.'), experience: req('Choose your previous pet experience.') })) return;
    try {
      const a = await Api.apply({ adopter: f.fullName.value.trim(), email: Api.session().email, contactEmail: f.email.value.trim(), phone: f.phone.value, address: f.address.value, living: f.living.value, experience: f.experience.value, pet: pet.name, petId, type });
      go('submitted/' + a.id);
    } catch { toast('We could not submit your application. Please try again.', true); }
  },
  filterList(v) { let n = 0; document.querySelectorAll('#pl .row').forEach((r) => { const s = r.dataset.n.includes(v.toLowerCase()); r.style.display = s ? '' : 'none'; n += s; }); document.getElementById('none').hidden = n > 0; },
  async del(id, name) { if (await ask(`Delete ${name}? This cannot be undone.`)) { await Api.deletePet(id); toast(`${name} was deleted.`); render(); } },
  async savePet(e, id) {
    e.preventDefault(); const f = e.target;
    if (!check(f, { name: req('Enter the pet name.'), type: req('Choose an animal type.'), age: [(v) => v !== '' && +v >= 0 && +v <= 30, 'Enter an age between 0 and 30.'], breed: req('Enter the breed.'), energy: req('Choose an energy level.'), space: req('Choose a living space.') })) return;
    const old = id ? await Api.pet(id) : { sex: 'Female', exp: 'None' };
    await Api.savePet({ ...old, id: id || undefined, name: f.name.value.trim(), type: f.type.value, age: +f.age.value, breed: f.breed.value.trim(), energy: f.energy.value, space: f.space.value, photo: S.photo || undefined });
    go('a-added' + (id ? '/edit' : ''));
  },
  async setPhoto(src) {
    try { S.photo = await shrink(src); document.getElementById('pp').innerHTML = photoPreview(); document.getElementById('rm').hidden = false; toast('Photo added.'); }
    catch (err) { toast(err.message, true); }
  },
  photoFile(inp) {
    const file = inp.files[0]; inp.value = ''; if (!file) return;
    if (!file.type.startsWith('image/')) return toast('Please choose an image file.', true);
    const r = new FileReader(); r.onload = () => A.setPhoto(r.result); r.onerror = () => toast('That file could not be read.', true); r.readAsDataURL(file);
  },
  clearPhoto() { S.photo = ''; document.getElementById('pp').innerHTML = `<div class="ph" style="height:200px;font-size:60px" role="img" aria-label="No photo selected">Photo</div>`; document.getElementById('rm').hidden = true; },
  async camera() {
    if (!navigator.mediaDevices?.getUserMedia) return document.getElementById('pc').click(); // phones: opens the camera app
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); }
    catch { toast('Camera not available, choose a photo instead.', true); return document.getElementById('pc').click(); }
    const d = document.createElement('dialog'); d.style.maxWidth = '460px'; d.style.width = '100%';
    d.innerHTML = `<video autoplay playsinline muted style="width:100%;border-radius:12px;background:#000"></video><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px"><button class="btn sm out" value="x">Cancel</button><button class="btn sm" value="snap">Take photo</button></div>`;
    const v = d.querySelector('video'); v.srcObject = stream;
    const stop = () => { stream.getTracks().forEach((t) => t.stop()); d.close(); d.remove(); };
    d.addEventListener('click', (e) => {
      if (e.target.value === 'x') stop();
      if (e.target.value === 'snap') { const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0); const data = c.toDataURL('image/jpeg', 0.9); stop(); A.setPhoto(data); }
    });
    d.addEventListener('cancel', stop); document.body.append(d); d.showModal();
  },
  async decide(id, status) {
    const note = status === 'Rejected' ? document.getElementById('why').value : '';
    try { await Api.setStatus(id, status, note); toast(`Application ${status.toLowerCase()}.`); go(status.toLowerCase()); } catch (err) { toast(err.message, true); }
  },
  setNew(s, el) { S.newStatus = s; el.parentElement.querySelectorAll('.chip').forEach((c) => { c.classList.toggle('on', c === el); c.setAttribute('aria-checked', c === el); }); },
  async saveStatus(id) { try { await Api.setStatus(id, S.newStatus); toast('Status saved.'); go('v-dash'); } catch (err) { toast(err.message, true); } },
  async saveSettings(e) {
    e.preventDefault(); const f = e.target;
    if (!check(f, { shelter: req('Enter the shelter name.'), email: [isEmail, 'Enter a valid email address.'], phone: req('Enter a phone number.'), notifications: req('Choose a notification option.') })) return;
    await Api.saveSettings({ shelter: f.shelter.value, email: f.email.value, phone: f.phone.value, notifications: f.notifications.value }); toast('Settings saved.');
  },
  async profile(e) {
    e.preventDefault(); const f = e.target, b = document.getElementById('eb'), editing = b.textContent === 'Save Profile';
    if (!editing) { ['name', 'email', 'shelter', 'phone'].forEach((k) => (f[k].readOnly = false)); b.textContent = 'Save Profile'; f.name.focus(); return; }
    if (!check(f, { name: req('Enter your name.'), email: [isEmail, 'Enter a valid email address.'], shelter: req('Enter your shelter.'), phone: req('Enter a phone number.') })) return;
    await Api.saveProfile({ name: f.name.value, shelter: f.shelter.value, phone: f.phone.value }); toast('Profile updated.'); render();
  },
};


/* ---------- inclusive display controls ---------- */
const A11y = (() => {
  let scale = 0, contrast = false, utterance = null;
  const apply = () => {
    document.body.classList.toggle('large-text', scale > 0);
    document.body.classList.toggle('high-contrast', contrast);
    const b = document.getElementById('contrast-toggle');
    if (b) { b.textContent = `High contrast: ${contrast ? 'on' : 'off'}`; b.setAttribute('aria-pressed', String(contrast)); }
  };
  return {
    text(delta) { scale = Math.max(0, Math.min(1, scale + delta)); apply(); },
    contrast() { contrast = !contrast; apply(); },
    reset() { this.stopReading(); scale = 0; contrast = false; apply(); },
    readPage() {
      if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) { toast('Read aloud is not supported by this browser. Please use your screen reader.', true); return; }
      this.stopReading();
      const main = document.querySelector('#main') || document.querySelector('main') || document.body;
      const text = (main.innerText || main.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) { toast('There is no page text available to read.', true); return; }
      utterance = new SpeechSynthesisUtterance(text.slice(0, 12000));
      utterance.rate = 0.92;
      window.speechSynthesis.speak(utterance);
      const button = document.getElementById('read-page-button'); if (button) button.textContent = 'Reading page…';
      utterance.onend = () => { const b = document.getElementById('read-page-button'); if (b) b.textContent = 'Read page aloud'; utterance = null; };
    },
    stopReading() { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); utterance = null; const b = document.getElementById('read-page-button'); if (b) b.textContent = 'Read page aloud'; }
  };
})();;

/* ---------- router ---------- */
async function render() {
  const [r, arg] = (location.hash.slice(2) || 'home').split('?')[0].split('/'), u = Api.session(), rule = ACCESS[r];
  if (rule && (!u || !rule.includes(u.role))) { go(u ? HOME[u.role] : 'login'); if (!u) toast('Please log in to continue.', true); return; }
  try { $app.innerHTML = await (P[r] || P.home)(arg, u); }
  catch (err) { $app.innerHTML = `<main id="main" class="wrap center"><div class="card"><h1>Something went wrong</h1><p class="mut">${esc(err.message)}</p><a class="btn" style="margin-top:16px" href="#/home">Back to Home</a></div></main>`; }
  document.getElementById('main')?.focus({ preventScroll: true }); window.scrollTo(0, 0);
}
addEventListener('hashchange', render); render();
