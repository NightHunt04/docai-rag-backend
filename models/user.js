import { Schema, model } from 'mongoose'

const userSchema = new Schema({
    displayName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    profilePicURL: {
        type: String,
        required: true
    },
    uuid: {
        type: String,
        required: true,
        unique: true
    },
    docVectorDocIds: {
        type: Array,
        of: String
    },
    urlVectorDocIds: {
        type: Array,
        of: String
    },
    youtubeVectorDocIds: {
        type: Array,
        of: String
    }
})

const userModel = model('userData', userSchema)

export { userModel }