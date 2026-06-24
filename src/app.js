const express=require('express')
const cors= require('cors')
const app= express()
require('dotenv').config()
const {register,login,refresh, logout}= require('./controllers/auth')
const authMiddleware= require('./middleware/auth')
const {createEndpoint,getEndpoint,getEndpointById,deleteEndpoint}=require('./controllers/endpoint')
const { createEvent, getEvent, getEventById,getFailedEvents,replayEvent } = require('./controllers/event')
//parse json
app.use(express.json())
app.use(cors())

app.get('/',(req,res)=>{
	res.send(" ₍^. .^₎Ⳋ")
	
})
app.get('/health',(req,res)=> {
	res.status(200). json({status:"ok"})
})
//auth routes
app.post('/auth/register',register)
app.post('/auth/login',login)
app.post('/auth/refresh',refresh)
app.post('/auth/logout', logout)

//protected routes 
app.get('/protected',authMiddleware,(req,res)=>{
	res.status(200).json({
		message:'yay youre authenticated queen',
		user:req.user
	})
})

//endpoint routes
app.post('/endpoints',authMiddleware,createEndpoint)
app.get('/endpoints',authMiddleware,getEndpoint)
app.get('/endpoints/:id',authMiddleware,getEndpointById)
app.delete('/endpoints/:id',authMiddleware,deleteEndpoint)

//events
app.post('/events', authMiddleware, createEvent)
app.get('/events', authMiddleware, getEvent)
app.get('/events/:id', authMiddleware, getEventById)
app.get('/events/failed',authMiddleware,getFailedEvents)
app.post('/events/:id/replay',authMiddleware,replayEvent)
app.use((req,res)=>{
	res.status(404).json({error:"ROUTE NOT FOUND"})
})

module.exports= app;