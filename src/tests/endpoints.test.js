const request = require('supertest')
const app = require('../app')
const prisma = require('../config/db')

jest.setTimeout(30000)

describe('Endpoint Routes', () => {
    let token
    let endpointId

    const testUser = {
        email: 'endpointuser@example.com',
        password: '123456'
    }

    beforeAll(async () => {
        // Delete in correct order: Endpoint → RefreshToken → User
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
    })

    afterAll(async () => {
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

    test('POST /endpoints - should create a new endpoint', async () => {
        const res = await request(app)
            .post('/endpoints')
            .set('Authorization', `Bearer ${token}`)
            .send({
                url: 'https://webhook.site/test',
                name: 'Test Endpoint'
            })

        expect(res.status).toBe(201)
        expect(res.body).toHaveProperty('id')
        expect(res.body).toHaveProperty('secret')
        expect(res.body).toHaveProperty('url', 'https://webhook.site/test')

        endpointId = res.body.id
    })

    test('GET /endpoints - should list all endpoints', async () => {
        const res = await request(app)
            .get('/endpoints')
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('endpoints')
        expect(Array.isArray(res.body.endpoints)).toBe(true)
    })

    test('GET /endpoints/:id - should get a single endpoint', async () => {
        const res = await request(app)
            .get(`/endpoints/${endpointId}`)
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('endpoint')
        expect(res.body.endpoint).toHaveProperty('id', endpointId)
    })

    test('DELETE /endpoints/:id - should delete an endpoint', async () => {
        const res = await request(app)
            .delete(`/endpoints/${endpointId}`)
            .set('Authorization', `Bearer ${token}`)

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('message', 'endpoint deleted successfully')
    })
})