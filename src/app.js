const express=require('express')
const cors= require('cors')
const app= express()
require('dotenv').config()
const {register,login,refresh, logout}= require('./controllers/auth')
const authMiddleware= require('./middleware/auth')
const {createEndpoint,getEndpoint,getEndpointById,deleteEndpoint}=require('./controllers/endpoint')
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
app.delete('/endpoints',authMiddleware,deleteEndpoint)


app.use((req,res)=>{
	res.status(404).json({error:"ROUTE NOT FOUND"})
})

module.exports= app;