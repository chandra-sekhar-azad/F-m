import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/Navbar";
import LoopBanner from "@/components/LoopBanner";
import { fetchBranches } from "@/lib/booking-data";
import Loader from "@/components/Loader";
import { ThemeProvider } from "@/components/ThemeProvider";

// Eagerly load the home page (first page users see)
import Index from "./pages/Index";

// Lazy load all other pages — they are only downloaded when the user navigates to them
const BookingPage = lazy(() => import("./pages/BookingPage"));
const BookingConfirmed = lazy(() => import("./pages/BookingConfirmed"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminPricing = lazy(() => import("./pages/AdminPricing"));
const GalleryPage = lazy(() => import("./pages/GalleryPage"));
const Reels = lazy(() => import("./pages/reels"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const ShippingPolicy = lazy(() => import("./pages/ShippingPolicy"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Review = lazy(() => import("./pages/Review"));
const UserReviews = lazy(() => import("./pages/User-reviews"));

const queryClient = new QueryClient();

const AppShell = () => {
  const location = useLocation();
  const hideNavbar = location.pathname === "/maintenance";

  return (
    <div className="min-h-screen">
      {!hideNavbar && <Navbar />}
      {!hideNavbar && <LoopBanner />}
      {/* Suspense boundary: shows a spinner while lazy chunks are downloading */}
      <div className={hideNavbar ? "" : "pt-8"}>
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
          <Route path="/contact" element={<Navigate to="/about#contact" replace />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/refund-cancellation" element={<RefundPolicy />} />
          <Route path="/shipping-delivery" element={<ShippingPolicy />} />
          <Route path="/maintenance" element={<Navigate to="/" replace />} />
          <Route path="/review" element={<Review />} />
          <Route path="/user-reviews" element={<UserReviews />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </div>
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

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <div className="min-h-screen">
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppShell />
            </BrowserRouter>
          </div>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
