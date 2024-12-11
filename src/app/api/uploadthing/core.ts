import { PLANS } from "@/config/stripe";
import supabase from "@/db";
import { pinecone } from "@/lib/pinecone";
import { getUserSubscriptionPlan } from "@/lib/stripe";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { createUploadthing, type FileRouter } from "uploadthing/next";


const f = createUploadthing();


const middleWare = async () => {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) throw new Error("Unauthorized");

  const subscriptionPlan = await getUserSubscriptionPlan()

  return { subscriptionPlan, userId: user.id };
}

const onUploadComplete = async ({ metadata, file }: {
  metadata: Awaited<ReturnType<typeof middleWare>>, file: {
    key: string
    name: string
    url: string
  }
}) => {

  const { data: isFileExist } = await supabase.from("files").select().eq("key", file.key).single()

  if (isFileExist) return

  const createdFile = await supabase
    .from("files")
    .insert({
      name: file.name,
      userId: metadata.userId,
      key: file.key,
      url: file.url,
      uploadStatus: "PROCESSING"
    }).select().single();
  try {
    const response = await fetch(file.url)

    const blob = await response.blob()
    const loader = new PDFLoader(blob)
    const pageLevelDocs = await loader.load()
    const pagesAmt = pageLevelDocs.length

    const { subscriptionPlan } = metadata
    const { isSubscribed } = subscriptionPlan

    const isProExceeded = pagesAmt > PLANS.find((plan) => plan.name === 'Pro')!.pagesPerPDF
    const isFreeExceeded = pagesAmt > PLANS.find((plan) => plan.name === 'Free')!.pagesPerPDF

    if (
      (isSubscribed && isProExceeded) ||
      (!isSubscribed && isFreeExceeded)
    ) {
      await supabase.from("files").update({ uploadStatus: "FAILED" }).eq("id", createdFile?.data?.id!)
    }

    const pineconeIndex = pinecone.Index("chips")

    const embeddings = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
    });

    await PineconeStore.fromDocuments(pageLevelDocs, embeddings, { pineconeIndex, namespace: createdFile?.data?.id })

    await supabase
      .from('files')
      .update({ uploadStatus: 'SUCCESS' })
      .eq('id', createdFile?.data?.id!)
  } catch (error) {
    await supabase
      .from('files')
      .update({ uploadStatus: 'FAILED' })
      .eq('id', createdFile?.data?.id!)
  }

}

export const ourFileRouter = {
  freePlanUploader: f({ pdf: { maxFileSize: "4MB" } })
    .middleware(middleWare)
    .onUploadComplete(onUploadComplete),
  proPlanUploader: f({ pdf: { maxFileSize: '16MB' } })
    .middleware(middleWare)
    .onUploadComplete(onUploadComplete),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
