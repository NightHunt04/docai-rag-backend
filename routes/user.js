import { Route, Router } from "express"
import { handleSignInUser } from '../controllers/user.js'

const router = Router()

router.post('/signin', handleSignInUser)

export { router }