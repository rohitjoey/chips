import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import React, { createContext, ReactNode, useState } from "react";

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
  const [isLoading, setisLoading] = useState<boolean>(false);

  const { toast } = useToast();

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
