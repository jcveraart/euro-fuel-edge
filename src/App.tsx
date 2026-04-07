import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/Navbar";
import { ThemeProvider } from "@/context/ThemeContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import Index from "./pages/Index";
import LivePrijzen from "./pages/LivePrijzen";
import BesparingsGids from "./pages/BesparingsGids";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename="/euro-fuel-edge">
          <Navbar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/prijzen" element={<LivePrijzen />} />
            <Route path="/gids" element={<BesparingsGids />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ThemeToggle />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
