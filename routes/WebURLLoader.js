
import { Router } from "express"
import { setURL, getAnswers } from '../controllers/WebURLLoader.js'

const router = Router()

router.post('/set-url', setURL)
router.post('/get-answer', getAnswers)

export { router }