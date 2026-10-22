# Pawsitive — pet adoption and fostering platform

Pawsitive helps prospective adopters and foster carers discover pets, compare lifestyle needs, save favourites, submit applications and follow their progress. Staff tools support pet listings and application review.

## Highlights
- Custom vector Pawsitive emblem and wordmark, with no emoji-based branding or interface icons.
- Responsive navigation, readable type sizes, consistent primary/secondary buttons and higher-contrast text colors.
- Accessibility controls: larger text, high contrast, browser text-to-speech for the main page, keyboard focus indicators, skip-to-content navigation, descriptive image alternatives, and reduced-motion support.
- Deaf/hard-of-hearing support: important feedback is delivered as visible written status and validation messages, not audio-only alerts.
- Interactive pet browsing, search, lifestyle filters, favourites, application tracking, staff pet management, application review, user search and reports.

## Technology and launch
- Node.js 18+, Express, MongoDB, Mongoose, bcryptjs and JWT dependencies.
- Front end: HTML, CSS and vanilla JavaScript.
- Database models: User, Pet, Application, Counter and Settings, including required fields, enums, validation and query indexes.

### Run the demo UI
1. Extract the ZIP and open a terminal in the inner `Pawsitive` folder (the one containing `package.json`).
2. Run `npm install`.
3. For the UI demonstration, run `npm run dev` after MongoDB is running and open `http://localhost:3000`.
4. The server requires MongoDB at `mongodb://localhost:27017/pawsitive` by default. Set `MONGO_URI` in `.env` to use another database.

### Seed demo database records
Run `npm run seed` while MongoDB is available. Demo password: `paw123`.
- `adopter@pawsitive.bt`
- `admin@pawsitive.bt`
- `volunteer@pawsitive.bt`

## Assessment mapping
- **Model Schema (5 marks):** Mongoose User, Pet, Application, Counter and Settings schemas with field validation, enums, references and indexes.
- **Front-end Pages (5 marks):** home, browse/filter, pet detail, login/signup, favourites, applications, profile and staff pages.
- **Application Launch (10 marks):** Express server, REST endpoints, MongoDB connection, seed script and `/api/health`.
- **Admin Dashboard (5 marks):** overview counts, pet management, application review, user listing/search, reports and settings.

## MongoDB persistence (real API)

The browser now uses the Express REST API in `server/index.js`; `mock-api.js` is an API client and no longer saves application data to localStorage. Accounts, pets, applications, favourites, profile changes and settings are persisted through MongoDB.

1. Start MongoDB Community Server (or configure `MONGO_URI` for your MongoDB instance).
2. Copy `.env.example` to `.env` and set `MONGO_URI` and a private `JWT_SECRET` if needed.
3. In this folder, run `npm install` and then `npm run dev`.
4. Open `http://localhost:3000` (do not open `index.html` directly from File Explorer).
5. Check `http://localhost:3000/api/health`. The response should contain `"db":true`.

The first server start seeds sample records only when the Pet collection is empty. Demo accounts use password `paw123`: `adopter@pawsitive.bt`, `volunteer@pawsitive.bt`, and `admin@pawsitive.bt`. If the database already contains pets but is missing demo accounts, run `npm run seed`; **this resets the existing collections** before inserting the sample data, so only do this for a disposable development database.

For security, public sign-up supports Adopter and Volunteer accounts; Admin accounts cannot be created through public registration. Volunteer registration requires a shelter name and phone number. On server startup, missing demo Admin and Volunteer accounts are created automatically without deleting existing data. To intentionally reset their demo passwords, run `npm run setup:staff`. Demo credentials are `admin@pawsitive.bt` and `volunteer@pawsitive.bt`, password `paw123`. This password is for local coursework demos only. Set `DEMO_STAFF_PASSWORD` before running the script if you want a different password. Passwords are stored as salted bcrypt hashes (cost factor 12), and login verifies them with `bcrypt.compare`. Keep `.env` private and never publish your JWT secret.


## Public landing page
Visitors first arrive at the Pawsitive landing page. Guests can read the public About page, then choose **Get Started** to create an adopter account or **Log In** to sign in. Public signup supports Adopter and Volunteer; Admin accounts are provisioned securely. Pet browsing, favourites, applications, and staff dashboards remain behind authentication.
