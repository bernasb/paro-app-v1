
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { VoiceCommandButton } from "./VoiceCommandButton";
import { Toaster } from "@/components/ui/toaster";
import { VoiceProvider } from "@/contexts/VoiceContext";
import { VoiceIndicator } from "@/components/voice/VoiceIndicator";

export default function MainLayout() {
  return (
    <VoiceProvider>
      <div className="flex h-full bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1 h-full overflow-hidden">
          <header className="h-16 border-b flex items-center justify-between px-6">
            <h1 className="text-xl font-semibold">ClergyConnect AI</h1>
            <div className="flex items-center gap-4">
              <VoiceCommandButton />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
        <Toaster />
        <VoiceIndicator />
      </div>
    </VoiceProvider>
  );
}
