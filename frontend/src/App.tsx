import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/Navbar";
import { fetchBranches } from "@/lib/booking-data";
import Loader from "@/components/Loader";

// Eagerly load the home page (first page users see)
import Index from "./pages/Index";

// Lazy load all other pages — they are only downloaded when the user navigates to them
const BookingPage = lazy(() => import("./pages/BookingPage"));
const BookingConfirmed = lazy(() => import("./pages/BookingConfirmed"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminPricing = lazy(() => import("./pages/AdminPricing"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const GalleryPage = lazy(() => import("./pages/GalleryPage"));
const Reels = lazy(() => import("./pages/reels"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const ShippingPolicy = lazy(() => import("./pages/ShippingPolicy"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Review = lazy(() => import("./pages/Review"));

import { API_BASE } from "@/lib/api";

const queryClient = new QueryClient();

// Ping the backend every 10 minutes to prevent Render free tier spin-down
const PING_INTERVAL = 10 * 60 * 1000;
const pingServer = () => {
  fetch(`${API_BASE}/health`, { method: "GET" })
    .then(() => console.log("🟢 Server keep-alive ping sent"))
    .catch(() => console.warn("⚠️ Keep-alive ping failed — server may be sleeping"));
};

const AppShell = () => {
  const location = useLocation();
  const hideNavbar = location.pathname === "/maintenance";

  return (
    <div className="min-h-screen">
      {!hideNavbar && <Navbar />}
      {/* Suspense boundary: shows a spinner while lazy chunks are downloading */}
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader />
        </div>
      }>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/reels" element={<Reels />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/booking-confirmed" element={<BookingConfirmed />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/pricing" element={<AdminPricing />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/refund-cancellation" element={<RefundPolicy />} />
          <Route path="/shipping-delivery" element={<ShippingPolicy />} />
          <Route path="/maintenance" element={<Navigate to="/" replace />} />
          <Route path="/review" element={<Review />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
};

const App = () => {
  useEffect(() => {
    // Fetch branches in the background — non-blocking
    fetchBranches().catch((error) => {
      console.error("Failed to fetch branches", error);
    });

    // Refresh branches every 5 minutes (was 30s — reduces unnecessary requests)
    const interval = setInterval(() => {
      fetchBranches();
    }, 5 * 60 * 1000);

    // Keep Render server awake — ping immediately then every 10 minutes
    pingServer();
    const pingInterval = setInterval(pingServer, PING_INTERVAL);

    return () => {
      clearInterval(interval);
      clearInterval(pingInterval);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen">
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppShell />
          </BrowserRouter>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
