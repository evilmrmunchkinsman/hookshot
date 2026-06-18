const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const joi = require('joi')
const prisma = require('../config/db')

// Validation rules for register
const registerSchema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().min(6).required()
})

// Validation schema for login
const loginSchema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().required()
})

// Register
const register = async (req, res) => {
    try {
        const { error, value } = registerSchema.validate(req.body)
        if (error) {
            return res.status(400).json({ error: error.details[0].message })
        }

        const { email, password } = value
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword
            }
        })

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email
            }
        })

    } catch (error) {
        console.log('Register error', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

// Login
const login = async (req, res) => {
    try {
        const { error, value } = loginSchema.validate(req.body)
        if (error) {
            return res.status(400).json({ error: error.details[0].message })
        }

        const { email, password } = value
        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' })
        }

        // Generate Access Token
        const accessToken = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
        )

        // Generate Refresh Token
        const refreshToken = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
        )

        // Save refresh token to database
        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                revoked: false
            }
        })

        // RETURN TOKENS (THIS WAS MISSING)
        res.status(200).json({
            message: 'Login successful',
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email
            }
        })

    } catch (error) {
        console.error('Login error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

// Refresh Token
const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' })
        }

        let decoded
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
        } catch (error) {
            return res.status(401).json({ error: 'Invalid or expired refresh token' })
        }

        const storedToken = await prisma.refreshToken.findFirst({
            where: {
                token: refreshToken,
                revoked: false,
                expiresAt: { gt: new Date() }
            }
        })

        if (!storedToken) {
            return res.status(401).json({ error: 'Refresh token not found or revoked' })
        }

        // Generate new access token
        const newAccessToken = jwt.sign(
            { userId: decoded.userId, email: decoded.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
        )

        // Optionally rotate refresh token (generate new one)
        const newRefreshToken = jwt.sign(
            { userId: decoded.userId, email: decoded.email },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
        )

        // Mark old refresh token as revoked
        await prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { revoked: true }
        })

        // Save new refresh token
        await prisma.refreshToken.create({
            data: {
                token: newRefreshToken,
                userId: decoded.userId,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                revoked: false
            }
        })

        res.status(200).json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        })

    } catch (error) {
        console.log('Refresh error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}


//login

const logout= async(req,res) =>{
	try{
		const{refreshToken}= req.body

		//check if exists
		if(!refreshToken){
		return res.status(400).json({error:'refresh token required'})
	} 
	//find the token in database
	const storedToken= await prisma.refreshToken.findUnique({
		where:{token:refreshToken}
	})
	//if token not found
	if(!storedToken){
		return res.status(401).json({error:'token not found'})
	}
	//mark it revoked
	await prisma.refreshToken.update({
		where:{id:storedToken.id},
		data:{revoked:true}
	})
	//return success
	res.status(200).json({message:'logged out successfully'})
	}
	catch(error){
		console.error('logout error:',error)
		res.status(500).json({error:'internal server error'})

	}
}
module.exports = { register, login, refresh ,logout}