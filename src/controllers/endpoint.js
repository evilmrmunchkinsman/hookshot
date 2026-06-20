const crypto = require('crypto')
const joi = require('joi')
const prisma = require('../config/db')

const createEndpoint = async (req, res) => {
    try {
        const endpointSchema = {
            create: joi.object({
                url: joi.string().uri().required(),
                name: joi.string().optional()
            })
        }

        const { error, value } = endpointSchema.create.validate(req.body)
        if (error) {
            return res.status(400).json({ error: error.details[0].message })
        }

        const { url, name } = value
        const userId = req.user.userId
        const secret = crypto.randomBytes(32).toString('hex')

        const endpoint = await prisma.endpoint.create({
            data: {
                url,
                name: name || null,
                secret,
                userId
            }
        })

        res.status(201).json({
            id: endpoint.id,
            url: endpoint.url,
            name: endpoint.name,
            secret: endpoint.secret,
            userId: endpoint.userId
        })

    } catch (error) {
        console.error('Create endpoint error:', error)
        res.status(500).json({ error: 'internal server error' })
    }
}

const getEndpoint = async (req, res) => {
    try {
        const userId = req.user.userId

        const endpoints = await prisma.endpoint.findMany({
            where: { userId },
            select: {
                id: true,
                url: true,
                name: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: { createdAt: 'desc' }
        })

        res.status(200).json({ endpoints })

    } catch (error) {
        console.error('Get endpoints error:', error)
        res.status(500).json({ error: 'internal server error' })
    }
}

const getEndpointById = async (req, res) => {
    try {
        const { id } = req.params          // ← Fixed semicolon
        const userId = req.user.userId      // ← Fixed semicolon

        const endpoint = await prisma.endpoint.findUnique({
            where: { id: parseInt(id) },
            select: {
                id: true,
                url: true,
                name: true,
                userId:true,
                createdAt: true,
                updatedAt: true
            }
        })

        if (!endpoint) {
            return res.status(404).json({ error: 'Endpoint not found' })
        }

        if (endpoint.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' })
        }

        res.status(200).json({ endpoint })

    } catch (error) {
        console.error('Get endpoint by ID error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

const deleteEndpoint= async(req,res) =>{
	try{
			const{id}= req.params
			const userId= req.user.userId

			const endpoint= await prisma.endpoint.findUnique({
				where:{id:parseInt(id)}
			})

			if(!endpoint){
				return resststus(404).json({error:'endpoint not found'})
			} 

			if(endpoint.userId!==userId){
				return res.status(403).json({error:'access denied'})
			}

			await prisma.endpoint.delete({
				where:{id:parseInt(id)}
			})

			res.status(200).json({message:'endpoint deleted successfully'})
	} 
	catch(error){
								 console.error('Delete endpoint error:', error)
                 res.status(500).json({ error: 'Internal server error' })
	}
}
module.exports = { createEndpoint, getEndpoint, getEndpointById,deleteEndpoint }