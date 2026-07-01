const Redis= require('ioredis')
const redis= new Redis('redis://default:ADAvylgkycQdvThQpNsFrejckXRMoeBO@redis.railway.internal:6379', {
	maxRetriesPerRequest:null
})
redis.on('connect', ()=>{
	console.log('redis connected')
})
redis.on('error',(err)=>{
	console.log('redis error',err.message)
})

module.exports=redis