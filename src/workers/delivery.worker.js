const { Worker } = require('bullmq')
const axios = require('axios')
const crypto = require('crypto')
const prisma = require('../config/db')
const redis = require('../config/redis')
const deadLetterQueue= require('../queues/dead-letter.queue')


const deliveryWorker = new Worker(
    'event-delivery',  
    async (job) => {
        console.log(`🔄 Processing job ${job.id}`)

        try {
            
            const { eventId, userId } = job.data

            
            const event = await prisma.event.findUnique({
                where: { id: eventId }
            })

            if (!event) {
                console.log(`❌ Event ${eventId} not found`)
                return 
            }

            
            const endpoint = await prisma.endpoint.findFirst({
                where: { userId: userId }
            })

            if (!endpoint) {
                console.log(`❌ No endpoint found for user ${userId}`)
                
                await prisma.event.update({
                    where: { id: eventId },
                    data: { status: 'failed' }
                })
                return
            }

           
            const signature = crypto
                .createHmac('sha256', endpoint.secret)
                .update(JSON.stringify(event.payload))
                .digest('hex')

            
            const response = await axios.post(
                endpoint.url,
                {
                    id: event.id,
                    type: event.type,
                    payload: event.payload,
                    timestamp: event.createdAt
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-hookshot-signature': `sha256=${signature}`
                    },
                    timeout: 10000 
                }
            )

           
            if (response.status >= 200 && response.status < 300) {
                
                await prisma.event.update({
                    where: { id: eventId },
                    data: { status: 'delivered' }
                })

                await prisma.deliveryLog.create({
                    data: {
                        eventId: eventId,
                        status: 'success',
                        attempt: job.attemptsMade + 1,
                        responseCode: response.status
                    }
                })

                console.log(`✅ Event ${eventId} delivered successfully`)
            } else {
               
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

        } catch (error) {
             console.log(`🔥 Caught error for job ${job.id}:`, error.message) 
            const attemptNumber=job.attemptsMade !== undefined ? job.attemptsMade + 1 : 1
           // console.error(`❌ Delivery failed for job ${job.id}:`, error.message)

            
            await prisma.deliveryLog.create({
                data: {
                    eventId: job.data.eventId,
                    status: 'failed',
                    attempt: attemptNumber ,
                    errorMessage: error.message
                }
            })

           
           
            throw error
            
        }
    },
    {
        connection: redis,
        concurrency: 5,
        removeOnComplete: { count: 100 }, 
        removeOnFail: { count: 100 } ,
        
    }
)


deliveryWorker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed`)
})

deliveryWorker.on('failed',async(job,err) =>{
            if(job.attemptsMade>=5){
                await deadLetterQueue.add('failed-event',{
                    eventId:job.data.eventId,
                    userId:job.data.userId,
                    failedAt: new Date()
                })
                await prisma.event.update({
                    where:{id:job.data.eventId},
                    data:{status:'failed'}
                })
                console.log(`event ${job.data.eventId} moved to DLQ`)
            }
           }) 


deliveryWorker.on('error', (err) => {
    console.error('Worker error:', err)
})

console.log('🚀 Delivery worker started')

module.exports = deliveryWorker