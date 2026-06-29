const joi = require('joi')
const prisma = require('../config/db')
const eventQueue = require('../queues/event.queue')

const createEvent = async (req, res) => {
    try {
        const { type, payload, endpointId } = req.body
        const userId = req.user.userId

        const validationRules = joi.object({
            type: joi.string().required(),
            payload: joi.object().required(),
            endpointId: joi.number().optional()
        })

        const { error, value } = validationRules.validate(req.body)
        if (error) {
            return res.status(400).json({ error: error.details[0].message })
        }

        const event = await prisma.event.create({
            data: {
                type: value.type,
                payload: value.payload,
                status: 'pending',
                userId,
                endpointId: endpointId || null
            }
        })

        await eventQueue.add('deliver-event', {
            eventId: event.id,
            userId: userId
        }, {
            attempts: 5,
            backoff: {
                type: 'exponential',
                delay: 1000
            }
        })

        res.status(201).json({
            id: event.id,
            type: event.type,
            payload: event.payload,
            status: event.status,
            createdAt: event.createdAt
        })
    } catch (error) {
        console.error('Create event error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

const getEvent = async (req, res) => {
    try {
        const userId = req.user.userId

        const events = await prisma.event.findMany({
            where: { userId },
            select: {
                id: true,
                type: true,
                payload: true,
                status: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: { createdAt: 'desc' }
        })

        res.status(200).json({ events })
    } catch (error) {
        console.error('Get events error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

const getEventById = async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.user.userId

        const event = await prisma.event.findUnique({
            where: { id: parseInt(id) },
            select: {
                id: true,
                type: true,
                payload: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                deliveryLogs: {
                    select: {
                        id: true,
                        status: true,
                        attempt: true,
                        createdAt: true
                    }
                }
            }
        })

        if (!event) {
            return res.status(404).json({ error: 'Event not found' })
        }

        const eventOwner = await prisma.event.findUnique({
            where: { id: parseInt(id) },
            select: { userId: true }
        })

        if (eventOwner.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' })
        }

        res.status(200).json({ event })
    } catch (error) {
        console.error('Get event error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

const getFailedEvents = async (req, res) => {
    try {
        const userId = req.user.userId

        const events = await prisma.event.findMany({
            where: {
                userId: userId,
                status: 'failed'
            },
            select: {
                id: true,
                type: true,
                payload: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                deliveryLogs: {
                    select: {
                        id: true,
                        status: true,
                        attempt: true,
                        errorMessage: true,
                        createdAt: true
                    },
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        res.status(200).json({ events })
    } catch (error) {
        console.error('Get failed events error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

const replayEvent = async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.user.userId

        const event = await prisma.event.findUnique({
            where: { id: parseInt(id) }
        })

        if (!event) {
            return res.status(404).json({ error: 'Event not found' })
        }

        if (event.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' })
        }

        await prisma.event.update({
            where: { id: parseInt(id) },
            data: { status: 'pending' }
        })

        await eventQueue.add('deliver-event', {
            eventId: event.id,
            userId: userId
        }, {
            attempts: 5,
            backoff: {
                type: 'exponential',
                delay: 1000
            }
        })

        res.status(200).json({ message: 'Event re-queued for delivery' })
    } catch (error) {
        console.error('Replay error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

module.exports = { createEvent, getEvent, getEventById, getFailedEvents, replayEvent }