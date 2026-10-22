// Loads the same demo data the front-end prototype used. Run: npm run seed
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { User, Pet, Application, Counter, Settings } = require('./models');

// [name, type, age, sex, breed, energy, space, experience]
const PETS = [
  ['Luna','Cat',2,'Female','Tabby','Low','Apartment','None'],['Misty','Cat',1,'Female','Calico','Medium','Apartment','None'],
  ['Coco','Cat',2,'Male','Tabby','Medium','House','Some'],['Bob','Cat',3,'Male','Ginger','Low','Apartment','None'],
  ['Oreo','Cat',1,'Male','Domestic Shorthair','High','House','Some'],['Nala','Cat',2,'Female','Domestic Shorthair','Low','Apartment','Some'],
  ['Kitty','Cat',1,'Female','Domestic Shorthair','Medium','Apartment','None'],['Sweets','Cat',2,'Female','Orange Tabby','Low','House','None'],
  ['Winter','Cat',2,'Female','Persian','Low','Apartment','None'],['Mochi','Cat',3,'Female','Domestic Shorthair','Medium','Apartment','None'],
  ['Kuru','Cat',2,'Female','Domestic Shorthair','Medium','House','Some'],
  ['Buddy','Dog',1,'Male','Golden Retriever','Medium','House','None'],['Bella','Dog',2,'Female','Afghan Hound','High','Large Space','Experienced'],
  ['Max','Dog',3,'Male','Labrador','Medium','House','Some'],['Rocky','Dog',1,'Male','Poodle','Medium','Apartment','None'],
  ['Bluy','Dog',2,'Male','Akita','High','Large Space','Experienced'],['Charlie','Dog',2,'Male','Pomeranian','Medium','Apartment','None'],
  ['Cooper','Dog',4,'Male','Rottweiler','High','Large Space','Experienced'],['Milo','Dog',1,'Male','Samoyed','High','Large Space','Some'],
  ['Puby','Dog',3,'Female','German Shepherd','High','Large Space','Experienced'],
].map(([name, type, age, sex, breed, energy, space, exp]) => ({ name, type, age, sex, breed, energy, space, exp }));

const USERS = [
  ['Demo Adopter', 'adopter@pawsitive.bt', 'Adopter'], ['Pema Lhaki', 'admin@pawsitive.bt', 'Admin'],
  ['Karma Yangzom', 'volunteer@pawsitive.bt', 'Volunteer', { shelter: 'GCIT Animal Shelter', phone: '+975 17XXXXXXX' }],
  ['Kelzang Deki', 'kelzang@example.com', 'Adopter'], ['Ngawang uden', 'ngawang@example.com', 'Adopter'], ['Sonam Wangmo', 'sonam@example.com', 'Adopter'],
];
// [n, pet, adopter, email, type, status, date-note]
const APPS = [
  [1024,'Bella','Kelzang Deki','kelzang@example.com','Adoption','Pending'],[1023,'Luna','Demo Adopter','adopter@pawsitive.bt','Adoption','Pending'],
  [1022,'Buddy','Demo Adopter','adopter@pawsitive.bt','Fostering','Approved'],[1021,'Mochi','Demo Adopter','adopter@pawsitive.bt','Adoption','Rejected','Housing Not Suitable'],
  [1020,'Max','Karma Yangzom','karma@example.com','Fostering','Approved'],[1019,'Luna','Sonam Wangmo','sonam@example.com','Adoption','Pending'],
  [1018,'Charlie','Pema Choden','pema@example.com','Fostering','Approved'],[1017,'Milo','Tashi Dorji','tashi@example.com','Adoption','Approved'],
  [1016,'Coco','Nima Wangdi','nima@example.com','Adoption','Rejected','Housing Not Suitable'],[1015,'Rocky','Choki Lham','choki@example.com','Adoption','Rejected','Application Withdrawn'],
];

async function seed() {
  await Promise.all([User, Pet, Application, Counter, Settings].map((m) => m.deleteMany({})));
  const hash = await bcrypt.hash('paw123', 10);
  await User.insertMany(USERS.map(([name, email, role, extra]) => ({ name, email, role, password: hash, ...extra })));
  const pets = await Pet.insertMany(PETS);
  const byName = Object.fromEntries(pets.map((p) => [p.name, p]));
  await Application.insertMany(APPS.map(([n, pet, adopter, email, type, status, note = '']) =>
    ({ code: 'PAW-' + n, pet, petId: byName[pet]._id, adopter, email, type, status, note })));
  await Counter.create({ _id: 'application', seq: 1025 });
  await Settings.create({ shelter: 'GCIT Animal Shelter', email: 'shelter@pawsitive.bt', phone: '+975 17XXXXXXX', notifications: 'Email' });
  console.log(`Seeded ${pets.length} pets, ${USERS.length} users, ${APPS.length} applications.`);
}

module.exports = seed;
if (require.main === module) {
  mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pawsitive')
    .then(seed).then(() => mongoose.disconnect()).catch((e) => { console.error(e); process.exit(1); });
}
