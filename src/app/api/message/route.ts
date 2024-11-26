import supabase from "@/db";
import { SendMessageValidator } from "@/lib/validators/sendMessageValidator";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest } from "next/server";

export const POST = async (req: NextRequest) => {

    const body = await req.json()

    const { getUser } = getKindeServerSession()
    const user = await getUser()

    const { id: userId } = user

    if (!userId) return new Response("Unauthorized", { status: 401 })

    const { fileId, message } = SendMessageValidator.parse(body)

    const { data: file, error } = await supabase.from("files").select().eq("id", fileId).eq("userId", userId).single()

    if (!file) return new Response("Not found", { status: 404 })

    await supabase.from("messages").insert({ text: message, userId, isUserMessage: true, fileId })
}