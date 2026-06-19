const jwt = require('jsonwebtoken')

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        //console.log('Auth Header:', authHeader)  // ← ADD THIS
        
        const token = authHeader && authHeader.split(' ')[1]
        //console.log('Token:', token)  // ← ADD THIS

        if (!token) {
            return res.status(401).json({ error: 'unauthorized access' })
        }

        jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
            console.log('Verify error:', error)  // ← ADD THIS
            console.log('Decoded user:', user)    // ← ADD THIS
            
            if (error) {
                return res.status(401).json({ error: 'oh no youre forbidden' })
            }
            req.user = user;
            next()
        })
    } catch (error) {
        console.error('authoriztion has failed', error)
        return res.status(500).json({ error: 'authMiddleware has failed' })
    }
}


module.exports = authMiddleware