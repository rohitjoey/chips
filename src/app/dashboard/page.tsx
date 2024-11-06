import supabase from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";

const Dashboard = async () => {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) redirect("/auth-callback?origin=dashboard");

  const { data, error } = await supabase
    .from("users")
    .select()
    .eq("id", user?.id)
    .limit(1);

  if (!data?.length) redirect("/auth-callback?origin=dashboard");

  return <div>Dashboard {user.email} </div>;
};

export default Dashboard;
