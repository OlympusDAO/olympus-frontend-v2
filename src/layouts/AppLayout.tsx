import { Outlet } from "react-router-dom";
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";
import { Providers } from "@/components/providers";
import { IconSidebar } from "@/layouts/IconSidebar";
import { SubNav } from "@/layouts/SubNav";
import { Header } from "@/layouts/Header";
import { ToasterProvider } from "@/components/ui/sonner";
import { Footer } from "@/layouts/footer.tsx";

export default function AppLayout() {
  return (
    <NuqsAdapter>
      <Providers>
        <div className="flex h-screen bg-surface-bg-l1 overflow-hidden">
          {/* Desktop icon sidebar — hidden on mobile */}
          <div className="hidden md:flex">
            <IconSidebar />
          </div>

          {/* SubNav + main + footer wrapper */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex flex-1 min-h-0">
              <div className="hidden md:flex">
                <SubNav />
              </div>
              <main className="flex-1 min-w-0 flex flex-col overflow-y-auto bg-surface-bg-l1">
                <Header />
                <div className="flex-1 px-4 pb-4 md:px-8 md:pb-8 w-full max-w-(--max-content-width) mx-auto">
                  <Outlet />
                </div>
              </main>
            </div>
            <Footer />
          </div>
        </div>
        <ToasterProvider />
      </Providers>
    </NuqsAdapter>
  );
}
