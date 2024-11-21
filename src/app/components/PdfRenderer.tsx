"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronUp, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useResizeDetector } from "react-resize-detector";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Simplebar from "simplebar-react";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PdfRendererProps {
  url: string;
}

const PdfRenderer = ({ url }: PdfRendererProps) => {
  const { toast } = useToast();

  const [noOfPages, setNoOfPages] = useState<number>();
  const [currentPdfPage, setCurrentPdfPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);

  const CustomPageValidator = z.object({
    pageNumber: z
      .string()
      .refine((num) => Number(num) > 0 && Number(num) <= noOfPages!),
  });

  type TCustomPageValidator = z.infer<typeof CustomPageValidator>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<TCustomPageValidator>({
    defaultValues: { pageNumber: "1" },
    resolver: zodResolver(CustomPageValidator),
  });

  const handlePageNumberSubmit = ({ pageNumber }: TCustomPageValidator) => {
    setCurrentPdfPage(Number(pageNumber));
    setValue("pageNumber", String(pageNumber));
  };

  const { width, ref } = useResizeDetector();

  return (
    <div className="w-full bg-white rounded-md shadow flex flex-col items-center">
      <div className="h-14 w-full border-b border-zinc-200 flex items-center justify-between px-2">
        <div className="flex items-center gap-1.5">
          <Button
            disabled={noOfPages === undefined || currentPdfPage === noOfPages}
            onClick={() => {
              setCurrentPdfPage((prev) =>
                prev + 1 > noOfPages! ? noOfPages! : prev + 1
              );
            }}
            variant="ghost"
            aria-label="next page"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1.5">
            <Input
              {...register("pageNumber")}
              onKeyDown={(e) => {
                if (e.key == "Enter") {
                  handleSubmit(handlePageNumberSubmit)();
                }
              }}
              className={cn(
                "w-12 h-8 focus-visible:ring-blue-500",
                errors.pageNumber && "focus-visible:ring-red-500"
              )}
            />
            <p className="text-zinc-500 text-sm space-x-1">
              <span>/</span>
              <span>{noOfPages ?? "*"}</span>
            </p>
          </div>

          <Button
            disabled={currentPdfPage <= 1}
            onClick={() => {
              setCurrentPdfPage((prev) => (prev - 1 > 1 ? prev - 1 : 1));
            }}
            variant="ghost"
            aria-label="previous page"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label="zoom" className="gap-1.5" variant="ghost">
                <Search className="h-4 w-3" />
                {scale * 100}%
                <ChevronDown className="h-2 w-2 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setScale(1)}>
                100%
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setScale(1.25)}>
                125%
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setScale(1.5)}>
                150%
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setScale(2)}>
                200%
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 w-full max-h-screen">
        <Simplebar autoHide={false} className="max-h-[calc(100vh-10rem)]">
          <div ref={ref}>
            <Document
              loading={
                <div className="flex justify-center">
                  <Loader2 className="my-24 h-6 w-6 animate-spin" />
                </div>
              }
              onLoadError={() => {
                toast({
                  title: "Error loading PDF",
                  description: "Please try again later",
                  variant: "destructive",
                });
              }}
              onLoadSuccess={({ numPages }) => {
                setNoOfPages(numPages);
              }}
              file={url}
              className="max-h-full"
            >
              <Page
                loading={
                  <div className="flex justify-center">
                    <Loader2 className="my-24 h-6 w-6 animate-spin" />
                  </div>
                }
                width={width ? width : 1}
                pageNumber={currentPdfPage}
                scale={scale}
              />
            </Document>
          </div>
        </Simplebar>
      </div>
    </div>
  );
};

export default PdfRenderer;
