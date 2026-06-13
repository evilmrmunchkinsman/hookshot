const express=require('express')
const cors= require('cors')
const app= express()
require('dotenv').config()

//parse json
app.use(express.json())
app.use(cors())

app.get('/',(req,res)=>{
	res.send(" ₍^. .^₎Ⳋ")
	
})
app.get('/health',(req,res)=> {
	res.status(200). json({status:"ok"})
})
app.use((req,res)=>{
	res.status(404).json({error:"ROUTE NOT FOUND"})
})

module.exports= app;