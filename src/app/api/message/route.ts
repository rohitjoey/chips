import supabase from "@/db";
import { pinecone } from "@/lib/pinecone";
import { SendMessageValidator } from "@/lib/validators/sendMessageValidator";
import { openai } from '@ai-sdk/openai';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { streamText } from 'ai';
import { NextRequest } from "next/server";

export const POST = async (req: NextRequest) => {

    const body = await req.json()

    const { getUser } = getKindeServerSession()
    const user = await getUser()

    if (!user || user.id) return new Response("Unauthorized", { status: 401 })
    const { id: userId } = user


    const { fileId, message } = SendMessageValidator.parse(body)

    const { data: file, error } = await supabase.from("files").select().eq("id", fileId).eq("userId", userId).single()

    if (!file) return new Response("Not found", { status: 404 })

    await supabase.from("messages").insert({ text: message, userId, isUserMessage: true, fileId })

    const pineconeIndex = pinecone.Index("chips")

    const embeddings = new OpenAIEmbeddings({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex, namespace: file.id })

    const results = await vectorStore.similaritySearch("this is", 4)

    const { data: prevMessages } = await supabase.from("messages").select().order("created_at", { ascending: false }).limit(6)

    const formattedMessage = prevMessages?.map((msg) => ({
        role: msg.isUserMessage ? "user" as const : "assistant" as const,
        content: msg.text
    }))

    const response = streamText({
        model: openai("gpt-4o-mini"),
        temperature: 0,
        messages: [
            {
                role: 'system',
                content:
                    'Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format.',
            },
            {
                role: 'user',
                content: `Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format. \nIf you don't know the answer, just say that you don't know, don't try to make up an answer.
              
        \n----------------\n
        
        PREVIOUS CONVERSATION:
        ${formattedMessage?.map((message) => {
                    if (message.role === 'user') return `User: ${message.content}\n`
                    return `Assistant: ${message.content}\n`
                })}
        
        \n----------------\n
        
        CONTEXT:
        ${results.map((r) => r.pageContent).join('\n\n')}
        
        USER INPUT: ${"this is"}`,
            },
        ],

        async onFinish({ text, finishReason, usage, response }) {
            await supabase.from("messages").insert({ text, userId, isUserMessage: false, fileId })

        }
    })

    return response.toDataStreamResponse();
}