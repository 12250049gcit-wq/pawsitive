// Create or repair the local demo Admin and Volunteer accounts.
// For coursework/demo use only. Change these credentials before any real deployment.
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('./models');

const DEMO_PASSWORD = process.env.DEMO_STAFF_PASSWORD || 'paw123';
const STAFF_USERS = [
  { name: 'Pema Lhaki', email: 'admin@pawsitive.bt', role: 'Admin' },
  { name: 'Karma Yangzom', email: 'volunteer@pawsitive.bt', role: 'Volunteer', shelter: 'GCIT Animal Shelter', phone: '+975 17123456' },
];

async function setupStaff() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pawsitive');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  for (const account of STAFF_USERS) {
    // These are reserved demo accounts. Repair their role and reset their demo
    // password so the documented credentials work even if an old record exists.
    const { email, ...details } = account;
    await User.findOneAndUpdate(
      { email },
      { $set: { ...details, email, password: passwordHash } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    console.log(`Ready: ${account.role} account ${email}`);
  }
  console.log(`Demo staff setup complete. Password: ${DEMO_PASSWORD}`);
}

setupStaff()
  .catch((err) => { console.error('Could not set up demo staff accounts:', err.message); process.exitCode = 1; })
  .finally(async () => { await mongoose.disconnect(); });
