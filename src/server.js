require('dotenv').config();
const app= require('./app')
const PORT= process.env.PORT || 3000
const prisma= require('./config/db')
const redis= require('./config/redis')


async function startServer(){
	try{
		console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
  console.log("REDIS_URL exists:", !!process.env.REDIS_URL);
  console.log("PORT:", process.env.PORT);
			await prisma.$connect()
			console.log('postgressql connected (neon.tech)')
			console.log('redis connected')
			app.listen(PORT,()=>{
				console.log(`server is running on:${PORT}`)
				console.log(`health check: http://localhost:${PORT}/health`)
				require('./workers/delivery.worker')
			})
			

	} catch(error){
		console.log('failed to start the server',error.message);
		process.exit(1)
	}
}
startServer()