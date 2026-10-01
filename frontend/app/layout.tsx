import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata = {
  title: "NEXORA AI - Enterprise Knowledge Assistant",
  description: "Enterprise Knowledge Assistant with RAG Chatbot, Local Embeddings, FAISS, and AI Email Automation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
