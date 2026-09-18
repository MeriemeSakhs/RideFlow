const request = require('supertest');
const jwt = require('jsonwebtoken');
const { buildApp, connect, disconnect, clearDB } = require('./testSetup');

const app = buildApp();

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
beforeEach(async () => { await clearDB(); });

const validUser = {
    fullName: 'Jane Dispatcher',
    dateOfBirth: '1990-05-15',
    email: 'test@example.com',
    password: 'password123',
    confirmPassword: 'password123',
    companyName: 'Acme Transport',
    role: 'dispatcher',
};

async function registerUser(overrides = {}) {
    return request(app).post('/user/signup').send({ ...validUser, ...overrides });
}

describe('POST /user/login', () => {
    test('logs in with valid credentials and returns accessToken', async () => {
        await registerUser();
        const res = await request(app).post('/user/login').send({
            email: validUser.email,
            password: validUser.password
        });
        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeDefined();
    });

    test('JWT payload carries role/company and never the password', async () => {
        await registerUser();
        const res = await request(app).post('/user/login').send({
            email: validUser.email,
            password: validUser.password
        });
        const decoded = jwt.decode(res.body.accessToken);
        expect(decoded.password).toBeUndefined();
        expect(decoded.email).toBe(validUser.email);
        expect(decoded.fullName).toBe(validUser.fullName);
        expect(decoded.role).toBe('dispatcher');
        expect(decoded.companyName).toBe(validUser.companyName);
        expect(decoded.companySlug).toBe('acme transport');
    });

    test('login is case-insensitive on email', async () => {
        await registerUser();
        const res = await request(app).post('/user/login').send({
            email: validUser.email.toUpperCase(),
            password: validUser.password
        });
        expect(res.status).toBe(200);
    });

    test('rejects wrong password with 401', async () => {
        await registerUser();
        const res = await request(app).post('/user/login').send({
            email: validUser.email,
            password: 'wrongpassword'
        });
        expect(res.status).toBe(401);
    });

    test('rejects a non-existent email with 401', async () => {
        const res = await request(app).post('/user/login').send({
            email: 'nobody@example.com',
            password: 'password123'
        });
        expect(res.status).toBe(401);
    });

    test('rejects an invalid email format with 400', async () => {
        const res = await request(app).post('/user/login').send({
            email: 'not-an-email',
            password: 'password123'
        });
        expect(res.status).toBe(400);
    });

    test('rejects a missing password with 400', async () => {
        const res = await request(app).post('/user/login').send({ email: validUser.email });
        expect(res.status).toBe(400);
    });

    test('does not leak whether the account exists via the error message', async () => {
        await registerUser();
        const wrongPassword = await request(app).post('/user/login').send({ email: validUser.email, password: 'wrongpassword' });
        const noSuchUser = await request(app).post('/user/login').send({ email: 'nobody@example.com', password: 'wrongpassword' });
        expect(wrongPassword.body.message).toBe(noSuchUser.body.message);
    });

    test('register then login round-trip succeeds for a manager', async () => {
        const signupRes = await registerUser({ role: 'manager' });
        expect(signupRes.status).toBe(201);

        const loginRes = await request(app).post('/user/login').send({
            email: validUser.email,
            password: validUser.password
        });
        expect(loginRes.status).toBe(200);
        const decoded = jwt.decode(loginRes.body.accessToken);
        expect(decoded.role).toBe('manager');
    });
});
