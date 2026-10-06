const request = require('supertest');
const { buildApp, connect, disconnect, clearDB, mailer } = require('./testSetup');

const app = buildApp();

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
beforeEach(async () => {
    await clearDB();
    mailer.sendSignupVerificationCode.mockClear();
});

const validUser = {
    fullName: 'Jane Dispatcher',
    dateOfBirth: '1990-05-15',
    email: 'test@example.com',
    password: 'password123',
    confirmPassword: 'password123',
    companyName: 'Acme Transport',
    role: 'dispatcher',
};

describe('POST /user/signup', () => {
    test('registers a new dispatcher successfully', async () => {
        const res = await request(app).post('/user/signup').send(validUser);
        expect(res.status).toBe(201);
        expect(res.body.fullName).toBe(validUser.fullName);
        expect(res.body.email).toBe(validUser.email);
        expect(res.body.role).toBe('dispatcher');
        expect(res.body.companyName).toBe(validUser.companyName);
        expect(res.body.companySlug).toBe('acme transport');
    });

    test('calls the verification-email function with the correct email, full name, and code - and never sends a real email', async () => {
        const res = await request(app).post('/user/signup').send(validUser);
        expect(res.status).toBe(201);

        // The mailer is mocked (see testSetup.js) - this asserts the signup
        // flow called it with the right arguments, without ever touching a
        // real SMTP transport.
        expect(mailer.sendSignupVerificationCode).toHaveBeenCalledTimes(1);
        const [calledEmail, calledFullName, calledCode] = mailer.sendSignupVerificationCode.mock.calls[0];
        expect(calledEmail).toBe(validUser.email);
        expect(calledFullName).toBe(validUser.fullName);
        expect(calledCode).toMatch(/^\d{6}$/);

        // Cross-check against the real hashing function (not reimplemented
        // here) that the code passed to the mailer is the SAME code the
        // signup flow actually hashed and stored for verification - not
        // just a plausible-looking value.
        const { hashCode } = require('../utilities/verificationCode');
        const userModel = require('../models/userModel');
        const savedUser = await userModel.findOne({ email: validUser.email });
        expect(savedUser.emailVerificationCodeHash).toBe(hashCode(calledCode));
    });

    test('registers a new manager successfully', async () => {
        const res = await request(app).post('/user/signup').send({ ...validUser, role: 'manager' });
        expect(res.status).toBe(201);
        expect(res.body.role).toBe('manager');
    });

    test('does not return the password hash in the response', async () => {
        const res = await request(app).post('/user/signup').send(validUser);
        expect(res.body.password).toBeUndefined();
    });

    test('normalizes companySlug regardless of casing/whitespace', async () => {
        const res = await request(app).post('/user/signup').send({ ...validUser, companyName: '  Acme Transport  ' });
        expect(res.status).toBe(201);
        expect(res.body.companySlug).toBe('acme transport');
    });

    test('rejects duplicate email with 409', async () => {
        await request(app).post('/user/signup').send(validUser);
        const res = await request(app).post('/user/signup').send({ ...validUser, fullName: 'Someone Else' });
        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/already exists/i);
    });

    test('rejects invalid email format with 400', async () => {
        const res = await request(app).post('/user/signup').send({ ...validUser, email: 'not-an-email' });
        expect(res.status).toBe(400);
    });

    test('rejects password shorter than 8 characters with 400', async () => {
        const res = await request(app).post('/user/signup').send({ ...validUser, password: 'short', confirmPassword: 'short' });
        expect(res.status).toBe(400);
    });

    test('rejects mismatched password/confirmPassword with 400', async () => {
        const res = await request(app).post('/user/signup').send({ ...validUser, confirmPassword: 'somethingElse123' });
        expect(res.status).toBe(400);
    });

    test('rejects missing full name with 400', async () => {
        const { fullName, ...incomplete } = validUser;
        const res = await request(app).post('/user/signup').send(incomplete);
        expect(res.status).toBe(400);
    });

    test('rejects missing company name with 400', async () => {
        const { companyName, ...incomplete } = validUser;
        const res = await request(app).post('/user/signup').send(incomplete);
        expect(res.status).toBe(400);
    });

    test('rejects a date of birth in the future with 400', async () => {
        const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString();
        const res = await request(app).post('/user/signup').send({ ...validUser, dateOfBirth: futureDate });
        expect(res.status).toBe(400);
    });

    test('rejects an invalid date of birth with 400', async () => {
        const res = await request(app).post('/user/signup').send({ ...validUser, dateOfBirth: 'not-a-date' });
        expect(res.status).toBe(400);
    });

    test('rejects role "driver" - drivers are not self-registered users', async () => {
        const res = await request(app).post('/user/signup').send({ ...validUser, role: 'driver' });
        expect(res.status).toBe(400);
    });

    test('rejects an invalid/unknown role with 400', async () => {
        const res = await request(app).post('/user/signup').send({ ...validUser, role: 'admin' });
        expect(res.status).toBe(400);
    });

    test('rejects missing fields with 400', async () => {
        const res = await request(app).post('/user/signup').send({});
        expect(res.status).toBe(400);
    });
});
