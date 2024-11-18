"use client";

import { format } from "date-fns";
import {
  File,
  FilePlus,
  Ghost,
  MessageSquare,
  MessageSquareText,
  Trash,
} from "lucide-react";
import Link from "next/link";
import Skeleton from "react-loading-skeleton";
import { trpc } from "../_trpc/client";
import UploadButton from "./UploadButton";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const { data: files, isLoading } = trpc.getUserFiles.useQuery();

  return (
    <main className="mx-auto max-w-7xl md:p-10">
      <div className="mt-8 flex flex-col items-start justify-between gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:gap-0">
        <h1 className="mb-3 font-bold text-5xl text-gray-500">My Files</h1>
        <UploadButton />
      </div>

      {/*user files */}

      {files && files.length > 0 ? (
        <ul className="mt-8 grid grid-cols-1 gap-6 divide-y divide-zinc-200 md:grid-cols-2 lg:grid-cols-3">
          {files
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )
            .map((file) => (
              <li
                key={file.id}
                className="col-span-1 divide-y divide-gray-200 rounded-lg bg-white shadow transition hover:shadow-lg"
              >
                <Link
                  href={`/dashboard/${file.id} `}
                  className="flex flex-col gap-2"
                >
                  <div className="pt-6 px-6 flex w-full items-center justify-between space-x-6">
                    <File className="text-orange-400" />
                    <div className="flex-1 truncate">
                      <div className="flex items-center space-x-3">
                        <h3 className="truncate font-medium text-lg  text-zinc-900">
                          {file.name}
                        </h3>
                      </div>
                    </div>
                  </div>
                </Link>

                <div className="px-6 mt-4 grid grid-cols-3 place-items-center py-2 gap-6 text-xs text-zinc-500">
                  <div className="flex items-center gap-2">
                    <FilePlus className="h-4 w-4" />
                    {format(file.createdAt, "MMM yyy")}
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquareText className="h-4 w-4" />
                    mocked
                  </div>
                  <Button
                    size={"sm"}
                    className="w-full"
                    variant={"destructive"}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
        </ul>
      ) : isLoading ? (
        <Skeleton height={50} className="my-2" count={5} />
      ) : (
        <div className="mt-16 flex flex-col items-center gap-2">
          <Ghost className="h-8 w-8 text-zinc-800" />
          <h3 className="font-semibold text-xl">Oops No files found.</h3>
        </div>
      )}
    </main>
  );
};

export default Dashboard;