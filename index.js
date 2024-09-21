import express from 'express'
import cors from 'cors'
import { connectMongoDb } from './connectDb.js'
import { router as WebURLLoaderRoute } from './routes/WebURLLoader.js'
import { router as PDFLoaderRoute } from './routes/PDFLoader.js'
import { router as UserRoute } from './routes/user.js'
import { auth } from './middlewares/auth.js'
import { initializeForWebURL, initializeForDoc } from './setup.js'

const PORT = process.env.PORT || 8000
const app = express()

await initializeForWebURL()
await initializeForDoc()

//connect mongo db
connectMongoDb(`${process.env.MONGODB_ATLAS_URI}users`).then(() => console.log('Mongo connected')).catch(err => console.log(`Something went wrong: ${err}`))

// middlewares
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// routes
app.use('/api/user/', UserRoute)
app.use('/api/weburl/', auth, WebURLLoaderRoute)
app.use('/api/pdf/', auth, PDFLoaderRoute)

app.get('/', (req, res) => res.send('Server is running...'))

app.listen(PORT, () => console.log(`Server running at : http://localhost:${PORT}`))

export { app }
