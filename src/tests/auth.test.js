const request = require('supertest')
const app = require('../app')
const prisma = require('../config/db')
jest.setTimeout(30000)  // 30 seconds

describe('Auth Routes', () => {
    let testUser = {
        email: 'test@example.com',
        password: '123456'
    }

    // Clean up in correct order
    beforeAll(async () => {
        // Delete refresh tokens first, then user
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
    })

    afterAll(async () => {
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

    test('POST /auth/register - should register a new user', async () => {
        const res = await request(app)
            .post('/auth/register')
            .send(testUser)

        expect(res.status).toBe(201)
        expect(res.body).toHaveProperty('message')
        expect(res.body.user).toHaveProperty('email', testUser.email)
    })

    test('POST /auth/register - should not register duplicate user', async () => {
        const res = await request(app)
            .post('/auth/register')
            .send(testUser)

        expect(res.status).toBe(409)
        expect(res.body).toHaveProperty('error')
    })

    test('POST /auth/login - should login and return tokens', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send(testUser)

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('accessToken')
        expect(res.body).toHaveProperty('refreshToken')
        expect(res.body.user).toHaveProperty('email', testUser.email)
    })

    test('POST /auth/login - should reject invalid credentials', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({
                email: testUser.email,
                password: 'wrongpassword'
            })

        expect(res.status).toBe(401)
        expect(res.body).toHaveProperty('error')
    })
})