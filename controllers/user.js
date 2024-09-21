import { userModel } from '../models/user.js'
import jwt from 'jsonwebtoken'

export async function handleSignInUser (req, res) {
    if (!req.body?.displayName && !req.body?.email && !req.body?.profilePicURL && !req.body?.uuid) return res.status(400).json({ msg: 'Missing data for user', code: 0 })

    const user = await userModel.findOne({ email: req.body.email, uuid: req.body.uuid })

    const token = jwt.sign({
        displayName: req.body.displayName,
        email: req.body.email,
        profilePicURL: req.body.profilePicURL,
        uuid: req.body.uuid
    }, process.env.SECRET_KEY, {
        expiresIn: '1h'
    })    

    if (user) {
        res.cookie('token', token, { 
            domain: 'localhost',
            sameSite: true,
            httpOnly: true
        })
        return res.status(200).json({ msg: 'User data is already in db', code: 1, token })
    }

    try {
        await userModel.create({
            displayName: req.body.displayName,
            email: req.body.email,
            profilePicURL: req.body.profilePicURL,
            uuid: req.body.uuid
        })

        res.cookie('token', token, { 
            domain: 'localhost',
            sameSite: true,
            httpOnly: true
        })        
        return res.status(201).json({ msg: 'Successfully created a user', code: 1, token })
    } catch(err) {
        console.log(err)
        res.status(501).json({ msg: `Something went wrong: ${err}`, code: 0 })
    }
}