
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleAuthProvider } from "@/contexts/GoogleAuthContext";
import MainLayout from "./components/layout/MainLayout";
import Dashboard from "./pages/Index";
import Calendar from "./pages/Calendar";
import Tasks from "./pages/Tasks";
import Email from "./pages/Email";
import AIAssistant from "./pages/AIAssistant";
import Resources from "./pages/Resources";
import DailyReadings from "./pages/DailyReadings";
import SaintsHistory from "./pages/SaintsHistory";
import LiturgicalEvents from "./pages/LiturgicalEvents";
import CatholicPrayers from "./pages/CatholicPrayers";
import VaticanNews from "./pages/VaticanNews";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <GoogleAuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/email" element={<Email />} />
              <Route path="/ai-assistant" element={<AIAssistant />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/daily-readings" element={<DailyReadings />} />
              <Route path="/saints-history" element={<SaintsHistory />} />
              <Route path="/liturgical-events" element={<LiturgicalEvents />} />
              <Route path="/catholic-prayers" element={<CatholicPrayers />} />
              <Route path="/vatican-news" element={<VaticanNews />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<Admin />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </GoogleAuthProvider>
  </QueryClientProvider>
);

export default App;
