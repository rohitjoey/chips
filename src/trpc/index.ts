import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { publicProcedure, router } from "./trpc";
import { TRPCError } from "@trpc/server";
import supabase from "@/db";

export const appRouter = router({
  authCallback: publicProcedure.query(async () => {
    const { getUser } = getKindeServerSession();

    const user = await getUser();

    if (!user?.id || !user?.email) throw new TRPCError({ code: "UNAUTHORIZED" });

    //check if the user is in the database
    const { data, error } = await supabase
      .from("users")
      .select()
      .eq("id", user?.id)
      .limit(1);

    if (!data?.length) {
      const res = await supabase.from("users").insert({ id: user?.id, email: user?.email });
    }

    return { isSuccess: true };
  }),
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
