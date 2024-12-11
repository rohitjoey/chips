import ChatWrapper from "@/app/components/chat-components/ChatWrapper";
import PdfRenderer from "@/app/components/PdfRenderer";
import supabase from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { notFound, redirect } from "next/navigation";

interface PageProps {
  params: { fileId: string };
}

const Page = async ({ params }: PageProps) => {
  const { fileId } = params;

  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) redirect(`/auth-callback?origin=/dashboard/${fileId}`);

  const { data } = await supabase
    .from("files")
    .select()
    .eq("id", fileId)
    .eq("userId", user.id)
    .limit(1)
    .single();

  if (!data) notFound();

  return (
    <div className="flex-1 justify-between flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="mx-auto w-full max-w-full grow lg:flex  xl:px-2">
        <div className="flex-1 xl:flex">
          <div className="px-4 py-6 sm:px-6 lg:pl-8 xl:flex-1 xl:pl-6 ">
            <PdfRenderer url={data.url} />
          </div>
        </div>

        <div className="shrink-0 flex-[0.75] border-t border-gray-200 lg:w-96 lg:border-l lg:border-t-0  ">
          <ChatWrapper fileId={fileId} />
        </div>
      </div>
    </div>
  );
};

export default Page;
