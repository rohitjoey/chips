import supabase from "@/db";
import { pinecone } from "@/lib/pinecone";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { createUploadthing, type FileRouter } from "uploadthing/next";


const f = createUploadthing();


export const ourFileRouter = {
  pdfUploader: f({ pdf: { maxFileSize: "4MB" } })
    .middleware(async ({ req }) => {
      const { getUser } = getKindeServerSession();
      const user = await getUser();

      if (!user || !user.id) throw new Error("Unauthorized");

      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
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

        const pineconeIndex = pinecone.Index("chips")

        const embeddings = new OpenAIEmbeddings({
          apiKey: process.env.OPENAI_API_KEY,
        });

        await PineconeStore.fromDocuments(pageLevelDocs, embeddings, { pineconeIndex, namespace: createdFile?.data?.id })

        await supabase
          .from('files')
          .update({ uploadStatus: 'SUCCESS' })
          .eq('id', createdFile?.data?.id!)
        console.log("yeta")
      } catch (error) {
        console.log(error)
        console.log("error ma")
        await supabase
          .from('files')
          .update({ uploadStatus: 'FAILED' })
          .eq('id', createdFile?.data?.id!)
      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
