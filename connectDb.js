import mongoose from 'mongoose'

export async function connectMongoDb (url) {
    return await mongoose.connect(url)
}