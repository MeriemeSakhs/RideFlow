const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { buildApp, connect, disconnect, clearDB } = require('./testSetup');
const Ride = require('../models/rideModel');

const app = buildApp();

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
beforeEach(async () => { await clearDB(); });

const makeToken = (role) => jwt.sign(
    { id: 'test-user-id', email: 'test@example.com', username: 'testuser', role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
);

const dispatcherAuth = { Authorization: `Bearer ${makeToken('dispatcher')}` };
const managerAuth = { Authorization: `Bearer ${makeToken('manager')}` };
const driverAuth = { Authorization: `Bearer ${makeToken('driver')}` };

const validRide = {
    pickupLocation: '123 Main St, Salem, MA',
    dropoffLocation: '456 Ocean Ave, Salem, MA',
    rideDate: '2026-10-01T14:00:00.000Z',
    passengerName: 'Jane Doe',
    passengerPhone: '+15551234567',
    vehicleType: 'sedan',
};

describe('Ride route authentication and authorization', () => {
    test('rejects creating a ride with no Authorization header', async () => {
        const res = await request(app).post('/ride').send(validRide);
        expect(res.status).toBe(401);
    });

    test('rejects creating a ride with a malformed/invalid token', async () => {
        const res = await request(app).post('/ride').set({ Authorization: 'Bearer not-a-real-token' }).send(validRide);
        expect(res.status).toBe(401);
    });

    test('rejects a driver from creating a ride', async () => {
        const res = await request(app).post('/ride').set(driverAuth).send(validRide);
        expect(res.status).toBe(403);
    });

    test('rejects a manager from creating a ride', async () => {
        const res = await request(app).post('/ride').set(managerAuth).send(validRide);
        expect(res.status).toBe(403);
    });

    test('rejects a driver from listing rides', async () => {
        const res = await request(app).get('/ride').set(driverAuth);
        expect(res.status).toBe(403);
    });

    test('allows a manager to list rides', async () => {
        const res = await request(app).get('/ride').set(managerAuth);
        expect(res.status).toBe(200);
    });

    test('rejects a driver from cancelling a ride', async () => {
        const created = await request(app).post('/ride').set(dispatcherAuth).send(validRide);
        const res = await request(app).patch(`/ride/${created.body._id}/cancel`).set(driverAuth);
        expect(res.status).toBe(403);
    });
});

describe('POST /ride', () => {
    test('creates a ride successfully with status "requested"', async () => {
        const res = await request(app).post('/ride').set(dispatcherAuth).send(validRide);
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('requested');
        expect(res.body.pickupLocation).toBe(validRide.pickupLocation);
        expect(res.body.assignedDriver).toBeNull();
    });

    test('rejects a request missing pickupLocation', async () => {
        const { pickupLocation, ...incomplete } = validRide;
        const res = await request(app).post('/ride').set(dispatcherAuth).send(incomplete);
        expect(res.status).toBe(400);
    });

    test('rejects a request missing passengerPhone', async () => {
        const { passengerPhone, ...incomplete } = validRide;
        const res = await request(app).post('/ride').set(dispatcherAuth).send(incomplete);
        expect(res.status).toBe(400);
    });

    test('rejects an invalid rideDate', async () => {
        const res = await request(app).post('/ride').set(dispatcherAuth).send({ ...validRide, rideDate: 'not-a-date' });
        expect(res.status).toBe(400);
    });

    test('rejects a rideDate in the past', async () => {
        const res = await request(app).post('/ride').set(dispatcherAuth).send({ ...validRide, rideDate: '2020-01-01T00:00:00.000Z' });
        expect(res.status).toBe(400);
    });

    test('rejects an invalid passengerPhone format', async () => {
        const res = await request(app).post('/ride').set(dispatcherAuth).send({ ...validRide, passengerPhone: 'abc' });
        expect(res.status).toBe(400);
    });

    test('rejects a passengerPhone not in E.164 format', async () => {
        const res = await request(app).post('/ride').set(dispatcherAuth).send({ ...validRide, passengerPhone: '(555) 123-4567' });
        expect(res.status).toBe(400);
    });

    test('rejects when pickup and dropoff locations are identical', async () => {
        const res = await request(app).post('/ride').set(dispatcherAuth).send({
            ...validRide, dropoffLocation: validRide.pickupLocation,
        });
        expect(res.status).toBe(400);
    });

    test('rejects an empty vehicleType', async () => {
        const res = await request(app).post('/ride').set(dispatcherAuth).send({ ...validRide, vehicleType: '   ' });
        expect(res.status).toBe(400);
    });

    test('rejects a pickupLocation over 200 characters', async () => {
        const res = await request(app).post('/ride').set(dispatcherAuth).send({ ...validRide, pickupLocation: 'a'.repeat(201) });
        expect(res.status).toBe(400);
    });

    test('ignores an attempt to set status directly on create', async () => {
        const res = await request(app).post('/ride').set(dispatcherAuth).send({ ...validRide, status: 'completed' });
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('requested');
    });
});

describe('GET /ride and GET /ride/:id', () => {
    test('lists all rides', async () => {
        await request(app).post('/ride').set(dispatcherAuth).send(validRide);
        await request(app).post('/ride').set(dispatcherAuth).send({ ...validRide, passengerName: 'John Smith' });

        const res = await request(app).get('/ride').set(dispatcherAuth);
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(2);
    });

    test('filters rides by valid status', async () => {
        await request(app).post('/ride').set(dispatcherAuth).send(validRide);

        const res = await request(app).get('/ride?status=requested').set(dispatcherAuth);
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);

        const empty = await request(app).get('/ride?status=cancelled').set(dispatcherAuth);
        expect(empty.body.length).toBe(0);
    });

    test('rejects an invalid status filter', async () => {
        const res = await request(app).get('/ride?status=not-a-real-status').set(dispatcherAuth);
        expect(res.status).toBe(400);
    });

    test('retrieves a single ride by id', async () => {
        const created = await request(app).post('/ride').set(dispatcherAuth).send(validRide);
        const res = await request(app).get(`/ride/${created.body._id}`).set(dispatcherAuth);
        expect(res.status).toBe(200);
        expect(res.body._id).toBe(created.body._id);
    });

    test('returns 404 for a well-formed id that does not exist', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app).get(`/ride/${fakeId}`).set(dispatcherAuth);
        expect(res.status).toBe(404);
    });

    test('returns 400 for a malformed id', async () => {
        const res = await request(app).get('/ride/not-a-valid-id').set(dispatcherAuth);
        expect(res.status).toBe(400);
    });
});

describe('PUT /ride/:id', () => {
    test('updates ride details successfully', async () => {
        const created = await request(app).post('/ride').set(dispatcherAuth).send(validRide);
        const res = await request(app).put(`/ride/${created.body._id}`).set(dispatcherAuth).send({ passengerName: 'Updated Name' });
        expect(res.status).toBe(200);
        expect(res.body.passengerName).toBe('Updated Name');
    });

    test('returns 404 when updating a ride that does not exist', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app).put(`/ride/${fakeId}`).set(dispatcherAuth).send({ passengerName: 'Updated Name' });
        expect(res.status).toBe(404);
    });

    test('returns 400 when no fields are provided', async () => {
        const created = await request(app).post('/ride').set(dispatcherAuth).send(validRide);
        const res = await request(app).put(`/ride/${created.body._id}`).set(dispatcherAuth).send({});
        expect(res.status).toBe(400);
    });

    test('rejects an update that makes pickup and dropoff identical', async () => {
        const created = await request(app).post('/ride').set(dispatcherAuth).send(validRide);
        const res = await request(app).put(`/ride/${created.body._id}`).set(dispatcherAuth).send({
            dropoffLocation: validRide.pickupLocation,
        });
        expect(res.status).toBe(400);
    });

    test('rejects an update moving rideDate into the past', async () => {
        const created = await request(app).post('/ride').set(dispatcherAuth).send(validRide);
        const res = await request(app).put(`/ride/${created.body._id}`).set(dispatcherAuth).send({
            rideDate: '2020-01-01T00:00:00.000Z',
        });
        expect(res.status).toBe(400);
    });

    test('rejects updating a cancelled ride', async () => {
        const created = await request(app).post('/ride').set(dispatcherAuth).send(validRide);
        await request(app).patch(`/ride/${created.body._id}/cancel`).set(dispatcherAuth);

        const res = await request(app).put(`/ride/${created.body._id}`).set(dispatcherAuth).send({ passengerName: 'Too Late' });
        expect(res.status).toBe(409);
    });

    test('rejects updating a completed ride', async () => {
        const created = await request(app).post('/ride').set(dispatcherAuth).send(validRide);
        await Ride.findByIdAndUpdate(created.body._id, { status: 'completed' });

        const res = await request(app).put(`/ride/${created.body._id}`).set(dispatcherAuth).send({ passengerName: 'Too Late' });
        expect(res.status).toBe(409);
    });
});

describe('PATCH /ride/:id/cancel', () => {
    test('cancels a requested ride successfully', async () => {
        const created = await request(app).post('/ride').set(dispatcherAuth).send(validRide);
        const res = await request(app).patch(`/ride/${created.body._id}/cancel`).set(dispatcherAuth);
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('cancelled');
    });

    test('returns 404 when cancelling a ride that does not exist', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app).patch(`/ride/${fakeId}/cancel`).set(dispatcherAuth);
        expect(res.status).toBe(404);
    });

    test('rejects cancelling an already cancelled ride', async () => {
        const created = await request(app).post('/ride').set(dispatcherAuth).send(validRide);
        await request(app).patch(`/ride/${created.body._id}/cancel`).set(dispatcherAuth);

        const res = await request(app).patch(`/ride/${created.body._id}/cancel`).set(dispatcherAuth);
        expect(res.status).toBe(409);
    });

    test('rejects cancelling an already completed ride', async () => {
        const created = await request(app).post('/ride').set(dispatcherAuth).send(validRide);
        await Ride.findByIdAndUpdate(created.body._id, { status: 'completed' });

        const res = await request(app).patch(`/ride/${created.body._id}/cancel`).set(dispatcherAuth);
        expect(res.status).toBe(409);
    });
});
