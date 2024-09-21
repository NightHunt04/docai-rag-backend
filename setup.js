import { ChatGroq } from '@langchain/groq'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents'
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { TaskType } from '@google/generative-ai'
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb'
import { MongoClient } from 'mongodb'

let client, collectionForWebURL, collectionForDocs, vectorStoreForWebURL, chainForWebURL, vectorStoreForDocs, chainForDocs

async function getCollectionForWebURL (client) {
    const db = client.db(process.env.MONGODB_ATLAS_DB_NAME)
    const collection = db.collection(process.env.MONGODB_ATLAS_COLLECTION_NAME)

    await collection.createIndex({ userId: 1 })
    
    return collection
}

async function getCollectionForDocs (client) {
    const db = client.db(process.env.MONGODB_ATLAS_DB_NAME)
    const collection = db.collection(process.env.MONGODB_ATLAS_COLLECTION_NAME2)

    await collection.createIndex({ userId: 1 })
    
    return collection
}


async function initializeForWebURL() {
    client = new MongoClient(process.env.MONGODB_ATLAS_URI)    
    collectionForWebURL = await getCollectionForWebURL(client)

    const embeddingModel = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY, 
        model: 'embedding-001', 
        taskType: TaskType.RETRIEVAL_DOCUMENT 
    })

    vectorStoreForWebURL = new MongoDBAtlasVectorSearch(embeddingModel, {
        collection: collectionForWebURL,
        indexName: 'vector_index',
        textKey: 'text',
        embeddingKey: 'embedding',
        filterPath: 'metadata.userId'
    })

    const model = new ChatGroq({
        modelName: 'llama3-8b-8192',
        apiKey: process.env.GROQ_API_KEY,
        temperature: 0.7
    })

    const prompt = ChatPromptTemplate.fromTemplate(`
        Answer the user's question from the given context in very detailed form. If user asks question which is not connected to the given context, then simply dont respond to that question.    
        Context: {context}
        Question: {input}
    `)

    chainForWebURL = await createStuffDocumentsChain({
        llm: model,
        prompt
    })
}

async function initializeForDoc() {
    // client = new MongoClient(process.env.MONGODB_ATLAS_URI)    
    collectionForDocs = await getCollectionForDocs(client)

    const embeddingModel = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY, 
        model: 'embedding-001', 
        taskType: TaskType.RETRIEVAL_DOCUMENT 
    })

    vectorStoreForDocs = new MongoDBAtlasVectorSearch(embeddingModel, {
        collection: collectionForDocs,
        indexName: 'vector_index',
        textKey: 'text',
        embeddingKey: 'embedding',
        filterPath: 'metadata.userId'
    })

    const model = new ChatGroq({
        modelName: 'llama3-8b-8192',
        apiKey: process.env.GROQ_API_KEY,
        temperature: 0.7
    })

    const prompt = ChatPromptTemplate.fromTemplate(`
        Answer the user's question from the given context in very detailed form. If user asks question which is not connected to the given context, then simply dont respond to that question.    
        Context: {context}
        Question: {input}
    `)

    chainForDocs = await createStuffDocumentsChain({
        llm: model,
        prompt
    })
}


export { chainForWebURL, vectorStoreForWebURL, initializeForDoc, initializeForWebURL, chainForDocs, vectorStoreForDocs }