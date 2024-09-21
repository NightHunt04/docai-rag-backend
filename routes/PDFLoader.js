import { Router } from "express"
import { setPdf, getAnswers } from '../controllers/PDFLoader.js'
import multer from 'multer'

const upload = multer({ dest: 'uploads/' })
const router = Router()

router.post('/set-pdf', upload.single('pdf'), setPdf)
router.post('/get-answer', getAnswers)
// router.delete('/delete-doc', deleteDocVector)

export { router }