import { cn, constructMetadata } from "@/lib/utils";
import Navbar from "./components/Navbar";
import Providers from "./components/Providers";
import "./globals.css";
import "react-loading-skeleton/dist/skeleton.css";
import { Toaster } from "@/components/ui/toaster";
import "simplebar-react/dist/simplebar.min.css";

export const metaData = constructMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <Providers>
        <body className={cn("min-h-screen font-sans antialiased grainy")}>
          <Toaster />
          <Navbar />
          {children}
        </body>
      </Providers>
    </html>
  );
}
