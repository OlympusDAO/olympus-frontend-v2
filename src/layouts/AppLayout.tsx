import { Outlet } from "react-router-dom";
import { Providers } from "@/components/providers";
import { IconSidebar } from "@/layouts/IconSidebar";
import { SubNav } from "@/layouts/SubNav";
import { Header } from "@/layouts/Header";
import { ToasterProvider } from "@/components/ui/sonner";
import { Footer } from "@/layouts/footer.tsx";

export default function AppLayout() {
  return (
    <Providers>
      <div className="flex h-screen bg-surface-bg-l1 overflow-hidden">
        {/* Desktop sidebars — hidden on mobile */}
        <div className="hidden md:flex">
          <IconSidebar />
        </div>
        <div className="hidden md:flex">
          <SubNav />
        </div>
        <main className="flex-1 min-w-0 flex flex-col overflow-y-auto bg-surface-bg-l1 relative">
          <Header />
          <div className="flex-1 px-4 pb-4 md:px-8 md:pb-8">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>
      <ToasterProvider />
    </Providers>
  );
}
