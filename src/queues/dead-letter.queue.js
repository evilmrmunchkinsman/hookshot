const {Queue} = require('bullmq')
const redis= require('../config/redis')

const deadLetterQueue= new Queue('dead-letter', {
		connection:redis
})

module.exports= deadLetterQueue