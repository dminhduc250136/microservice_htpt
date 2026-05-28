import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { ToastProvider } from "@/components/ui/Toast/Toast";
import { ConditionalShell } from "@/components/layout/ConditionalShell";
import FloatingChatButton from "@/components/chat/FloatingChatButton/FloatingChatButton";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LapTech Store | Laptop & Thiết bị công nghệ chính hãng",
  description:
    "LapTech Store — cửa hàng laptop, điện thoại và phụ kiện công nghệ chính hãng. Giá tốt, bảo hành uy tín, giao hàng nhanh toàn quốc.",
  keywords: ["laptop", "điện thoại", "phụ kiện công nghệ", "thiết bị điện tử", "mua sắm online"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <body>
        <ReactQueryProvider>
          <AuthProvider>
            <ToastProvider>
              <ConditionalShell>{children}</ConditionalShell>
              <FloatingChatButton />
            </ToastProvider>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
