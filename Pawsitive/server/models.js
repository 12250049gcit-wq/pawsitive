const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const opts = { timestamps: true, toJSON: { versionKey: false } };

const User = model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { type: String, required: true },
  role: { type: String, enum: ['Adopter', 'Admin', 'Volunteer'], default: 'Adopter' },
  shelter: String,
  phone: String,
  favourites: [{ type: Schema.Types.ObjectId, ref: 'Pet' }],
}, opts));

const Pet = model('Pet', new Schema({
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
  type: { type: String, enum: ['Cat', 'Dog'], required: true },
  age: { type: Number, min: 0, max: 30, required: true },
  sex: { type: String, default: 'Female' },
  breed: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  energy: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
  space: { type: String, enum: ['Apartment', 'House', 'Large Space'], required: true },
  exp: { type: String, enum: ['None', 'Some', 'Experienced'], default: 'None' },
  photo: String, // resized JPEG data URL from "choose photo" / "take photo"
}, opts));

const Application = model('Application', new Schema({
  code: { type: String, required: true, unique: true, trim: true, match: /^PAW-\d+$/ }, // e.g. PAW-1024
  adopter: String, email: String, contactEmail: String, phone: String, address: String,
  living: String, experience: String,
  pet: String, petId: { type: Schema.Types.ObjectId, ref: 'Pet' },
  type: { type: String, enum: ['Adoption', 'Fostering'], required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', required: true },
  note: { type: String, default: '' },
}, opts));

const Counter = model('Counter', new Schema({ _id: { type: String, required: true }, seq: { type: Number, min: 0, default: 0 } }));
const Settings = model('Settings', new Schema({ shelter: { type: String, trim: true, maxlength: 120 }, email: { type: String, trim: true, lowercase: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }, phone: { type: String, trim: true, maxlength: 30 }, notifications: { type: String, enum: ['Email', 'SMS', 'Off'], default: 'Email' } }, opts));

// Common admin/adopter lookups stay efficient as the collection grows.
User.schema.index({ role: 1, createdAt: -1 });
Pet.schema.index({ type: 1, energy: 1, space: 1 });
Application.schema.index({ status: 1, createdAt: -1 });
Application.schema.index({ email: 1, createdAt: -1 });

module.exports = { User, Pet, Application, Counter, Settings };
