const jwt= require('jsonwebtoken')

const authMiddleware = async(req,res,next) =>{
	try{
			const authHeader= req.headers.authorization;
			const token= authHeader && authHeader.split(' ')[1]

			if(!token){
				return res.status(401).json({error:'unauthorized access'})
			}
			jwt.verify(token,process.env.JWT_SECRET,(error,user) =>{
				if(error){
					return res.status(401).json({error:'oh no youre forbidden'})
				}
				req.user= user;
				next()
			})
	}
	catch(error){
		console.error('authoriztion has failed',authMiddleware)
		return res.status(500).json({error:'authMiddleware has failed',error})
	}
}

module.exports= authMiddleware