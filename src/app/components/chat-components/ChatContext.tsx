import { trpc } from "@/app/_trpc/client";
import { INFINITE_QUERY_LIMIT } from "@/config/infinite-query";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import React, { createContext, ReactNode, useRef, useState } from "react";

type StreamResponse = {
  addMessage: () => void;
  message: string;
  handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
};

export const ChatContext = createContext<StreamResponse>({
  addMessage: () => {},
  message: "",
  handleInputChange: () => {},
  isLoading: false,
});

interface ContextContextProviderProps {
  fileId: string;
  children: ReactNode;
}

export const ChatContextProvider = ({
  fileId,
  children,
}: ContextContextProviderProps) => {
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { toast } = useToast();

  const utils = trpc.useUtils();

  const backupMessage = useRef("");

  const { mutate: sendMesage } = useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      const response = await fetch("/api/message", {
        method: "POST",
        body: JSON.stringify({
          fileId,
          message,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      return response.body;
    },
    onMutate: async ({ message }) => {
      backupMessage.current = message;
      setMessage("");

      await utils.getFileMessages.cancel();

      const previousMessagesT = await utils.getFileMessages.getInfiniteData();

      utils.getFileMessages.setInfiniteData(
        {
          fileId,
          limit: INFINITE_QUERY_LIMIT,
        },
        (old) => {
          if (!old) {
            return {
              pages: [],
              pageParams: [],
            };
          }

          let newPages = [...old.pages];

          let latestPage = newPages[0]!;

          latestPage.messages = [
            {
              created_at: new Date().toISOString(),
              id: crypto.randomUUID(),
              isUserMessage: true,
              text: message,
            },
            ...(latestPage.messages ?? []),
          ];

          newPages[0] = latestPage;

          return {
            ...old,
            pages: newPages,
          };
        }
      );
      setIsLoading(true);

      return {
        previousMessages:
          previousMessagesT?.pages
            .flatMap((page) => page.messages ?? [])
            .filter(
              (
                message
              ): message is {
                text: string;
                id: string;
                created_at: string;
                isUserMessage: boolean;
              } => message !== null
            ) ?? null,
      };
    },
    onSuccess: async (stream) => {
      setIsLoading(false);
      if (!stream) {
        return toast({
          title: "There was an error sending the message",
          description: "Please reload the page and try again",
          variant: "destructive",
        });
      }

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumatedResponse = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        const chunk = decoder.decode(value);
        accumatedResponse += chunk;

        utils.getFileMessages.setInfiniteData(
          {
            fileId,
            limit: INFINITE_QUERY_LIMIT,
          },
          (old) => {
            if (!old) return { pages: [], pageParams: [] };

            let isAIResponseCreated = old.pages.some((page) =>
              page.messages?.some((message) => message.id === "ai-response")
            );

            let updatedPages = old.pages.map((page) => {
              if (page == old.pages[0]) {
                let updatedMessages;

                if (!isAIResponseCreated) {
                  updatedMessages = [
                    {
                      created_at: new Date().toISOString(),
                      id: "ai-response",
                      isUserMessage: false,
                      text: accumatedResponse,
                    },
                    ...(page.messages ?? []),
                  ];
                } else {
                  updatedMessages = page?.messages?.map((message) => {
                    if (message.id === "ai-response") {
                      return {
                        ...message,
                        text: accumatedResponse,
                      };
                    }
                    return message;
                  });
                }

                return {
                  ...page,
                  messages: updatedMessages ?? [],
                };
              }
              return page;
            });
            return { ...old, pages: updatedPages };
          }
        );
      }
    },
    onError: (_, __, context) => {
      setMessage(backupMessage.current);
      utils.getFileMessages.setData(
        {
          fileId,
          limit: INFINITE_QUERY_LIMIT,
        },
        { messages: context?.previousMessages ?? [] }
      );
    },

    onSettled: async () => {
      setIsLoading(false);
      utils.getFileMessages.invalidate({ fileId });
    },
  });

  const addMessage = () => sendMesage({ message });
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setMessage(e.target.value);

  return (
    <ChatContext.Provider
      value={{
        addMessage,
        message,
        handleInputChange,
        isLoading,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
