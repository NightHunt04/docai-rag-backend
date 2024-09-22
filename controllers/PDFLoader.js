import { ChatGroq } from '@langchain/groq'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { TaskType } from '@google/generative-ai'
import { createRetrievalChain } from 'langchain/chains/retrieval'
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb'
import { MongoClient } from 'mongodb'
import ShortUniqueId from 'short-unique-id'
import { userModel } from '../models/user.js'
import { vectorStoreForDocs } from '../setup.js'
import dotenv from 'dotenv'
import fs from 'fs'
import { promisify } from 'util'
import path from 'path'
dotenv.config()

async function getCollection (client) {
    const db = client.db(process.env.MONGODB_ATLAS_DB_NAME)
    const collection = db.collection(process.env.MONGODB_ATLAS_COLLECTION_NAME2)

    await collection.createIndex({ userId: 1 })
    
    return collection
}

export async function setPdf (req, res) {
    if (!req.file) return res.status(400).json({ msg: 'No file was found', code: 0 })
    if (!req.query.userId) return res.status(400).json({ msg: 'No user ID was found', code: 0 })

    const client = new MongoClient(process.env.MONGODB_ATLAS_URI)    
    const collection = await getCollection(client)
    
    const loader = new PDFLoader(req.file.path)
    const docs = await loader.load()
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 })
    const splitedDocs = await splitter.splitDocuments(docs)

    const embeddingModel = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY, 
        model: 'embedding-001', 
        taskType: TaskType.RETRIEVAL_DOCUMENT 
    })

    const vectorStore = new MongoDBAtlasVectorSearch(embeddingModel, {
        collection: collection,
        indexName: 'vector_index',
        textKey: 'text',
        embeddingKey: 'embedding'
    })

    console.log(req.query.userId)

    const user = await userModel.findOne({ uuid: req.query.userId })

    if (user) {
        const userDocIds = user.docVectorDocIds

        if (userDocIds.length) {
            console.log('userdocids', userDocIds)
            // await deleteURLVector(userDocIds, vectorStore)
            try {
                await vectorStore.delete({ ids: userDocIds })
                // return res.status(200).json({ msg: 'Successfully deleted document', code: 1 })
            } catch(err) {
                console.log(err)
                return res.status(501).json({ msg: err, code: 0 })
            }
        }
    } 

    const uid = new ShortUniqueId({ length: 10 })
    const ids = splitedDocs.map(() => `${req.query.userId}_${uid.rnd()}`)

    await user.updateOne({ docVectorDocIds: ids })

    console.log(ids)

    const docsWithUserId = splitedDocs.map(doc => ({ ...doc, metadata: { ...doc.metadata, userId: req.query.userId }}))
    
    try {
        await vectorStore.addDocuments(docsWithUserId, { ids })
        return res.status(200).json({ msg: 'Successfully added in db', code: 1 })
    } catch (err) {
        console.log(err)
        return json.status(501).json({ msg: err, code: 0 })
    } finally {
        await client.close()
        try {
            const filePath = path.join(process.cwd(), req.file.path)
            console.log(filePath)
            const unlinkAsync = promisify(fs.unlink)
            await unlinkAsync(filePath)
            console.log(`Successfully deleted ${req.file.path}`)
        } catch (unlinkError) {
            console.error(`Error deleting file ${req.file.path}:`, unlinkError)
        }
    }
}

export async function getAnswers (req, res) {
    if (!req.body.query) return res.status(400).json({ msg: 'No query was found', code: 0 })
    if (!req.body.userId) return res.status(400).json({ msg: 'No user ID was found', code: 0 })
    if (!req.body.model) return res.status(400).json({ msg: 'No model was found', code: 0 })

    const retriever = vectorStoreForDocs.asRetriever({ k: 8, filter: { userId: req.body.userId }})

    console.log('retrieved')
    console.log('model', req.body.model)

    const model = new ChatGroq({
        modelName: req.body.model,
        apiKey: process.env.GROQ_API_KEY,
        temperature: 0.7
    })

    const prompt = ChatPromptTemplate.fromTemplate(`
        Answer the user's question from the given context in very detailed form. If user asks question which is not connected to the given context, then simply dont respond to that question. Do not repeat the question of user in the output response or do not re-write the user's question in output, if you repeat the user's question as heading in output then you will get penalty. Make sure the output must be in markdown format, you will get penalty if you dont respond in markdown format.   
        Context: {context}
        Question: {input}
    `)

    const chain = await createStuffDocumentsChain({
        llm: model,
        prompt
    })

    const retrievalChain = await createRetrievalChain({
        combineDocsChain: chain,
        retriever
    })

    try {
        const response = await retrievalChain.invoke({ input: req.body.query })
        return res.status(200).json({ response: response.answer, msg: 'Successfully returned response', code: 1 })
    } catch (err) {
        console.log(err)
        return res.status(501).json({ msg: err, code: 0 });
    } 
}
