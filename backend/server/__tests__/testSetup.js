// Default auto-downloaded mongod (8.x) requires macOS 14+; pin a version built
// against an older SDK so tests also run on macOS 13.
if (!process.env.MONGOMS_VERSION) process.env.MONGOMS_VERSION = '6.0.14';

// Tests must NEVER send a real email, regardless of what SMTP credentials
// happen to be present in the real .env (utilities/mailer.js loads it via
// its own dotenv.config() call). This is registered here, before anything
// requires utilities/mailer - routes/userSignUp.js is the only caller, and
// it's required lazily inside buildApp() below - so every test that goes
// through buildApp() gets the mock with no per-file opt-in required, and no
// risk of a future test file forgetting to mock it. A test that needs to
// assert what the signup flow sent can import `mailer` from this module's
// exports and inspect sendSignupVerificationCode.mock.calls.
jest.mock('../utilities/mailer', () => ({
    sendSignupVerificationCode: jest.fn().mockResolvedValue(undefined),
    sendEmailChangeCode: jest.fn().mockResolvedValue(undefined),
}));
const mailer = require('../utilities/mailer');

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');

let mongoServer;

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/user', require('../routes/userLogin'));
    app.use('/user', require('../routes/userSignUp'));
    app.use('/ride', require('../routes/rideRoutes'));
    return app;
}

async function connect() {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
}

async function disconnect() {
    await mongoose.disconnect();
    await mongoServer.stop();
}

async function clearDB() {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
}

module.exports = { buildApp, connect, disconnect, clearDB, mailer };
