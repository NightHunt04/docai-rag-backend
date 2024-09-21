import jwt from 'jsonwebtoken'

export async function auth (req, res, next) {
    console.log(req.query)
    if (!req.body?.token && !req.query?.token) return res.status(400).json({ msg: 'No session token was found, sign in for that', code : 0 })
    
    try {
        const user = jwt.verify(req.body?.token ? req.body?.token : req.query?.token, process.env.SECRET_KEY)
        req.user = user
        return next()
    } catch (err) {
        console.log(err)
        return res.status(403).json({ msg: 'Not permitted', code: 0 })
    }
}