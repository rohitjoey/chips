import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "../_trpc/client";

const Page = () => {
  const router = useRouter();

  const searchParams = useSearchParams();
  const origin = searchParams.get("origin");

  const { data, isSuccess } = trpc.authCallback.useQuery();

  if (isSuccess) router.push(origin ? `/$origin` : "/dashboard");
};

export default Page;
