import { ChatProvider } from "@/components/chat-context";
import { ChatWindow } from "@/components/chat-window";
import { MobileNav } from "@/components/mobile-nav";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <div className="min-h-screen bg-slate-50 pb-20 dark:bg-slate-950 lg:pb-0">
        <Navbar />
        <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[220px_1fr_320px]">
          <Sidebar />
          {children}
        </div>
        <MobileNav />
        <ChatWindow />
      </div>
    </ChatProvider>
  );
}
