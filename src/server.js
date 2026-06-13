const app= require('./app')
const PORT= process.env.PORT || 3000
const prisma= require('./config/db')
const redis= require('./config/redis')


async function startServer(){
	try{
			await prisma.$connect()
			console.log('postgressql connected (neon.tech)')
			console.log('redis connected')
			app.listen(PORT,()=>{
				console.log(`server is running on:${PORT}`)
				console.log(`health check: http://localhost:${PORT}/health`)
			})

	} catch(error){
		console.log('failed to start the server',error.message);
		process.exit(1)
	}
}
startServer()