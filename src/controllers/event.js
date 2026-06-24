const joi = require('joi')
const prisma = require('../config/db')
const eventQueue = require('../queues/event.queue')

// CREATE EVENT
const createEvent = async (req, res) => {
    try {
        // STEP 1: Get data
        const { type, payload ,endpointId} = req.body

        // STEP 2: Get user
        const userId = req.user.userId

        // STEP 3: Validate
        const validationRules = joi.object({
            type: joi.string().required(),
            payload: joi.object().required(),
            endpointId: joi.number().optional()
        })

        const { error, value } = validationRules.validate(req.body)
        if (error) {
            return res.status(400).json({ error: error.details[0].message })
        }

        // STEP 4: Database (use Event table, not Endpoint)
        const event = await prisma.event.create({
            data: {
                type: value.type,
                payload: value.payload,
                status: 'pending',
                userId,
                endpointId: endpointId ||  null
            }
        })

        // STEP 5: Add to queue
        await eventQueue.add('deliver-event', {
            eventId: event.id,
            userId: userId
        },{
            attempts: 5,
            backoff: {
            type: 'exponential',
            delay: 30000
        }
        })

        // STEP 6: Respond
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

// GET ALL EVENTS
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

// GET EVENT BY ID
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

        // Check ownership
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



const getFailedEvents= async(req,res) =>{
    try{
        const userId= req.user.userId
        const events= await prisma.event.findMany({
            where:{
                userId:userId,
                status:'failed'
            } ,
            select:{
                id:true,
                type:true,
                payload:true,
                status:true,
                createdAt:true,
                updatedAt:true,
                deliveryLogs:{
                    select:{
                        id:true,
                        status:true,
                        attempt:true,
                        errorMessage:true,
                        createdAt:true
                    },
                    orderBy:{createdAt:'desc'}
                }
            },
                orderBy:{createdAt:'desc'}
        })
        res.status(200).json([events])
    } catch(error){
        console.error('Get failed events error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}




const replayEvent= async(req,res) =>{
    try{
        
        const{id}=req.params
        const userId= req.user.userId
        
        const event = await prisma.event.findUnique({
            where:{id:parseInt(id)}
        })
        if(!event) {
            return res.status(404).json({error:'event not found'})
        }
        if(event.userId!=userId) {
            return res.status(403).json({error:'access denied'})
        }
        await prisma.event.update({
            where:{id:parseInt(id)},
            data:{status:'pending'}
        })

        await eventQueue.add('deliver-event',{
            eventId:event.id,
            userId:userId
        },{
            attempts:5,
            backoff:{
                type:'exponential',
                delay:1000
            }
        
        })  
        res.status(200).json({message:'event re-queued for delivery'}) 
    } catch(error){
        console.error('Replay error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

module.exports = { createEvent, getEvent, getEventById, getFailedEvents, replayEvent }