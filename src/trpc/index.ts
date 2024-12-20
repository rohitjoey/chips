import { INFINITE_QUERY_LIMIT } from "@/config/infinite-query";
import supabase from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./trpc";
import { absoluteUrl } from "@/lib/utils";
import { getUserSubscriptionPlan, stripe } from "@/lib/stripe";
import { PLANS } from "@/config/stripe";

export const appRouter = router({
  authCallback: publicProcedure.query(async () => {
    const { getUser } = getKindeServerSession();

    const user = await getUser();

    if (!user?.id || !user?.email)
      throw new TRPCError({ code: "UNAUTHORIZED" });

    //check if the user is in the database
    const { data } = await supabase
      .from("users")
      .select()
      .eq("id", user?.id)
      .limit(1);

    if (!data?.length) {
      await supabase
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

  deleteUserFile: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;

      const { data } = await supabase
        .from("files")
        .select()
        .eq("id", input.id)
        .eq("userId", userId)
        .limit(1)
        .single();

      if (!data) throw new TRPCError({ code: "NOT_FOUND" });

      const response = await supabase
        .from("files")
        .delete()
        .eq("id", input.id)
        .eq("userId", userId);

      return response;
    }),

  getFileFromKey: protectedProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;

      const { data } = await supabase
        .from("files")
        .select()
        .eq("key", input.key)
        .eq("userId", userId)
        .limit(1)
        .single();

      if (!data) throw new TRPCError({ code: "NOT_FOUND" });

      return data;
    }),

  getFileStatus: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .output(
      z.object({
        status: z.enum(["PENDING", "PROCESSING", "SUCCESS", "FAILED"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data: file } = await supabase
        .from("files")
        .select()
        .eq("id", input.fileId)
        .eq("userId", ctx.userId)
        .limit(1)
        .single();
      if (!file) return { status: "PENDING" as const };
      return {
        status: file.uploadStatus as
          | "PENDING"
          | "PROCESSING"
          | "SUCCESS"
          | "FAILED",
      };
    }),

  getFileMessages: protectedProcedure.input(z.object({
    limit: z.number().min(1).max(100).nullable(),
    cursor: z.string().nullish(),
    fileId: z.string()
  })).query(async ({ ctx, input }) => {
    const { userId } = ctx
    const { fileId, cursor } = input
    const limit = input.limit ?? INFINITE_QUERY_LIMIT

    const { data: file } = await supabase.from("files").select().eq("id", fileId).eq("userId", userId).maybeSingle()

    if (!file) throw new TRPCError({ code: 'NOT_FOUND' })

    const te = cursor ?? new Date().toISOString()
    const { data: messages } = await supabase.from("messages").
      select("id,created_at,isUserMessage,text")
      .eq("fileId", fileId)
      .order("created_at", { ascending: false })
      .limit(limit + 1)
      .lte("created_at", te)

    let nextCursor: typeof cursor
    if (messages && messages?.length > 0) {
      const nextItem = messages?.pop()
      nextCursor = nextItem?.created_at
    }
    return {
      messages,
      nextCursor
    }

  }),

  createStripeSession: protectedProcedure.mutation(async ({ ctx }) => {
    const { userId } = ctx
    if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" })

    const billingUrl = absoluteUrl("/dashboard/billing")

    const { data: dbUser } = await supabase.from("users").select().eq("id", userId).single()

    if (!dbUser) throw new TRPCError({ code: "UNAUTHORIZED" })

    const subscription = await getUserSubscriptionPlan()
    if (subscription.isSubscribed && dbUser.stripeCustomerId) {
      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: dbUser.stripeCustomerId,
        return_url: billingUrl
      })
      return { url: stripeSession.url }
    }

    const stripeSession = await stripe.checkout.sessions.create({
      success_url: billingUrl,
      cancel_url: billingUrl,
      payment_method_types: ['card', 'paypal'],
      mode: "subscription",
      billing_address_collection: "auto",
      line_items: [{
        price: PLANS.find((plan) => plan.name === 'Pro')?.price.priceIds.test,
        quantity: 1
      }],
      metadata: { userId }

    })
    return { url: stripeSession.url }
  })
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
