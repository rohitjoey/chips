import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { protectedProcedure, publicProcedure, router } from "./trpc";
import { TRPCError } from "@trpc/server";
import supabase from "@/db";
import { z } from "zod"

export const appRouter = router({
  authCallback: publicProcedure.query(async () => {
    const { getUser } = getKindeServerSession();

    const user = await getUser();

    if (!user?.id || !user?.email)
      throw new TRPCError({ code: "UNAUTHORIZED" });

    //check if the user is in the database
    const { data, error } = await supabase
      .from("users")
      .select()
      .eq("id", user?.id)
      .limit(1);

    if (!data?.length) {
      const res = await supabase
        .from("users")
        .insert({ id: user?.id, email: user?.email });
    }

    return { isSuccesst: true };
  }),

  getUserFiles: protectedProcedure.query(async ({ ctx }) => {
    const { userId } = ctx;
    const { data, error } = await supabase
      .from("files")
      .select()
      .eq("userId", userId)
      .order("createdAt", { ascending: false });

    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    return data;
  }),

  deleteUserFile: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const { userId } = ctx

    const { data, error } = await supabase.from('files').select().eq("id", input.id).eq("userId", userId).limit(1)
      .single()

    if (!data) throw new TRPCError({ code: "NOT_FOUND" })


    const response = await supabase
      .from('files')
      .delete()
      .eq('id', input.id)
      .eq('userId', userId)

    return response
  }),

  getFileFromKey: protectedProcedure.input(z.object({ key: z.string() })).mutation(async ({ ctx, input }) => {
    const { userId } = ctx

    const { data, error } = await supabase.from('files').select().eq("key", input.key).eq("userId", userId).limit(1)
      .single()


    if (!data) throw new TRPCError({ code: "NOT_FOUND" })

    return data
  })
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
