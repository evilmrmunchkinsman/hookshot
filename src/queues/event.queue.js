const {Queue} = require('bullmq')
const redis = require('../config/redis')

const eventQueue= new Queue('event-delivery', {
	connection:redis
})

module.exports= eventQueue