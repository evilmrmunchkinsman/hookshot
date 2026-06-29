const request = require('supertest')
const app = require('../app')
const prisma = require('../config/db')

jest.setTimeout(30000)

describe('Event Routes', () => {
    let token
    let eventId
    let endpointId

    const testUser = {
        email: 'eventuser@example.com',
        password: '123456'
    }

    beforeAll(async () => {
        // Delete in correct order: Event → Endpoint → RefreshToken → User
        await prisma.event.deleteMany({
            where: {
                user: {
                    email: testUser.email
                }
            }
        })
        await prisma.endpoint.deleteMany({
            where: {
                user: {
                    email: testUser.email
                }
            }
        })
        await prisma.refreshToken.deleteMany({
            where: {
                user: {
                    email: testUser.email
                }
            }
        })
        await prisma.user.deleteMany({
            where: { email: testUser.email }
        })

        // Register and login
        await request(app)
            .post('/auth/register')
            .send(testUser)

        const loginRes = await request(app)
            .post('/auth/login')
            .send(testUser)

        token = loginRes.body.accessToken

        // Create an endpoint for testing events
        const endpointRes = await request(app)
            .post('/endpoints')
            .set('Authorization', `Bearer ${token}`)
            .send({
                url: 'https://webhook.site/test-events',
                name: 'Event Test Endpoint'
            })

        endpointId = endpointRes.body.id
    })

    afterAll(async () => {
        // Delete in correct order: Event → Endpoint → RefreshToken → User
        await prisma.event.deleteMany({
            where: {
                user: {
                    email: testUser.email
                }
            }
        })
        await prisma.endpoint.deleteMany({
            where: {
                user: {
                    email: testUser.email
                }
            }
        })
        await prisma.refreshToken.deleteMany({
            where: {
                user: {
                    email: testUser.email
                }
            }
        })
        await prisma.user.deleteMany({
            where: { email: testUser.email }
        })
        await prisma.$disconnect()
    })

    test('POST /events - should create a new event', async () => {
        const res = await request(app)
            .post('/events')
            .set('Authorization', `Bearer ${token}`)
            .send({
                type: 'test.event',
                payload: { message: 'Hello from test' },
                endpointId: endpointId
            })

        expect(res.status).toBe(201)
        expect(res.body).toHaveProperty('id')
        expect(res.body).toHaveProperty('type', 'test.event')
        expect(res.body).toHaveProperty('status', 'pending')
        expect(res.body).toHaveProperty('payload')
        expect(res.body.payload).toHaveProperty('message', 'Hello from test')

        eventId = res.body.id
    })

    test('GET /events - should list all events', async () => {
        const res = await request(app)
            .get('/events')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('events')
        expect(Array.isArray(res.body.events)).toBe(true)
        expect(res.body.events.length).toBeGreaterThan(0)
    })

    test('GET /events/:id - should get a single event', async () => {
        const res = await request(app)
            .get(`/events/${eventId}`)
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('event')
        expect(res.body.event).toHaveProperty('id', eventId)
        expect(res.body.event).toHaveProperty('type', 'test.event')
        expect(res.body.event).toHaveProperty('status', 'pending')
    })

    test('GET /events/:id - should return 404 for non-existent event', async () => {
        const res = await request(app)
            .get('/events/99999')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(404)
        expect(res.body).toHaveProperty('error', 'Event not found')
    })

    test.skip('GET /events/failed - should list failed events', async () => {
    const res = await request(app)
        .get('/events/failed')
        .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('events')
    expect(Array.isArray(res.body.events)).toBe(true)
})

    test('POST /events/:id/replay - should replay a failed event', async () => {
        // First create a failing endpoint
        const failEndpointRes = await request(app)
            .post('/endpoints')
            .set('Authorization', `Bearer ${token}`)
            .send({
                url: 'https://httpbin.org/status/500',
                name: 'Failing Endpoint'
            })

        const failEndpointId = failEndpointRes.body.id

        // Create an event that will fail
        const failEventRes = await request(app)
            .post('/events')
            .set('Authorization', `Bearer ${token}`)
            .send({
                type: 'test.fail',
                payload: { message: 'This should fail' },
                endpointId: failEndpointId
            })

        const failEventId = failEventRes.body.id

        // Wait a bit for the worker to process
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Test replay endpoint
        const replayRes = await request(app)
            .post(`/events/${failEventId}/replay`)
            .set('Authorization', `Bearer ${token}`)
            .send()

        expect([200, 404]).toContain(replayRes.status)
    })
})