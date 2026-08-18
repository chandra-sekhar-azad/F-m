import { useState, useEffect } from "react";
import { Link } from "react-router-dom";


import { API_BASE, api } from "@/lib/api";
import { getEffectivePrice } from "@/lib/utils";
import { Eye, EyeOff, Clock, CheckCircle, Phone, MapPin, Calendar, LogIn, Filter, Settings, Loader, Plus, Download, Edit, Trash2, X, Play, MessageSquare, Users } from "lucide-react";
import AdminCampaign from "./Admin-campaign";
import UsersDb from "./Users-db";

interface Booking {
  id: string;
  branch: string;
  service: string;
  date: string;
  timeSlot: string;
  duration: number;
  name: string;
  phone: string;
  occasion: string;
  totalPrice: number;
  paymentStatus: "pending" | "paid" | "partially-paid" | "cancelled";
  paymentType?: "advance";
  amountPaid?: number;
  balanceAmount?: number;
  notes?: string;
  membersCount?: number;
  extraPersonsCharge?: number;
  hall?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DashboardStats {
  totalBookings: number;
  paidBookings: number;
  pendingBookings: number;
  totalRevenue: number;
  totalAmountPaid: number;
  totalBalanceAmount: number;
}

interface ManualBookingForm {
  branch: string;
  service: string;
  date: string;
  timeSlot: string;
  duration: number;
  name: string;
  phone: string;
  occasion: string;
  totalPrice: number;
  paymentType: "advance";
  amountPaid: number;
  notes?: string;
  cakeRequired?: boolean;
  selectedCake?: any;
  decorationRequired?: boolean;
  extraDecorations?: any[];
}

const formatServiceName = (serviceId: string) => {
  if (serviceId === "private-theatre-party-hall") return "Standard Pack (Private Theatre)";
  if (serviceId === "premium-pack") return "Premium Pack (All-in-One)";
  return serviceId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

/**
 * Extract a numeric price from either a number or price object
 */
const getPriceValue = (price: any): number => {
  if (typeof price === 'number') return price;
  if (typeof price === 'object' && price !== null) {
    // Check for offerPrice first (discounted price)
    if (price.offerPrice !== undefined && price.offerPrice !== null) return price.offerPrice;
    if (price.price !== undefined && price.price !== null) return price.price;
  }
  return 0;
};

const getPaymentPlan = (booking: Pick<Booking, 'paymentType' | 'paymentStatus' | 'amountPaid' | 'balanceAmount' | 'totalPrice'>) => {
  // All new bookings are advance-only. Legacy full-payment bookings still show correctly.
  if ((booking.balanceAmount || 0) === 0 && (booking.amountPaid || 0) >= (booking.totalPrice || 1) && (booking.totalPrice || 0) > 0) {
    return 'full (legacy)';
  }
  return 'advance';
};

// Small helper: fetches and previews videos for a given branch
const BranchVideoPreview = ({ branch }: { branch: string }) => {
  const [videos, setVideos] = useState<{ id: string; url: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getBranchVideos(branch)
      .then(setVideos)
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, [branch]);

  if (loading) return <p className="text-xs text-muted-foreground font-body">Loading preview...</p>;
  if (videos.length === 0) return <p className="text-xs text-muted-foreground font-body">No videos for this branch yet.</p>;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {videos.map((vid) => (
        <div key={vid.id} className="rounded-xl border border-border bg-muted/30 overflow-hidden">
          <video src={vid.url} controls className="w-full aspect-[4/5] bg-black object-cover" />
          <div className="p-3">
            <p className="text-sm font-medium text-foreground">{vid.title || "Branch Video"}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const AdminDashboard = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<"branch-1" | "branch-2">("branch-1");

  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [slotEditDate, setSlotEditDate] = useState("");
  const [slotEditTime, setSlotEditTime] = useState("");
  const [slotEditAvailableSlots, setSlotEditAvailableSlots] = useState<string[]>([]);
  const [slotEditLoading, setSlotEditLoading] = useState(false);
  const [slotEditSaving, setSlotEditSaving] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "tomorrow" | "specific" | "range" | "all">("all");
  const [customDate, setCustomDate] = useState<string>("");
  const [rangeStart, setRangeStart] = useState<string>("");
  const [rangeEnd, setRangeEnd] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"bookings" | "manual" | "campaigns" | "users" | "pricing" | "gallery" | "videos" | "settings">("bookings");
  const [manualBooking, setManualBooking] = useState<ManualBookingForm>({
    branch: "branch-1",
    service: "private-theatre-party-hall",
    date: "",
    timeSlot: "",
    duration: 1,
    name: "",
    phone: "",
    occasion: "Birthday",
    totalPrice: 0,
    paymentType: "advance",
    amountPaid: 0,
    notes: "",
    cakeRequired: false,
    selectedCake: null,
    decorationRequired: false,
    extraDecorations: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [pricingTab, setPricingTab] = useState<"services" | "cakes" | "decorations">("services");
  const [pricing, setPricing] = useState<Record<string, Record<any, any>>>({});
  const [cakes, setCakes] = useState<any[]>([]);
  const [decorations, setDecorations] = useState<any[]>([]);
  const [decorationPrice, setDecorationPrice] = useState(1500);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const [newService, setNewService] = useState({ name: "", oneHour: 0, twoHours: 0, threeHours: 0, fourHours: 0 });
  const [newCake, setNewCake] = useState({ name: "", description: "", image: "", variants: [{ quantity: "1kg", price: 0, offerPrice: undefined }] });
  const [newDecoration, setNewDecoration] = useState({ name: "", description: "", price: 0, image: "", video: "" });
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [newTestimonialTitle, setNewTestimonialTitle] = useState("");
  const [uploadingTestimonial, setUploadingTestimonial] = useState(false);
  const [editingTestimonialId, setEditingTestimonialId] = useState<string | null>(null);
  const [editingTestimonialTitle, setEditingTestimonialTitle] = useState("");
  const [galleryVideos, setGalleryVideos] = useState<{ id: string; url: string; title: string }[]>([]);
  const [branchVideos, setBranchVideos] = useState<{ id: string; url: string; title: string }[]>([]);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editingVideoTitle, setEditingVideoTitle] = useState("");
  const [previewBranch, setPreviewBranch] = useState<"branch-1" | "branch-2">("branch-1");
  const [manualAvailableSlots, setManualAvailableSlots] = useState<string[]>([]);
  const [manualBookedSlots, setManualBookedSlots] = useState<string[]>([]);
  const [branchEditData, setBranchEditData] = useState({ name: "", address: "", phone: "", mapLink: "" });
  const [socialEditData, setSocialEditData] = useState({ instagram: "", facebook: "", whatsapp: "" });
  const [savingBranch, setSavingBranch] = useState(false);
  const [bookingsEnabled, setBookingsEnabled] = useState(true);
  const [togglingBookings, setTogglingBookings] = useState(false);
  const [branchList, setBranchList] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingMultiple, setDeletingMultiple] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCode, setDeleteCode] = useState("");

  // Sync manual booking branch with selected branch
  useEffect(() => {
    setManualBooking(prev => ({ ...prev, branch: selectedBranch }));
  }, [selectedBranch]);

  // Ensure manual booking service is valid when pricing loads
  useEffect(() => {
    const serviceKeys = Object.keys(pricing);
    if (serviceKeys.length > 0) {
      if (!manualBooking.service || !pricing[manualBooking.service]) {
        // Default to first available service if current one is invalid
        setManualBooking(prev => ({ ...prev, service: serviceKeys[0] }));
      }
    }
  }, [pricing]);

  // Calculate Manual Booking Price
  useEffect(() => {
    let price = 0;
    
    // 1. Base Service Price
    const branchPricing = pricing;
    const selectedServicePricing = branchPricing[manualBooking.service];
    if (selectedServicePricing) {
      const priceForDuration = selectedServicePricing[manualBooking.duration] || selectedServicePricing[String(manualBooking.duration)];
      if (priceForDuration !== undefined) {
        price = getPriceValue(priceForDuration);
      }
    }

    // 2. Cake Price
    if (manualBooking.cakeRequired && manualBooking.selectedCake) {
      price += getPriceValue(manualBooking.selectedCake);
    }

    // 3. Basic Decoration Price
    if (manualBooking.decorationRequired) {
      price += decorationPrice;
    }
    
    // 4. Extra Decorations Price
    if (manualBooking.extraDecorations && manualBooking.extraDecorations.length > 0) {
      manualBooking.extraDecorations.forEach(d => {
        price += getPriceValue(d);
      });
    }

    if (manualBooking.totalPrice !== price) {
      setManualBooking(prev => ({ 
        ...prev, 
        totalPrice: price,
        amountPaid: prev.paymentType === 'advance' ? prev.amountPaid : price
      }));
    }
  }, [
    manualBooking.service, 
    manualBooking.duration, 
    manualBooking.cakeRequired, 
    manualBooking.selectedCake, 
    manualBooking.decorationRequired, 
    manualBooking.extraDecorations, 
    manualBooking.paymentType,
    pricing, 
    decorationPrice
  ]);

  useEffect(() => {
    if (selectedBooking) {
      setAdminNotes(selectedBooking.notes || "");
      setSlotEditDate(selectedBooking.date || "");
      setSlotEditTime(selectedBooking.timeSlot || "");
      setSlotEditAvailableSlots([]);
    }
  }, [selectedBooking]);

  useEffect(() => {
    if (!selectedBooking || !slotEditDate) return;

    const fetchSlotOptions = async () => {
      try {
        setSlotEditLoading(true);
        const data = await api.getAvailableSlots(
          selectedBooking.branch,
          slotEditDate,
          selectedBooking.service,
          selectedBooking.duration,
          true // admin — bypass past date restriction
        );

        const options = [...data.availableSlots];
        const isCurrentDate = slotEditDate === selectedBooking.date;
        if (isCurrentDate && selectedBooking.timeSlot && !options.includes(selectedBooking.timeSlot)) {
          options.unshift(selectedBooking.timeSlot);
        }

        setSlotEditAvailableSlots(options);
        if (!options.includes(slotEditTime)) {
          setSlotEditTime(options[0] || "");
        }
      } catch (error) {
        console.error("Error fetching slot options:", error);
        setSlotEditAvailableSlots([]);
      } finally {
        setSlotEditLoading(false);
      }
    };

    fetchSlotOptions();
  }, [selectedBooking, slotEditDate]);

  // Check for existing token and branch on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("adminToken");
    const savedBranch = localStorage.getItem("adminBranch") as "branch-1" | "branch-2" | null;
    if (savedToken) {
      setToken(savedToken);
      setIsLoggedIn(true);
      if (savedBranch) setSelectedBranch(savedBranch);
    }
  }, []);


  const handleLogin = async () => {
    try {
      setError(null);
      const data = await api.adminLogin(password);
      setToken(data.token);
      setSelectedBranch(data.branch as "branch-1" | "branch-2");
      setIsLoggedIn(true);
      setPassword("");
      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminBranch", data.branch);

      const bData = await api.getBranches();
      setBranchList(bData);
    } catch (err) {
      setError("Invalid password");
      console.error("Login error:", err);
    }
  };


  // Fetch bookings and stats when logged in or branch/filter changes
  useEffect(() => {
    if (isLoggedIn && token) {
      fetchData();
    }
  }, [isLoggedIn, token, selectedBranch, filter, dateFilter, customDate, rangeStart, rangeEnd]);

  useEffect(() => {
    setManualBooking(prev => ({ ...prev, branch: selectedBranch }));
  }, [selectedBranch]);

  // Check availability for manual booking
  useEffect(() => {
    if (manualBooking.date && manualBooking.branch && manualBooking.duration && manualBooking.service) {
      checkManualAvailability();
    }
  }, [manualBooking.date, manualBooking.branch, manualBooking.duration, manualBooking.service]);

  const checkManualAvailability = async () => {
    try {
      const data = await api.getAvailableSlots(
        manualBooking.branch,
        manualBooking.date,
        manualBooking.service,
        manualBooking.duration,
        true // admin — bypass past date restriction
      );
      setManualAvailableSlots(data.availableSlots);
      setManualBookedSlots(data.bookedSlots);

      // If currently selected slot is not available, reset to first available
      if (!data.availableSlots.includes(manualBooking.timeSlot) || data.bookedSlots.includes(manualBooking.timeSlot)) {
        const firstAvailable = data.availableSlots.find(s => !data.bookedSlots.includes(s));
        if (firstAvailable) {
          setManualBooking(prev => ({ ...prev, timeSlot: firstAvailable }));
        }
      }
    } catch (error) {
      console.error("Error checking manual availability:", error);
    }
  };

  const fetchData = async () => {
    if (!token) {
      console.error("No token available");
      return;
    }
    try {
      setLoading(true);
      setError(null);

      let startDate: string | undefined;
      let endDate: string | undefined;

      const getLocalIDODate = (date: Date) => {
        const offset = date.getTimezoneOffset();
        const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
        return adjustedDate.toISOString().split('T')[0];
      };

      const todayDoc = new Date();
      if (dateFilter === "today") {
        startDate = getLocalIDODate(todayDoc);
        endDate = startDate;
      } else if (dateFilter === "yesterday") {
        const yesterdayDoc = new Date(todayDoc);
        yesterdayDoc.setDate(yesterdayDoc.getDate() - 1);
        startDate = getLocalIDODate(yesterdayDoc);
        endDate = startDate;
      } else if (dateFilter === "tomorrow") {
        const tomorrowDoc = new Date(todayDoc);
        tomorrowDoc.setDate(tomorrowDoc.getDate() + 1);
        startDate = getLocalIDODate(tomorrowDoc);
        endDate = startDate;
      } else if (dateFilter === "specific" && customDate) {
        startDate = customDate;
        endDate = customDate;
      } else if (dateFilter === "range" && rangeStart && rangeEnd) {
        startDate = rangeStart;
        endDate = rangeEnd;
      }

      const [bookingsData, statsData] = await Promise.all([
        api.getBookings(token, selectedBranch, filter === "all" ? undefined : filter, startDate, endDate),
        api.getDashboardStats(token, selectedBranch, startDate, endDate),
      ]);
      setBookings(bookingsData);
      setStats(statsData);

      // Also fetch pricing data
      await fetchPricing();
    } catch (err) {
      setError("Failed to fetch data");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPricing = async () => {
    try {
      const [pricingData, cakesData, decorationsData, decorationPriceData] = await Promise.all([
        api.getPricing(selectedBranch),
        api.getCakes(selectedBranch),
        api.getDecorations(selectedBranch),
        api.getDecorationPrice(selectedBranch),
      ]);

      setPricing(pricingData);
      setCakes(cakesData);
      setDecorations(decorationsData);
      setDecorationPrice(decorationPriceData);

      // Fetch gallery data independently so one failure doesn't block others
      const [testimonialsData, heroImagesData, branchVideosData, socialData, bList] = await Promise.allSettled([
        api.getTestimonials(selectedBranch),
        api.getHeroImages(selectedBranch),
        api.getBranchVideos(selectedBranch),
        api.getSocialLinks(selectedBranch),
        api.getBranches(),
      ]);

      if (testimonialsData.status === "fulfilled") setTestimonials(testimonialsData.value);
      if (heroImagesData.status === "fulfilled") setHeroImages(heroImagesData.value);
      if (branchVideosData.status === "fulfilled") setBranchVideos(branchVideosData.value);
      if (socialData.status === "fulfilled") setSocialEditData(socialData.value);

      if (bList.status === "fulfilled") {
        setBranchList(bList.value);
        const currentBranch = bList.value.find((b: any) => b.id === selectedBranch);
        if (currentBranch) {
          setBranchEditData({
            name: currentBranch.name,
            address: currentBranch.address,
            phone: currentBranch.phone,
            mapLink: currentBranch.mapLink || ""
          });
          setBookingsEnabled(currentBranch.bookingsEnabled !== false);
        }
      }
    } catch (error) {
      console.error("Error fetching pricing:", error);
    }
  };

  const handleToggleBookings = async (enabled: boolean) => {
    if (!token) return;
    try {
      setTogglingBookings(true);
      await api.toggleBranchBookings(token, selectedBranch, enabled);
      setBookingsEnabled(enabled);
    } catch (error) {
      console.error("Error toggling bookings:", error);
      setError("Failed to update bookings status");
    } finally {
      setTogglingBookings(false);
    }
  };

  const handleSaveBranchDetails = async () => {    if (!token) return;
    try {
      setSavingBranch(true);
      await Promise.all([
        api.updateBranch(token, selectedBranch, branchEditData),
        api.updateSocialLinks(token, selectedBranch, socialEditData)
      ]);
      await fetchPricing(); // Refresh data
      alert("Branch & Social details updated successfully!");
    } catch (error) {
      console.error("Error saving branch details:", error);
      setError("Failed to update branch details");
    } finally {
      setSavingBranch(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setPassword("");
    setToken(null);
    setBookings([]);
    setStats(null);
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminBranch");
  };


  const handleDownloadExcel = async () => {
    if (!token) return;
    try {
      setDownloadingExcel(true);
      await api.downloadBookingsExcel(token, selectedBranch);
    } catch (error) {
      console.error("Error downloading Excel:", error);
      alert("Failed to download bookings file");
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleToggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map(b => b.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleDeleteSelected = () => {
    if (!token || selectedIds.length === 0) return;
    setShowDeleteModal(true);
  };

  const confirmDeleteSelected = async () => {
    if (!deleteCode) {
      alert("Please enter the security code");
      return;
    }

    try {
      setDeletingMultiple(true);
      await api.deleteMultipleBookings(token, selectedIds, deleteCode);
      setSelectedIds([]);
      setDeleteCode("");
      setShowDeleteModal(false);
      await fetchData();
      alert("Selected bookings deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting multiple bookings:", error);
      alert(error.message || "Failed to delete selected bookings");
    } finally {
      setDeletingMultiple(false);
    }
  };

  const handleManualBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const balanceAmount = Math.max(0, manualBooking.totalPrice - manualBooking.amountPaid);
      const paymentStatus = manualBooking.amountPaid >= manualBooking.totalPrice ? 'paid' : 'partially-paid';

      const bookingData = {
        ...manualBooking,
        phone: `+91 ${manualBooking.phone}`,
        paymentStatus: paymentStatus,
        paymentMode: 'manual',
        isAdminBooking: true,
        balanceAmount: balanceAmount,
        notes: manualBooking.notes,
        cakeRequired: manualBooking.cakeRequired,
        selectedCake: manualBooking.selectedCake,
        decorationRequired: manualBooking.decorationRequired,
        extraDecorations: manualBooking.extraDecorations,
      };

      await api.createBooking(bookingData);

      // Reset form
      setManualBooking({
        branch: selectedBranch,
        service: "private-theatre-party-hall",
        date: "",
        timeSlot: "",
        duration: 1,
        name: "",
        phone: "",
        occasion: "Birthday",
        totalPrice: 0,
        paymentType: "advance",
        amountPaid: 0,
        notes: "",
        cakeRequired: false,
        selectedCake: null,
        decorationRequired: false,
        extraDecorations: [],
      });

      // Refresh bookings
      await fetchData();
      alert("Booking created successfully!");
      setActiveTab("bookings");
    } catch (err: any) {
      setError(err?.message || "Failed to create booking");
      console.error("Booking error:", err);
      alert(`Booking failed: ${err?.message || "Internal error"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveService = async () => {
    try {
      const response = await fetch(`${API_BASE}/pricing?branch=${encodeURIComponent(selectedBranch)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ...editValues, branch: selectedBranch }),
      });

      if (response.ok) {
        setPricing(await response.json());
        setEditingId(null);
      }
    } catch (error) {
      console.error("Error saving pricing:", error);
    }
  };

  const handleSaveCake = async () => {
    try {
      const baseUrl = editValues.id?.startsWith("cake-") ? `${API_BASE}/cakes/${editValues.id}` : `${API_BASE}/cakes`;
      const url = `${baseUrl}?branch=${encodeURIComponent(selectedBranch)}`;
      const method = editValues.id?.startsWith("cake-") ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ...editValues, branch: selectedBranch }),
      });

      if (response.ok) {
        await fetchPricing();
        setEditingId(null);
      }
    } catch (error) {
      console.error("Error saving cake:", error);
    }
  };

  const handleSaveDecoration = async () => {
    try {
      const baseUrl = editValues.id?.startsWith("extra-") ? `${API_BASE}/decorations/${editValues.id}` : `${API_BASE}/decorations`;
      const url = `${baseUrl}?branch=${encodeURIComponent(selectedBranch)}`;
      const method = editValues.id?.startsWith("extra-") ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ...editValues, branch: selectedBranch }),
      });

      if (response.ok) {
        await fetchPricing();
        setEditingId(null);
      }
    } catch (error) {
      console.error("Error saving decoration:", error);
    }
  };

  const handleSaveDecorationPrice = async () => {
    try {
      const response = await fetch(`${API_BASE}/decoration-price?branch=${encodeURIComponent(selectedBranch)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ price: decorationPrice, branch: selectedBranch }),
      });

      if (response.ok) {
        setEditingId(null);
      }
    } catch (error) {
      console.error("Error saving decoration price:", error);
    }
  };

  const handleDeleteCake = async (id: string) => {
    if (confirm("Are you sure you want to delete this cake?")) {
      try {
        const response = await fetch(`${API_BASE}/cakes/${id}?branch=${encodeURIComponent(selectedBranch)}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          await fetchPricing();
        }
      } catch (error) {
        console.error("Error deleting cake:", error);
      }
    }
  };

  const handleDeleteDecoration = async (id: string) => {
    if (confirm("Are you sure you want to delete this decoration?")) {
      try {
        const response = await fetch(`${API_BASE}/decorations/${id}?branch=${encodeURIComponent(selectedBranch)}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          await fetchPricing();
        }
      } catch (error) {
        console.error("Error deleting decoration:", error);
      }
    }
  };

  const handleEditService = (service: string, duration: number, price: any) => {
    setEditingId(`${service}-${duration}`);
    const actualPrice = typeof price === 'object' ? (price.price || 0) : price;
    const offerPrice = typeof price === 'object' ? price.offerPrice : undefined;
    setEditValues({ service, duration, price: actualPrice, offerPrice });
  };

  const handleEditCake = (cake: any) => {
    setEditingId(cake.id || "");
    setEditValues(cake);
  };

  const handleEditDecoration = (decoration: any) => {
    setEditingId(decoration.id || "");
    setEditValues(decoration);
  };

  const handleGalleryImageUpload = async (type: "cake" | "decoration", id: string, file?: File | null) => {
    if (!file || !token) return;
    try {
      setUploadingImageId(`${type}-${id}`);
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.readAsDataURL(file);
      });
      await api.updateGalleryImage(token, selectedBranch, type, id, image);
      await fetchPricing();
    } catch (error) {
      console.error("Error uploading gallery image:", error);
      setError("Failed to upload image");
    } finally {
      setUploadingImageId(null);
    }
  };

  const readFileAsDataUrl = (file?: File | null) =>
    new Promise<string>((resolve, reject) => {
      if (!file) {
        resolve("");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });

  const readDecorationMediaFile = async (file?: File | null) => {
    const media = await readFileAsDataUrl(file);
    if (!media) return {};
    return file?.type.startsWith("video/") ? { video: media } : { image: media };
  };

  const handleCreateService = async () => {
    if (!token || !newService.name.trim()) return;
    const service = newService.name.trim().toLowerCase().replace(/\s+/g, "-");
    try {
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      };
      const updates = [
        { duration: 1, price: newService.oneHour },
        { duration: 2, price: newService.twoHours },
        { duration: 3, price: newService.threeHours },
        { duration: 4, price: newService.fourHours },
      ];
      for (const update of updates) {
        if (update.price <= 0) continue; // Skip if price not set
        await fetch(`${API_BASE}/pricing?branch=${encodeURIComponent(selectedBranch)}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ service, duration: update.duration, price: update.price, branch: selectedBranch }),
        });
      }
      setNewService({ name: "", oneHour: 0, twoHours: 0, threeHours: 0, fourHours: 0 });
      await fetchPricing();
    } catch (error) {
      console.error("Error creating service:", error);
      setError("Failed to create service");
    }
  };

  const handleCreateCake = async () => {
    if (!token || !newCake.name.trim()) return;
    try {
      await fetch(`${API_BASE}/cakes?branch=${encodeURIComponent(selectedBranch)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ ...newCake, branch: selectedBranch }),
      });
      setNewCake({ name: "", description: "", price: 0, image: "", quantity: "1kg" });
      await fetchPricing();
    } catch (error) {
      console.error("Error creating cake:", error);
      setError("Failed to create cake");
    }
  };

  const handleCreateDecoration = async () => {
    if (!token || !newDecoration.name.trim()) return;
    try {
      await fetch(`${API_BASE}/decorations?branch=${encodeURIComponent(selectedBranch)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ ...newDecoration, branch: selectedBranch }),
      });
      setNewDecoration({ name: "", description: "", price: 0, image: "", video: "" });
      await fetchPricing();
    } catch (error) {
      console.error("Error creating decoration:", error);
      setError("Failed to create decoration");
    }
  };

  const handleUploadTestimonial = async (file?: File | null) => {
    if (!token || !file) return;
    try {
      setUploadingTestimonial(true);
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.readAsDataURL(file);
      });
      await api.addTestimonialImage(token, selectedBranch, image, newTestimonialTitle || undefined);
      setNewTestimonialTitle("");
      setTestimonials(await api.getTestimonials(selectedBranch));
    } catch (error) {
      console.error("Error uploading testimonial:", error);
      setError("Failed to upload testimonial image");
    } finally {
      setUploadingTestimonial(false);
    }
  };

  const handleDeleteTestimonial = async (id: string) => {
    if (!token) return;
    try {
      await api.deleteTestimonialImage(token, selectedBranch, id);
      setTestimonials(await api.getTestimonials(selectedBranch));
    } catch (error) {
      console.error("Error deleting testimonial:", error);
      setError("Failed to delete testimonial image");
    }
  };

  const handleUploadVideo = async (file?: File | null) => {
    if (!token || !file) return;
    try {
      setUploadingVideo(true);
      setVideoUploadProgress(0);

      // Step 1: Get signed upload params from backend
      const sig = await api.getVideoUploadSignature(token, selectedBranch);

      // Step 2: Upload directly from browser to Cloudinary (supports up to 500MB)
      const videoUrl = await api.uploadVideoToCloudinary(file, sig, (pct) => {
        setVideoUploadProgress(pct);
      });

      // Step 3: Save the returned Cloudinary URL to the database
      const updated = await api.saveBranchVideo(token, selectedBranch, videoUrl, newVideoTitle || undefined);
      setNewVideoTitle("");
      setBranchVideos(updated);
      setPreviewBranch(selectedBranch);
    } catch (error) {
      console.error("Error uploading video:", error);
      setError("Failed to upload video. Please try again.");
    } finally {
      setUploadingVideo(false);
      setVideoUploadProgress(0);
    }
  };

  const startEditingVideo = (video: { id: string; title: string }) => {
    setEditingVideoId(video.id);
    setEditingVideoTitle(video.title || "");
  };

  const cancelEditingVideo = () => {
    setEditingVideoId(null);
    setEditingVideoTitle("");
  };

  const handleUpdateVideo = async (id: string) => {
    if (!token) return;
    try {
      const updated = await api.updateBranchVideo(token, selectedBranch, id, editingVideoTitle.trim());
      setBranchVideos(updated);
      cancelEditingVideo();
    } catch (error) {
      console.error("Error updating video:", error);
      setError("Failed to update video");
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!token) return;
    try {
      const updated = await api.deleteBranchVideo(token, selectedBranch, id);
      setBranchVideos(updated);
      if (editingVideoId === id) cancelEditingVideo();
    } catch (error) {
      console.error("Error deleting video:", error);
      setError("Failed to delete video");
    }
  };

  const handleUpdateTestimonial = async (id: string, title: string) => {
    if (!token) return;
    try {
      await api.updateTestimonialImage(token, selectedBranch, id, { title });
      setTestimonials(prev => prev.map(t => t.id === id ? { ...t, title } : t));
      setEditingTestimonialId(null);
    } catch (error) {
      console.error("Error updating testimonial:", error);
      setError("Failed to update testimonial");
    }
  };

  const handleReplaceTestimonialImage = async (id: string, file: File) => {
    if (!token) return;
    try {
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.readAsDataURL(file);
      });
      await api.updateTestimonialImage(token, selectedBranch, id, { image });
      setTestimonials(await api.getTestimonials(selectedBranch));
    } catch (error) {
      console.error("Error replacing image:", error);
      setError("Failed to replace image");
    }
  };

  const handleHeroUpload = async (file?: File | null) => {
    if (!token || !file) return;
    try {
      setUploadingHero(true);
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.readAsDataURL(file);
      });
      const updated = await api.addHeroImage(token, selectedBranch, image);
      setHeroImages(updated);
    } catch (error) {
      console.error("Error uploading hero image:", error);
      setError("Failed to upload hero image");
    } finally {
      setUploadingHero(false);
    }
  };

  const handleDeleteHero = async (index: number) => {
    if (!token) return;
    if (confirm("Delete this hero carousel image?")) {
      try {
        const updated = await api.deleteHeroImage(token, selectedBranch, index);
        setHeroImages(updated);
      } catch (error) {
        console.error("Error deleting hero image:", error);
        setError("Failed to delete hero image");
      }
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-24">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-primary glow-gold">
            <LogIn className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-2 text-center font-display text-2xl font-bold text-foreground">Admin Login</h2>
          <p className="mb-6 text-center text-xs text-muted-foreground font-body">
            Your password determines which branch you manage
          </p>

          <div className="relative mb-4">
            <label htmlFor="admin-password" id="admin-password-label" className="sr-only">Branch Password</label>
            <input
              id="admin-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter branch password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleLogin()}
              className="w-full rounded-xl border border-border bg-muted px-4 py-3 pr-12 text-foreground placeholder:text-muted-foreground font-body focus:border-primary focus:outline-none"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {error && <p className="mb-4 text-sm text-red-500 font-body">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full rounded-xl bg-gradient-gold py-3 text-sm font-bold text-primary-foreground transition-all hover:scale-105 font-body"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  const handleSaveNote = async () => {
    if (!selectedBooking || !token) return;
    try {
      setIsSavingNote(true);
      await api.updateBooking(token, selectedBooking.id, { notes: adminNotes });
      // Update local state
      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, notes: adminNotes } : b));
      setSelectedBooking(prev => prev ? { ...prev, notes: adminNotes } : null);
      alert("Note saved successfully!");
    } catch (err) {
      console.error("Failed to save note:", err);
      alert("Failed to save note");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleSaveSlotChange = async () => {
    if (!selectedBooking || !token || !slotEditDate || !slotEditTime) return;
    if (slotEditDate === selectedBooking.date && slotEditTime === selectedBooking.timeSlot) {
      alert("Choose a different date or time slot first.");
      return;
    }

    try {
      setSlotEditSaving(true);
      const updated = await api.updateBooking(token, selectedBooking.id, {
        date: slotEditDate,
        timeSlot: slotEditTime,
      });

      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, ...updated } : b));
      setSelectedBooking(prev => prev ? { ...prev, ...updated } : null);
      await fetchData();
      alert("Slot changed successfully. The old slot is now free and the new slot is blocked.");
    } catch (err) {
      console.error("Failed to change slot:", err);
      alert("Failed to change slot. The selected slot may already be booked.");
    } finally {
      setSlotEditSaving(false);
    }
  };

  const filtered = bookings.filter((b) =>
    b.branch === selectedBranch && (
      filter === "all" || 
      (filter === "paid" && (b.paymentStatus === "paid" || b.paymentStatus === "partially-paid")) ||
      b.paymentStatus === filter
    )
  ).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground font-body mt-1">
              {branchList.find((b) => b.id === selectedBranch)?.name}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-medium transition-all font-body hover:border-primary"
            >
              <LogIn className="h-3 w-3" />
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-1 sm:gap-2 border-b border-border overflow-x-auto scrollbar-hide">
          {[
            { id: "bookings", label: "Bookings", icon: Calendar },
            { id: "manual", label: "Manual Booking", icon: Plus },
            { id: "users", label: "Users DB", icon: Users },
            { id: "campaigns", label: "Campaigns", icon: MessageSquare },
            { id: "pricing", label: "Pricing", icon: Settings },
            { id: "gallery", label: "Gallery", icon: Eye },
            { id: "videos", label: "Home Videos", icon: Play },
            { id: "settings", label: "Settings", icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-all font-body whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-100 p-4 text-sm text-red-800 font-body">
            {error}
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === "bookings" && (
          <>
            <div className="flex gap-2 mb-8 flex-wrap">
              {(["all", "pending", "paid"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium capitalize transition-all font-body ${filter === f ? "border-primary bg-muted text-primary" : "border-border text-foreground hover:border-primary"
                    }`}
                >
                  {f === "pending" && <Clock className="h-3 w-3" />}
                  {f === "paid" && <CheckCircle className="h-3 w-3" />}
                  {f === "all" && <Filter className="h-3 w-3" />}
                  {f === "paid" ? "Confirmed" : f}
                </button>
              ))}
              <button
                onClick={handleDownloadExcel}
                disabled={downloadingExcel}
                className="flex items-center gap-1.5 rounded-full border border-primary bg-muted px-4 py-2 text-xs font-medium text-primary transition-all hover:bg-primary/10 disabled:opacity-50 font-body"
              >
                <Download className="h-3 w-3" />
                {downloadingExcel ? "Downloading..." : "Download Excel"}
              </button>
              {selectedIds.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={deletingMultiple}
                  className="flex items-center gap-1.5 rounded-full border border-red-600 bg-red-50 px-4 py-2 text-xs font-medium text-red-600 transition-all hover:bg-red-100 disabled:opacity-50 font-body"
                >
                  <Trash2 className="h-3 w-3" />
                  {deletingMultiple ? "Deleting..." : `Delete Selected (${selectedIds.length})`}
                </button>
              )}
            </div>

            {/* Stats */}
            {stats && (
              <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
                {[
                  { label: "Total Bookings", value: stats.totalBookings, icon: Calendar, color: "text-primary" },
                  { label: "Confirmed Bookings", value: stats.paidBookings, icon: CheckCircle, color: "text-green-600" },
                  { label: "Pending Bookings", value: stats.pendingBookings, icon: Clock, color: "text-yellow-600" },
                  { label: "Total Value", value: `₹${stats.totalRevenue.toLocaleString()}`, icon: CheckCircle, color: "text-foreground" },
                  { label: "Amount Received", value: `₹${stats.totalAmountPaid.toLocaleString()}`, icon: CheckCircle, color: "text-green-600" },
                  { label: "Total Balance", value: `₹${stats.totalBalanceAmount.toLocaleString()}`, icon: CheckCircle, color: "text-red-600" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                      <div>
                        <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">{stat.label}</p>
                        <p className={`text-lg font-bold font-display ${stat.color}`}>{stat.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bookings Table */}
            {/* Date Filters */}
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => setDateFilter("all")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${dateFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                All Time
              </button>
              <button
                onClick={() => setDateFilter("today")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${dateFilter === "today" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                Today
              </button>
              <button
                onClick={() => setDateFilter("yesterday")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${dateFilter === "yesterday" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                Yesterday
              </button>
              <button
                onClick={() => setDateFilter("tomorrow")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${dateFilter === "tomorrow" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                Tomorrow
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDateFilter("specific")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${dateFilter === "specific" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  Specific Date
                </button>
                {dateFilter === "specific" && (
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setDateFilter("range")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${dateFilter === "range" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  Date Range
                </button>
                {dateFilter === "range" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-muted-foreground font-body whitespace-nowrap">From</label>
                      <input
                        type="date"
                        value={rangeStart}
                        onChange={(e) => setRangeStart(e.target.value)}
                        className="rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-muted-foreground font-body whitespace-nowrap">To</label>
                      <input
                        type="date"
                        value={rangeEnd}
                        min={rangeStart}
                        onChange={(e) => setRangeEnd(e.target.value)}
                        className="rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    {rangeStart && rangeEnd && (
                      <span className="text-xs text-muted-foreground font-body">
                        {Math.round((new Date(rangeEnd).getTime() - new Date(rangeStart).getTime()) / 86400000) + 1} days
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground font-body">
                  No bookings found
                </div>
              ) : (
                <table className="w-full text-sm font-body">
                  <thead className="border-b border-border bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          onChange={handleSelectAll}
                          checked={filtered.length > 0 && selectedIds.length === filtered.length}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                        />
                      </th>
                      {["ID", "Name", "Service", "Date", "Time", "Status", "Mode", "Payment", "Paid", "Balance", "Total", "Booked At", ""].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((b) => (
                      <tr key={b.id} className={`border-b border-border hover:bg-muted transition-colors ${selectedIds.includes(b.id) ? "bg-primary/5" : ""}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(b.id)}
                            onChange={() => handleToggleSelection(b.id)}
                            className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                          />
                        </td>
                        <td className="px-4 py-3 text-foreground font-medium">{b.id}</td>
                        <td className="px-4 py-3 text-foreground">{b.name}</td>
                        <td className="px-4 py-3 text-foreground capitalize">{b.service.replace(/-/g, ' ')}</td>
                        <td className="px-4 py-3 text-muted-foreground">{b.date}</td>
                        <td className="px-4 py-3 text-muted-foreground">{b.timeSlot}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${b.paymentStatus === "paid" ? "bg-green-100 text-green-800" : b.paymentStatus === "cancelled" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                            }`}>
                            {b.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{b.paymentMode ? String(b.paymentMode).replace('-', ' ') : '—'}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{getPaymentPlan(b)}</td>
                        <td className="px-4 py-3 font-semibold text-green-600">₹{(["paid", "partially-paid"].includes(b.paymentStatus)) ? getPriceValue(b.amountPaid || 0).toLocaleString() : "0"}</td>
                        <td className="px-4 py-3 font-semibold text-red-600">₹{(["paid", "partially-paid"].includes(b.paymentStatus)) ? getPriceValue(b.balanceAmount || 0).toLocaleString() : "0"}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">₹{getPriceValue(b.totalPrice).toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {b.createdAt ? new Date(b.createdAt).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setSelectedBooking(b)} className="text-primary hover:text-primary transition-colors">
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Booking Details Modal */}
            {selectedBooking && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-8">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="font-display text-2xl font-bold text-foreground">Booking Details</h2>
                    <button
                      onClick={() => setSelectedBooking(null)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Booking Info */}
                    <div className="rounded-xl border border-border bg-muted p-4">
                      <h3 className="mb-4 font-semibold text-foreground">Booking Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Booking ID</p>
                          <p className="font-mono font-semibold text-foreground">{selectedBooking.id}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                                selectedBooking.paymentStatus === "paid" ? "bg-green-100 text-green-800" : 
                                selectedBooking.paymentStatus === "partially-paid" ? "bg-blue-100 text-blue-800" :
                                "bg-yellow-100 text-yellow-800"
                            }`}>
                            {selectedBooking.paymentStatus}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Booked At</p>
                          <p className="text-sm text-foreground">
                            {selectedBooking.createdAt ? new Date(selectedBooking.createdAt).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Last Updated</p>
                          <p className="text-sm text-foreground">
                            {selectedBooking.updatedAt ? new Date(selectedBooking.updatedAt).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Slot Info */}
                    <div className="rounded-xl border border-border bg-muted p-4">
                      <h3 className="mb-4 font-semibold text-foreground">Slot Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Service</p>
                          <p className="font-semibold text-foreground capitalize">{selectedBooking.service.replace('-', ' ')}</p>
                        </div>
                        {selectedBooking.hall && (
                          <div>
                            <p className="text-xs text-muted-foreground">Screen</p>
                            <p className="font-semibold text-foreground capitalize">
                              {selectedBooking.hall === 'prime' ? 'Prime Screen' : selectedBooking.hall === 'private' ? 'Private Screen' : selectedBooking.hall}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground">Date</p>
                          <p className="font-semibold text-foreground">{selectedBooking.date}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Time Slot</p>
                          <p className="font-semibold text-foreground">{selectedBooking.timeSlot}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Duration</p>
                          <p className="font-semibold text-foreground">{selectedBooking.duration} hour(s)</p>
                        </div>
                      </div>
                    </div>

                    {/* Change Slot */}
                    {selectedBooking.paymentStatus !== "cancelled" && (
                      <div className="rounded-xl border border-border bg-muted p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-foreground">Change Time Slot</h3>
                            <p className="text-xs text-muted-foreground">
                              Moving this booking frees the old slot and blocks the selected new slot.
                            </p>
                          </div>
                          <button
                            onClick={handleSaveSlotChange}
                            disabled={slotEditSaving || slotEditLoading || !slotEditDate || !slotEditTime}
                            className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-white transition-all hover:scale-105 disabled:opacity-50"
                          >
                            {slotEditSaving ? "Saving..." : "Save Slot"}
                          </button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="slot-edit-date" className="mb-2 block text-xs font-medium text-muted-foreground">
                              Date
                            </label>
                            <input
                              id="slot-edit-date"
                              type="date"
                              value={slotEditDate}
                              onChange={(e) => setSlotEditDate(e.target.value)}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                            />
                          </div>
                          <div>
                            <label htmlFor="slot-edit-time" className="mb-2 block text-xs font-medium text-muted-foreground">
                              Available Time Slot
                            </label>
                            <select
                              id="slot-edit-time"
                              value={slotEditTime}
                              onChange={(e) => setSlotEditTime(e.target.value)}
                              disabled={slotEditLoading || slotEditAvailableSlots.length === 0}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-60"
                            >
                              {slotEditLoading ? (
                                <option>Loading slots...</option>
                              ) : slotEditAvailableSlots.length === 0 ? (
                                <option>No slots available</option>
                              ) : (
                                slotEditAvailableSlots.map((slot) => (
                                  <option key={slot} value={slot}>
                                    {slot}{slot === selectedBooking.timeSlot && slotEditDate === selectedBooking.date ? " (current)" : ""}
                                  </option>
                                ))
                              )}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Customer Info */}
                    <div className="rounded-xl border border-border bg-muted p-4">
                      <h3 className="mb-4 font-semibold text-foreground">Customer Information</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Name:</span>
                          <p className="font-semibold text-foreground">{selectedBooking.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm text-foreground">{selectedBooking.phone}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Occasion</p>
                          <p className="text-sm text-foreground">{selectedBooking.occasion}</p>
                        </div>
                      </div>
                    </div>

                    {/* Payment Info */}
                    <div className="rounded-xl border border-border bg-muted p-4">
                      <h3 className="mb-4 font-semibold text-foreground">Payment Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Amount</p>
                          <p className="text-xl font-bold text-primary">₹{getPriceValue(selectedBooking.totalPrice).toLocaleString()}</p>
                          {selectedBooking.extraPersonsCharge ? (
                            <p className="text-[10px] text-muted-foreground font-body">Inc. ₹{getPriceValue(selectedBooking.extraPersonsCharge)} extra charge</p>
                          ) : null}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Payment Plan</p>
                          <p className="text-sm font-semibold capitalize">{getPaymentPlan(selectedBooking)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Payment Mode</p>
                          <p className="text-sm font-semibold">{selectedBooking.paymentMode ? String(selectedBooking.paymentMode).replace('-', ' ') : '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Amount Paid</p>
                          <p className="text-lg font-bold text-green-600">₹{(["paid", "partially-paid"].includes(selectedBooking.paymentStatus)) ? getPriceValue(selectedBooking.amountPaid || 0).toLocaleString() : "0"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Balance Amount</p>
                          <p className="text-lg font-bold text-red-600">₹{(["paid", "partially-paid"].includes(selectedBooking.paymentStatus)) ? getPriceValue(selectedBooking.balanceAmount || 0).toLocaleString() : "0"}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Status</p>
                          <p className={`text-sm font-semibold ${selectedBooking.paymentStatus === "paid" ? "text-green-600" : selectedBooking.paymentStatus === "cancelled" ? "text-red-600" : "text-yellow-600"
                            }`}>
                            {selectedBooking.paymentStatus.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Admin Notes */}
                    <div className="rounded-xl border border-border bg-muted p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-foreground">Booking Notes</h3>
                        <button
                          onClick={handleSaveNote}
                          disabled={isSavingNote}
                          className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-white transition-all hover:scale-105 disabled:opacity-50"
                        >
                          {isSavingNote ? "Saving..." : "Save Note"}
                        </button>
                      </div>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Add internal notes about this booking (e.g., customer requests, special arrangements)..."
                        className="w-full min-h-[100px] rounded-lg border border-border bg-background p-3 text-sm text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                      {/* WhatsApp resend */}
                      <button
                        onClick={async () => {
                          if (!token || !selectedBooking) return;
                          try {
                            setSendingWhatsApp(true);
                            const res = await fetch(`${API_BASE}/admin/notify-booking`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ bookingId: selectedBooking.id }),
                            });
                            const data = await res.json();
                            if (res.ok) alert(`✅ WhatsApp sent to ${selectedBooking.phone}`);
                            else alert(`❌ Failed: ${data.error || 'Unknown error'}`);
                          } catch (err) {
                            alert('❌ Failed to send WhatsApp');
                          } finally {
                            setSendingWhatsApp(false);
                          }
                        }}
                        disabled={sendingWhatsApp}
                        className="flex-1 rounded-xl border border-green-500 text-green-600 px-4 py-3 font-semibold transition-all hover:bg-green-50 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {sendingWhatsApp ? "Sending..." : "📲 Send WhatsApp"}
                      </button>
                      <button
                        onClick={() => setSelectedBooking(null)}
                        className="flex-1 rounded-xl border border-border px-4 py-3 font-semibold text-foreground transition-all hover:bg-muted"
                      >
                        Close
                      </button>
                      {selectedBooking.paymentStatus !== 'cancelled' && (
                        <button
                          onClick={async () => {
                            if (confirm("Are you sure you want to cancel this booking?")) {
                              try {
                                if (!token) return;
                                await api.updateBooking(token, selectedBooking.id, { paymentStatus: 'cancelled' });
                                await fetchData();
                                setSelectedBooking(null);
                              } catch (err) {
                                console.error("Cancel failed:", err);
                                alert("Failed to cancel booking");
                              }
                            }
                          }}
                          className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition-all hover:bg-red-700"
                        >
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Campaigns Tab */}
        {activeTab === "campaigns" && (
          <AdminCampaign token={token!} selectedBranch={selectedBranch} />
        )}

        {/* Users DB Tab */}
        {activeTab === "users" && (
          <UsersDb token={token!} />
        )}

        {/* Manual Booking Tab */}
        {activeTab === "manual" && (
          <div className="max-w-2xl rounded-2xl border border-border bg-card p-8">
            <h2 className="mb-6 font-display text-2xl font-bold text-foreground">Create Manual Booking (Cash Payment)</h2>

            <form onSubmit={handleManualBookingSubmit} className="space-y-6">
              {/* Branch */}
              <div>
                <label htmlFor="manual-branch" className="mb-2 block text-sm font-medium text-foreground font-body">Branch</label>
                <select
                  id="manual-branch"
                  name="branch"
                  value={manualBooking.branch}
                  onChange={(e) => setManualBooking({ ...manualBooking, branch: e.target.value })}
                  className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground font-body focus:border-primary focus:outline-none"
                >
                  {branchList.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Service / Pack Type */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-foreground font-body">Pack Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.keys(pricing).map((serviceId) => {
                    const isStandard = serviceId === "private-theatre-party-hall";
                    const isPremium = serviceId === "premium-pack";
                    const isSelected = manualBooking.service === serviceId;
                    
                    return (
                      <button
                        key={serviceId}
                        type="button"
                        onClick={() => setManualBooking({ ...manualBooking, service: serviceId })}
                        className={`rounded-xl border p-4 text-left transition-all ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50"}`}
                      >
                        <p className="font-bold text-sm">{formatServiceName(serviceId)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {isPremium ? "Full setup with Entry, Photos & Cake" : isStandard ? "Standard Theatre & Hall" : "Service Pack"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date */}
              <div>
                <label htmlFor="manual-date" className="mb-2 block text-sm font-medium text-foreground font-body">Date</label>
                <input
                  id="manual-date"
                  name="date"
                  type="date"
                  value={manualBooking.date}
                  onChange={(e) => setManualBooking({ ...manualBooking, date: e.target.value })}
                  required
                  className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground font-body focus:border-primary focus:outline-none"
                />
              </div>

              {/* Time Slot & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="manual-timeSlot" className="mb-2 block text-sm font-medium text-foreground font-body">Time Slot</label>
                  <select
                    id="manual-timeSlot"
                    name="timeSlot"
                    value={manualBooking.timeSlot}
                    onChange={(e) => setManualBooking({ ...manualBooking, timeSlot: e.target.value })}
                    className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground font-body focus:border-primary focus:outline-none"
                  >
                    {(() => {
                      // Sort by actual time including minutes
                      const parseToMinutes = (timeStr: string) => {
                        const match = timeStr.match(/^(\d+):(\d+)\s+(AM|PM)$/);
                        if (!match) return 0;
                        let h = parseInt(match[1]);
                        const m = parseInt(match[2]);
                        const p = match[3];
                        if (h === 12) h = 0;
                        if (p === "PM") h += 12;
                        return h * 60 + m;
                      };

                      const options = [...new Set([...manualAvailableSlots, ...manualBookedSlots])].sort((a, b) => parseToMinutes(a) - parseToMinutes(b));

                      return options.map((slot) => {
                        const isBooked = manualBookedSlots.includes(slot);
                        const isAvailable = manualAvailableSlots.includes(slot);
                        return (
                          <option key={slot} value={slot} disabled={isBooked || !isAvailable}>
                            {slot} {isBooked ? "(Booked)" : !isAvailable ? "(Unavailable)" : ""}
                          </option>
                        );
                      });
                    })()}
                  </select>
                </div>
                <div>
                  <label htmlFor="manual-duration" className="mb-2 block text-sm font-medium text-foreground font-body">Duration (hours)</label>
                  <select
                    id="manual-duration"
                    name="duration"
                    value={manualBooking.duration}
                    onChange={(e) => {
                      const newDuration = parseInt(e.target.value);
                      setManualBooking({ ...manualBooking, duration: newDuration });
                    }}
                    className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground font-body focus:border-primary focus:outline-none"
                  >
                    <option value="1">1 Hour</option>
                    <option value="2">2 Hours</option>
                    <option value="3">3 Hours</option>
                    <option value="4">4 Hours</option>
                  </select>
                </div>
              </div>

              {/* Customer Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="manual-name" className="mb-2 block text-sm font-medium text-foreground font-body">Name</label>
                  <input
                    id="manual-name"
                    name="name"
                    type="text"
                    value={manualBooking.name}
                    onChange={(e) => setManualBooking({ ...manualBooking, name: e.target.value })}
                    required
                    className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground font-body focus:border-primary focus:outline-none"
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <label htmlFor="manual-phone" className="mb-2 block text-sm font-medium text-foreground font-body">Phone</label>
                  <div className="flex items-center rounded-xl border border-border bg-muted overflow-hidden">
                    <span className="px-4 py-3 text-foreground font-body">+91</span>
                    <input
                      id="manual-phone"
                      name="phone"
                      type="tel"
                      value={manualBooking.phone}
                      onChange={(e) => setManualBooking({ ...manualBooking, phone: e.target.value })}
                      required
                      maxLength={10}
                      className="flex-1 bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground font-body focus:outline-none"
                      placeholder="10 digit number"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <select
                    value={manualBooking.occasion}
                    onChange={(e) => setManualBooking({ ...manualBooking, occasion: e.target.value })}
                    className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground font-body focus:border-primary focus:outline-none"
                  >
                    {["Birthday", "Anniversary", "Proposal", "Baby Shower", "Farewell", "Get Together", "Date Night", "Other"].map((occ) => (
                      <option key={occ} value={occ}>{occ}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cake Selection */}
              <div className="space-y-4 rounded-xl border border-border p-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <label className="text-sm font-medium text-foreground">Cake Required?</label>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setManualBooking({ ...manualBooking, cakeRequired: !manualBooking.cakeRequired })}
                    className={`h-6 w-11 rounded-full transition-colors relative ${manualBooking.cakeRequired ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${manualBooking.cakeRequired ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                
                {manualBooking.cakeRequired && (
                  <div className="space-y-3">
                    <select
                      value={manualBooking.selectedCake?.id || ""}
                      onChange={(e) => {
                        const cake = cakes.find(c => c.id === e.target.value);
                        const variants = cake?.variants || [{ quantity: cake?.quantity || '1kg', price: cake?.price, offerPrice: cake?.offerPrice }];
                        setManualBooking({ ...manualBooking, selectedCake: { ...cake, ...variants[0] } });
                      }}
                      className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground font-body focus:border-primary focus:outline-none"
                    >
                      <option value="">Select a cake...</option>
                      {cakes.map((cake) => (
                        <option key={cake.id} value={cake.id}>
                          {cake.name}
                        </option>
                      ))}
                    </select>

                    {manualBooking.selectedCake && (
                      <div className="flex flex-wrap gap-2">
                        {(manualBooking.selectedCake.variants || [
                          { quantity: manualBooking.selectedCake.quantity || '1kg', price: manualBooking.selectedCake.price, offerPrice: manualBooking.selectedCake.offerPrice }
                        ]).map((v: any, idx: number) => {
                          const isSelected = manualBooking.selectedCake.quantity === v.quantity;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setManualBooking({ 
                                ...manualBooking, 
                                selectedCake: { ...manualBooking.selectedCake, ...v } 
                              })}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                isSelected ? "bg-primary text-white border-primary shadow-sm" : "bg-card text-muted-foreground border-border hover:border-primary/50"
                              }`}
                            >
                              {v.quantity} (₹{getEffectivePrice(v)})
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Decoration Selection */}
              <div className="space-y-4 rounded-xl border border-border p-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" />
                    <label className="text-sm font-medium text-foreground">Basic Decoration (₹{decorationPrice})?</label>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setManualBooking({ ...manualBooking, decorationRequired: !manualBooking.decorationRequired })}
                    className={`h-6 w-11 rounded-full transition-colors relative ${manualBooking.decorationRequired ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${manualBooking.decorationRequired ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Extra Decorations</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {decorations.map((dec) => {
                      const isSelected = manualBooking.extraDecorations?.some(d => d.id === dec.id);
                      return (
                        <button
                          key={dec.id}
                          type="button"
                          onClick={() => {
                            const current = manualBooking.extraDecorations || [];
                            const updated = isSelected 
                              ? current.filter(d => d.id !== dec.id)
                              : [...current, dec];
                            setManualBooking({ ...manualBooking, extraDecorations: updated });
                          }}
                          className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all ${isSelected ? "border-primary bg-primary/10" : "border-border bg-muted/20 hover:border-primary/30"}`}
                        >
                          <span className="text-[11px] font-medium leading-tight">{dec.name}</span>
                          <span className="text-[10px] text-primary font-bold">₹{getPriceValue(dec)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Total Price */}
              <div>
                <label htmlFor="manual-totalPrice" className="mb-2 block text-sm font-medium text-foreground font-body">Total Price (₹)</label>
                <input
                  id="manual-totalPrice"
                  name="totalPrice"
                  type="number"
                  value={manualBooking.totalPrice}
                  onChange={(e) => {
                    const price = parseFloat(e.target.value) || 0;
                    setManualBooking({ 
                      ...manualBooking, 
                      totalPrice: price,
                      amountPaid: manualBooking.amountPaid // keep existing advance amount
                    });
                  }}
                  required
                  min="0"
                  className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground font-body focus:border-primary focus:outline-none"
                  placeholder="Enter total price"
                />
              </div>

              {/* Payment Plan — advance only */}
              <div className="rounded-xl border border-primary bg-primary/5 p-4">
                <p className="font-bold text-sm text-foreground">Advance Payment</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Partial payment — balance collected at venue</p>
              </div>

                <div>
                  <label htmlFor="manual-amountPaid" className="mb-2 block text-sm font-medium text-foreground font-body">Amount Paid (₹)</label>
                  <input
                    id="manual-amountPaid"
                    name="amountPaid"
                    type="number"
                    value={manualBooking.amountPaid}
                    onChange={(e) => setManualBooking({ ...manualBooking, amountPaid: parseFloat(e.target.value) || 0 })}
                    required
                    min="0"
                    max={manualBooking.totalPrice}
                    className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground font-body focus:border-primary focus:outline-none"
                    placeholder="Enter amount paid"
                  />
                  <p className="mt-2 text-xs text-muted-foreground font-body">
                    Balance to be paid at venue: <span className="font-bold text-red-600">₹{Math.max(0, manualBooking.totalPrice - manualBooking.amountPaid).toLocaleString()}</span>
                  </p>
                </div>

              {/* Notes Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground font-body">Internal Notes (Optional)</label>
                <textarea
                  value={manualBooking.notes}
                  onChange={(e) => setManualBooking({ ...manualBooking, notes: e.target.value })}
                  placeholder="Any special arrangements or internal notes for this booking..."
                  className="w-full min-h-[100px] rounded-xl border border-border bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground font-body focus:border-primary focus:outline-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !manualBooking.date || !manualBooking.timeSlot}
                className="w-full rounded-xl bg-gradient-gold py-4 text-sm font-bold text-primary-foreground transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 glow-gold font-body"
              >
                {submitting ? "Creating Booking..." : "Create Booking (Cash Payment)"}
              </button>
            </form>
          </div>
        )}

        {/* Detail Modal */}
        {/* Pricing Tab */}
        {activeTab === "pricing" && (
          <div className="space-y-6">
            {/* Pricing Sub-tabs */}
            <div className="flex gap-2 border-b border-border">
              {(["services", "cakes", "decorations"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPricingTab(tab)}
                  className={`pb-3 px-4 font-medium transition-colors text-sm ${pricingTab === tab
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Services */}
            {pricingTab === "services" && (
              <div className="space-y-4">
                <div className="border border-border rounded-lg p-6 space-y-3">
                  <h3 className="font-semibold text-lg">Add New Service</h3>
                  <input
                    type="text"
                    placeholder="Service name (e.g. Couple Dining)"
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded text-foreground bg-background"
                  />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <input
                      type="number"
                      placeholder="1 Hour Price"
                      value={newService.oneHour}
                      onChange={(e) => setNewService({ ...newService, oneHour: Number(e.target.value) })}
                      className="px-3 py-2 border border-border rounded text-foreground bg-background"
                    />
                    <input
                      type="number"
                      placeholder="2 Hour Price"
                      value={newService.twoHours}
                      onChange={(e) => setNewService({ ...newService, twoHours: Number(e.target.value) })}
                      className="px-3 py-2 border border-border rounded text-foreground bg-background"
                    />
                    <input
                      type="number"
                      placeholder="3 Hour Price"
                      value={newService.threeHours}
                      onChange={(e) => setNewService({ ...newService, threeHours: Number(e.target.value) })}
                      className="px-3 py-2 border border-border rounded text-foreground bg-background"
                    />
                    <input
                      type="number"
                      placeholder="4 Hour Price"
                      value={newService.fourHours}
                      onChange={(e) => setNewService({ ...newService, fourHours: Number(e.target.value) })}
                      className="px-3 py-2 border border-border rounded text-foreground bg-background"
                    />
                  </div>
                  <button onClick={handleCreateService} className="px-4 py-2 bg-primary text-primary-foreground rounded">
                    Add Service
                  </button>
                </div>
                {Object.entries(pricing).map(([service, durations]) => (
                  <div key={service} className="border border-border rounded-lg p-6">
                    <h3 className="font-semibold text-lg mb-4 capitalize">{service.replace("-", " ")}</h3>
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((duration) => {
                        const price = (durations as any)[duration] || (durations as any)[String(duration)] || 0;
                        const isEditing = editingId === `${service}-${duration}`;
                        return (
                          <div key={`${service}-${duration}`} className="flex items-center justify-between bg-muted p-3 rounded-lg">
                            <span className="font-medium text-xs">{duration} Hour{duration !== 1 ? "s" : ""}</span>
                            {isEditing ? (
                              <div className="flex flex-col flex-1 gap-2 ml-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] font-bold text-muted-foreground block">Original</label>
                                    <input
                                      type="number"
                                      value={editValues.price || ""}
                                      onChange={(e) => setEditValues({ ...editValues, price: Number(e.target.value) })}
                                      className="w-full px-2 py-1 text-xs border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-green-600 block">Offer</label>
                                    <input
                                      type="number"
                                      placeholder="0"
                                      value={editValues.offerPrice ?? ""}
                                      onChange={(e) => setEditValues({ ...editValues, offerPrice: e.target.value ? Number(e.target.value) : undefined })}
                                      className="w-full px-2 py-1 text-xs border border-green-200 rounded bg-background text-green-600 focus:outline-none focus:ring-1 focus:ring-green-500"
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-1 justify-end">
                                  <button
                                    onClick={handleSaveService}
                                    className="px-3 py-1 bg-primary text-primary-foreground rounded text-[10px] font-bold"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="px-3 py-1 border border-border rounded text-[10px]"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                {typeof price === 'object' && price.offerPrice ? (
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-green-600">₹{price.offerPrice}</span>
                                    <span className="text-[10px] line-through text-muted-foreground">₹{price.price}</span>
                                  </div>
                                ) : (
                                  <span className="font-bold text-primary">₹{typeof price === 'object' ? price.price : price}</span>
                                )}
                                <button
                                  onClick={() => handleEditService(service, Number(duration), price)}
                                  className="px-2 py-1 border border-border rounded text-[10px] hover:border-primary transition-colors"
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cakes */}
            {pricingTab === "cakes" && (
              <div className="space-y-4">
                <div className="border border-border rounded-lg p-6 space-y-3">
                  <h3 className="font-semibold text-lg">Add New Cake</h3>
                  <input
                    type="text"
                    placeholder="Cake name"
                    value={newCake.name}
                    onChange={(e) => setNewCake({ ...newCake, name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded text-foreground bg-background"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={newCake.description}
                    onChange={(e) => setNewCake({ ...newCake, description: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded text-foreground bg-background"
                  />
                  <div className="space-y-2 border-t border-border pt-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Price Variants</label>
                      <button 
                        onClick={() => setNewCake({ ...newCake, variants: [...newCake.variants, { quantity: "", price: 0 }] })}
                        className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full font-bold hover:bg-primary/20 transition-colors"
                      >
                        + Add Variant
                      </button>
                    </div>
                    {newCake.variants.map((v, idx) => (
                      <div key={idx} className="grid grid-cols-3 gap-2 items-end bg-muted/30 p-2 rounded-lg border border-border/50">
                        <div>
                          <label className="text-[9px] font-bold text-muted-foreground block mb-1">Quantity</label>
                          <input
                            type="text"
                            placeholder="1kg"
                            value={v.quantity}
                            onChange={(e) => {
                              const newVariants = [...newCake.variants];
                              newVariants[idx].quantity = e.target.value;
                              setNewCake({ ...newCake, variants: newVariants });
                            }}
                            className="w-full px-2 py-1 text-xs border border-border rounded bg-background"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-muted-foreground block mb-1">Price (₹)</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={v.price}
                            onChange={(e) => {
                              const newVariants = [...newCake.variants];
                              newVariants[idx].price = Number(e.target.value);
                              setNewCake({ ...newCake, variants: newVariants });
                            }}
                            className="w-full px-2 py-1 text-xs border border-border rounded bg-background"
                          />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-[9px] font-bold text-green-600 block mb-1">Offer (₹)</label>
                            <input
                              type="number"
                              placeholder="Opt"
                              value={v.offerPrice || ""}
                              onChange={(e) => {
                                const newVariants = [...newCake.variants];
                                newVariants[idx].offerPrice = e.target.value ? Number(e.target.value) : undefined;
                                setNewCake({ ...newCake, variants: newVariants });
                              }}
                              className="w-full px-2 py-1 text-xs border border-green-200 rounded bg-background text-green-600"
                            />
                          </div>
                          {newCake.variants.length > 1 && (
                            <button 
                              onClick={() => {
                                const newVariants = newCake.variants.filter((_, i) => i !== idx);
                                setNewCake({ ...newCake, variants: newVariants });
                              }}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const image = await readFileAsDataUrl(e.target.files?.[0]);
                      setNewCake({ ...newCake, image });
                    }}
                    className="w-full text-xs text-muted-foreground"
                  />
                  <button onClick={handleCreateCake} className="px-4 py-2 bg-primary text-primary-foreground rounded">
                    Add Cake
                  </button>
                </div>
                {cakes.map((cake) => {
                  const isEditing = editingId === cake.id;
                  return (
                    <div key={cake.id} className="border border-border rounded-xl p-4 bg-card relative overflow-hidden group hover:border-primary/50 transition-all">
                      {cake.offerPrice && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-green-500 text-white text-[9px] font-bold rounded-full uppercase z-10">Offer</div>
                      )}
                      {isEditing ? (
                        <div className="space-y-4">
                          <input
                            type="text"
                            placeholder="Cake name"
                            value={editValues.name || ""}
                            onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
                          />
                          <div className="space-y-2 border-t border-border pt-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-muted-foreground uppercase">Price Variants</label>
                              <button 
                                onClick={() => setEditValues({ ...editValues, variants: [...(editValues.variants || []), { quantity: "", price: 0 }] })}
                                className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full font-bold hover:bg-primary/20 transition-colors"
                              >
                                + Add Variant
                              </button>
                            </div>
                            {(editValues.variants || [{ quantity: editValues.quantity, price: editValues.price, offerPrice: editValues.offerPrice }]).map((v: any, idx: number) => (
                              <div key={idx} className="grid grid-cols-3 gap-2 items-end bg-muted/30 p-2 rounded-lg border border-border/50">
                                <div>
                                  <label className="text-[9px] font-bold text-muted-foreground block mb-1">Quantity</label>
                                  <input
                                    type="text"
                                    placeholder="1kg"
                                    value={v.quantity}
                                    onChange={(e) => {
                                      const newVariants = [...(editValues.variants || [{ quantity: editValues.quantity, price: editValues.price, offerPrice: editValues.offerPrice }])];
                                      newVariants[idx].quantity = e.target.value;
                                      setEditValues({ ...editValues, variants: newVariants });
                                    }}
                                    className="w-full px-2 py-1 text-xs border border-border rounded bg-background"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-muted-foreground block mb-1">Price (₹)</label>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={v.price}
                                    onChange={(e) => {
                                      const newVariants = [...(editValues.variants || [{ quantity: editValues.quantity, price: editValues.price, offerPrice: editValues.offerPrice }])];
                                      newVariants[idx].price = Number(e.target.value);
                                      setEditValues({ ...editValues, variants: newVariants });
                                    }}
                                    className="w-full px-2 py-1 text-xs border border-border rounded bg-background"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <div className="flex-1">
                                    <label className="text-[9px] font-bold text-green-600 block mb-1">Offer (₹)</label>
                                    <input
                                      type="number"
                                      placeholder="Opt"
                                      value={v.offerPrice || ""}
                                      onChange={(e) => {
                                        const newVariants = [...(editValues.variants || [{ quantity: editValues.quantity, price: editValues.price, offerPrice: editValues.offerPrice }])];
                                        newVariants[idx].offerPrice = e.target.value ? Number(e.target.value) : undefined;
                                        setEditValues({ ...editValues, variants: newVariants });
                                      }}
                                      className="w-full px-2 py-1 text-xs border border-green-200 rounded bg-background text-green-600"
                                    />
                                  </div>
                                  {(editValues.variants?.length > 1) && (
                                    <button 
                                      onClick={() => {
                                        const newVariants = editValues.variants.filter((_: any, i: number) => i !== idx);
                                        setEditValues({ ...editValues, variants: newVariants });
                                      }}
                                      className="text-red-500 hover:text-red-700 p-1"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleGalleryImageUpload("cake", cake.id, e.target.files?.[0])}
                            className="w-full text-xs text-muted-foreground"
                          />
                          {uploadingImageId === `cake-${cake.id}` && (
                            <p className="text-xs text-primary">Uploading image...</p>
                          )}
                          <div className="flex gap-2 justify-end">
                             <button onClick={() => setEditingId(null)} className="px-3 py-1.5 border border-border rounded-lg text-xs">Cancel</button>
                             <button onClick={handleSaveCake} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold">Save Changes</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            {cake.image && <img src={cake.image} alt={cake.name} className="w-12 h-12 rounded-lg object-cover border border-border" />}
                            <div>
                              <h4 className="font-bold text-foreground text-sm">{cake.name}</h4>
                              <p className="text-xs text-muted-foreground line-clamp-1">{cake.description}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {(cake.variants || [{ quantity: cake.quantity || '1kg', price: cake.price, offerPrice: cake.offerPrice }]).map((v: any, i: number) => (
                                  <div key={i} className="bg-muted px-2 py-1 rounded border border-border text-[10px]">
                                    <span className="font-bold text-foreground">{v.quantity}: </span>
                                    {v.offerPrice ? (
                                      <span className="text-green-600 font-bold">₹{v.offerPrice} <span className="text-muted-foreground/50 line-through font-normal">₹{v.price}</span></span>
                                    ) : (
                                      <span className="text-primary font-bold">₹{v.price}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditCake(cake)} className="p-2 text-muted-foreground hover:text-primary"><Edit className="h-4 w-4" /></button>
                            <button onClick={() => handleDeleteCake(cake.id || "")} className="p-2 text-muted-foreground hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Decorations */}
            {pricingTab === "decorations" && (
              <div className="space-y-4">
                <div className="border border-border rounded-lg p-6 space-y-3">
                  <h3 className="font-semibold text-lg">Add New Decoration</h3>
                  <input
                    type="text"
                    placeholder="Decoration name"
                    value={newDecoration.name}
                    onChange={(e) => setNewDecoration({ ...newDecoration, name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded text-foreground bg-background"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={newDecoration.description}
                    onChange={(e) => setNewDecoration({ ...newDecoration, description: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded text-foreground bg-background"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={newDecoration.price}
                    onChange={(e) => setNewDecoration({ ...newDecoration, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-border rounded text-foreground bg-background"
                  />
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={async (e) => {
                      const media = await readDecorationMediaFile(e.target.files?.[0]);
                      setNewDecoration({ ...newDecoration, ...media });
                    }}
                    className="w-full text-xs text-muted-foreground"
                  />
                  <button onClick={handleCreateDecoration} className="px-4 py-2 bg-primary text-primary-foreground rounded">
                    Add Decoration
                  </button>
                </div>
                <div className="border border-border rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-lg mb-4">Base Decoration Price</h3>
                  {editingId === "decoration-price" ? (
                    <div className="flex gap-2">
                      <span>₹</span>
                      <input
                        type="number"
                        value={decorationPrice}
                        onChange={(e) => setDecorationPrice(Number(e.target.value))}
                        className="flex-1 px-3 py-2 border border-border rounded bg-background text-foreground caret-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button onClick={handleSaveDecorationPrice} className="px-4 py-2 bg-primary text-primary-foreground rounded">
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="px-4 py-2 border border-border rounded">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-primary text-lg">₹{decorationPrice}</span>
                      <button
                        onClick={() => setEditingId("decoration-price")}
                        className="px-3 py-1 border border-border rounded text-sm"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>

                {decorations.map((decoration) => {
                  const isEditing = editingId === decoration.id;
                  return (
                    <div key={decoration.id} className="border border-border rounded-xl p-4 bg-card relative overflow-hidden group hover:border-primary/50 transition-all">
                      {decoration.offerPrice && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-green-500 text-white text-[9px] font-bold rounded-full uppercase z-10">Offer</div>
                      )}
                      {isEditing ? (
                        <div className="space-y-4">
                          <input
                            type="text"
                            placeholder="Decoration name"
                            value={editValues.name || ""}
                            onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
                          />
                          <div className="grid grid-cols-2 gap-3">
                             <div>
                                <label className="text-[10px] font-bold text-muted-foreground block mb-1">Price</label>
                                <input
                                  type="number"
                                  value={editValues.price || ""}
                                  onChange={(e) => setEditValues({ ...editValues, price: Number(e.target.value) })}
                                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
                                />
                             </div>
                             <div>
                                <label className="text-[10px] font-bold text-green-600 block mb-1">Offer Price</label>
                                <input
                                  type="number"
                                  placeholder="Optional"
                                  value={editValues.offerPrice || ""}
                                  onChange={(e) => setEditValues({ ...editValues, offerPrice: Number(e.target.value) })}
                                  className="w-full px-3 py-2 border-2 border-green-500/30 rounded-lg text-sm bg-background text-green-600 font-bold"
                                />
                             </div>
                          </div>
                          <input
                            type="file"
                            accept="image/*,video/*"
                            onChange={async (e) => {
                              const media = await readDecorationMediaFile(e.target.files?.[0]);
                              setEditValues({ ...editValues, ...media });
                            }}
                            className="w-full text-xs text-muted-foreground"
                          />
                          <div className="flex gap-2 justify-end">
                             <button onClick={() => setEditingId(null)} className="px-3 py-1.5 border border-border rounded-lg text-xs">Cancel</button>
                             <button onClick={handleSaveDecoration} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold">Save Changes</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            {decoration.video ? (
                              <video src={decoration.video} muted playsInline className="w-12 h-12 rounded-lg object-cover border border-border bg-black" />
                            ) : decoration.image ? (
                              <img src={decoration.image} alt={decoration.name} className="w-12 h-12 rounded-lg object-cover border border-border" />
                            ) : null}
                            <div>
                              <h4 className="font-bold text-foreground text-sm">{decoration.name}</h4>
                              <p className="text-xs text-muted-foreground line-clamp-1">{decoration.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {decoration.offerPrice ? (
                                  <>
                                     <span className="font-bold text-green-600">₹{decoration.offerPrice}</span>
                                     <span className="text-[10px] line-through text-muted-foreground/60">₹{decoration.price}</span>
                                  </>
                                ) : (
                                  <span className="font-bold text-primary">₹{decoration.price}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditDecoration(decoration)} className="p-2 text-muted-foreground hover:text-primary"><Edit className="h-4 w-4" /></button>
                            <button onClick={() => handleDeleteDecoration(decoration.id || "")} className="p-2 text-muted-foreground hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* Gallery Tab */}
        {activeTab === "gallery" && (
          <div className="space-y-8">

            {/* Hero Carousel */}
            <div className="max-w-2xl rounded-2xl border border-border bg-card p-8 space-y-4">
              <h2 className="font-display text-2xl font-bold text-foreground">Hero Carousel</h2>
              <p className="text-sm text-muted-foreground font-body">Upload image banners for the home page carousel.</p>
              <input type="file" accept="image/*" onChange={(e) => handleHeroUpload(e.target.files?.[0])} className="w-full text-xs text-muted-foreground" />
              {uploadingHero && <p className="text-xs text-primary">Uploading hero image...</p>}
              <div className="grid gap-3 md:grid-cols-3">
                {heroImages.map((img, idx) => (
                  <div key={idx} className="relative aspect-video rounded-xl border border-border overflow-hidden group bg-black">
                    <img src={img} alt={`Hero ${idx}`} className="w-full h-full object-contain" />
                    <button onClick={() => handleDeleteHero(idx)} className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                    <div className="absolute bottom-1 left-2 bg-black/50 text-[10px] text-white px-1 rounded">#{idx + 1}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gallery Images (Testimonials) */}
            <div className="max-w-4xl rounded-2xl border border-border bg-card p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground">Gallery Images</h2>
                  <p className="text-sm text-muted-foreground font-body mt-1">These images appear on the public Gallery page.</p>
                </div>
                <span className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full">{testimonials.length} images</span>
              </div>

              {/* Upload new */}
              <div className="rounded-xl border border-dashed border-border p-4 space-y-3 bg-muted/20">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add New Image</p>
                <input
                  type="text"
                  placeholder="Title (e.g. Birthday Celebration)"
                  value={newTestimonialTitle}
                  onChange={(e) => setNewTestimonialTitle(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground font-body focus:border-primary focus:outline-none"
                />
                <input type="file" accept="image/*" onChange={(e) => handleUploadTestimonial(e.target.files?.[0])} className="w-full text-xs text-muted-foreground" />
                {uploadingTestimonial && <p className="text-xs text-primary animate-pulse">Uploading image...</p>}
              </div>

              {/* Existing images grid */}
              {testimonials.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body text-center py-4">No gallery images yet.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {testimonials.map((item) => (
                    <div key={item.id} className="rounded-xl border border-border bg-muted/20 overflow-hidden group">
                      <div className="relative aspect-square bg-black">
                        <img src={item.image} alt={item.title || "Gallery"} className="w-full h-full object-cover" />
                        {/* Replace image overlay */}
                        <label className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/50 transition-all cursor-pointer opacity-0 group-hover:opacity-100">
                          <div className="text-center text-white">
                            <Edit className="h-5 w-5 mx-auto mb-1" />
                            <span className="text-xs font-semibold">Replace Image</span>
                          </div>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleReplaceTestimonialImage(item.id, e.target.files[0])} />
                        </label>
                      </div>
                      <div className="p-3 space-y-2">
                        {editingTestimonialId === item.id ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editingTestimonialTitle}
                              onChange={(e) => setEditingTestimonialTitle(e.target.value)}
                              className="flex-1 rounded-lg border border-primary bg-background px-2 py-1 text-xs text-foreground focus:outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleUpdateTestimonial(item.id, editingTestimonialTitle);
                                if (e.key === "Escape") setEditingTestimonialId(null);
                              }}
                            />
                            <button onClick={() => handleUpdateTestimonial(item.id, editingTestimonialTitle)} className="px-2 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-bold">Save</button>
                            <button onClick={() => setEditingTestimonialId(null)} className="px-2 py-1 border border-border rounded-lg text-xs">✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-foreground truncate flex-1">{item.title || "Customer Memory"}</p>
                            <button
                              onClick={() => { setEditingTestimonialId(item.id); setEditingTestimonialTitle(item.title || ""); }}
                              className="p-1 text-muted-foreground hover:text-primary transition-colors shrink-0"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        <button onClick={() => handleDeleteTestimonial(item.id)} className="w-full px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-xs hover:bg-red-50 transition-colors">
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Videos Tab */}
        {activeTab === "videos" && (
          <div className="space-y-8">
            {/* Upload Section */}
            <div className="max-w-2xl rounded-2xl border border-border bg-card p-8 space-y-4">
              <h2 className="font-display text-2xl font-bold text-foreground">Branch Videos — Home Page</h2>
              <p className="text-sm text-muted-foreground font-body">
                Upload videos here to display them on the <strong className="text-foreground">home page</strong> between the hero banner and services section. Use the <strong className="text-foreground">Gallery tab</strong> for videos shown on the Gallery page.
              </p>
              <input
                type="text"
                placeholder="Optional title (e.g. Eluru Branch Tour)"
                value={newVideoTitle}
                onChange={(e) => setNewVideoTitle(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground font-body focus:border-primary focus:outline-none"
              />
              <input
                type="file"
                accept="video/*"
                onChange={(e) => handleUploadVideo(e.target.files?.[0])}
                className="w-full text-xs text-muted-foreground"
              />
              {uploadingVideo && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-primary font-body">
                    <span className="animate-pulse">Uploading to Cloudinary...</span>
                    <span className="font-semibold">{videoUploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-gold rounded-full transition-all duration-300"
                      style={{ width: `${videoUploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
              {branchVideos.length === 0 && !uploadingVideo && (
                <p className="text-xs text-muted-foreground font-body">No videos uploaded yet for this branch.</p>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {branchVideos.map((vid) => (
                  <div key={vid.id} className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                    <video
                      src={vid.url}
                      controls
                      className="w-full rounded-lg aspect-[4/5] bg-black object-cover"
                    />
                    {editingVideoId === vid.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingVideoTitle}
                          onChange={(e) => setEditingVideoTitle(e.target.value)}
                          placeholder="Video title"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground font-body focus:border-primary focus:outline-none"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleUpdateVideo(vid.id)}
                            className="inline-flex items-center gap-1 rounded border border-green-300 px-3 py-1 text-sm text-green-700 transition-colors hover:bg-green-50"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Save
                          </button>
                          <button
                            onClick={cancelEditingVideo}
                            className="inline-flex items-center gap-1 rounded border border-border px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 text-sm font-medium text-foreground truncate">{vid.title || "Branch Video"}</p>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={() => startEditingVideo(vid)}
                            aria-label="Edit video title"
                            className="inline-flex h-8 w-8 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteVideo(vid.id)}
                            aria-label="Delete video"
                            className="inline-flex h-8 w-8 items-center justify-center rounded border border-red-300 text-red-600 transition-colors hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Preview Section — switch between branches */}
            <div className="max-w-2xl rounded-2xl border border-border bg-card p-8 space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">Preview — Home Page Video Cards</h2>
              <p className="text-sm text-muted-foreground font-body">
                Switch between branches to preview how their videos will appear on the home page.
              </p>
              <div className="flex items-center gap-4">
                <span className={`text-sm font-medium font-body ${previewBranch === "branch-1" ? "text-primary" : "text-muted-foreground"}`}>
                  Branch 1
                </span>
                <button
                  role="switch"
                  aria-checked={previewBranch === "branch-2"}
                  onClick={() => setPreviewBranch(prev => prev === "branch-1" ? "branch-2" : "branch-1")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    previewBranch === "branch-2" ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      previewBranch === "branch-2" ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium font-body ${previewBranch === "branch-2" ? "text-primary" : "text-muted-foreground"}`}>
                  Branch 2
                </span>
              </div>
              <BranchVideoPreview branch={previewBranch} />
            </div>
          </div>
        )}

        {/* Delete History Security Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-background shadow-2xl animate-in fade-in zoom-in duration-300">
              <div className="relative p-8">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteCode("");
                  }}
                  className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-all hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="mb-6 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <Trash2 className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground font-display">Confirm Deletion</h2>
                  <p className="mt-2 text-muted-foreground font-body">
                    You are about to delete <span className="font-bold text-red-600">{selectedIds.length}</span> selected bookings. This action cannot be undone.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground font-body">
                      Enter Security Code
                    </label>
                    <input
                      type="password"
                      value={deleteCode}
                      onChange={(e) => setDeleteCode(e.target.value)}
                      placeholder="Enter code to confirm"
                      className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-body"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setShowDeleteModal(false);
                        setDeleteCode("");
                      }}
                      className="flex-1 rounded-xl border border-border px-4 py-3 font-semibold text-foreground transition-all hover:bg-muted font-body"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDeleteSelected}
                      disabled={deletingMultiple}
                      className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50 shadow-lg shadow-red-600/20 font-body"
                    >
                      {deletingMultiple ? "Deleting..." : "Delete Permanently"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="max-w-2xl space-y-6">

            {/* Bookings Toggle Card */}
            <div className={`rounded-2xl border-2 p-6 transition-all ${bookingsEnabled ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    Bookings — {bookingsEnabled ? "🟢 Open" : "🔴 Paused"}
                  </h3>
                  <p className="text-sm text-muted-foreground font-body mt-1">
                    {bookingsEnabled
                      ? "Customers can currently book this branch. Toggle off to stop new bookings."
                      : "New bookings are paused. Customers will see a 'temporarily unavailable' message."}
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={bookingsEnabled}
                  disabled={togglingBookings}
                  onClick={() => handleToggleBookings(!bookingsEnabled)}
                  className={`relative shrink-0 inline-flex h-8 w-16 items-center rounded-full border-2 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-60 ${
                    bookingsEnabled
                      ? "border-green-500 bg-green-500 focus:ring-green-500"
                      : "border-red-400/60 bg-red-400/20 focus:ring-red-400"
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                      bookingsEnabled ? "translate-x-8" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              {togglingBookings && (
                <p className="mt-3 text-xs text-muted-foreground font-body animate-pulse">Saving...</p>
              )}
            </div>

            {/* Branch Details Card */}
            <div className="rounded-2xl border border-border bg-card p-8 space-y-6">
              <h2 className="font-display text-2xl font-bold text-foreground">
                Settings for {branchList.find((b) => b.id === selectedBranch)?.name || "Branch"}
              </h2>
              <p className="text-sm text-muted-foreground font-body">
                Update the contact information, address, and social handles for this specific location.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Branch Name</label>
                  <input
                    type="text"
                    value={branchEditData.name}
                    onChange={(e) => setBranchEditData({ ...branchEditData, name: e.target.value })}
                    className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground font-body focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={branchEditData.phone}
                    onChange={(e) => setBranchEditData({ ...branchEditData, phone: e.target.value })}
                    className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground font-body focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Physical Address</label>
                  <textarea
                    value={branchEditData.address}
                    onChange={(e) => setBranchEditData({ ...branchEditData, address: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground font-body focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Google Maps Link</label>
                  <input
                    type="text"
                    value={branchEditData.mapLink}
                    onChange={(e) => setBranchEditData({ ...branchEditData, mapLink: e.target.value })}
                    className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground font-body focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="pt-4 border-t border-border mt-4">
                  <h3 className="text-sm font-bold text-foreground mb-4 font-display">Social Media Links</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Instagram URL</label>
                      <input
                        type="text"
                        value={socialEditData.instagram}
                        onChange={(e) => setSocialEditData({ ...socialEditData, instagram: e.target.value })}
                        placeholder="https://instagram.com/your-profile"
                        className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground font-body focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Facebook URL</label>
                      <input
                        type="text"
                        value={socialEditData.facebook}
                        onChange={(e) => setSocialEditData({ ...socialEditData, facebook: e.target.value })}
                        placeholder="https://facebook.com/your-page"
                        className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground font-body focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">WhatsApp Number (Optional)</label>
                      <input
                        type="text"
                        value={socialEditData.whatsapp}
                        onChange={(e) => setSocialEditData({ ...socialEditData, whatsapp: e.target.value })}
                        placeholder="99127XXXXX (Leave empty for branch phone)"
                        className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground font-body focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveBranchDetails}
                disabled={savingBranch}
                className="w-full rounded-xl bg-gradient-gold py-4 text-sm font-bold text-primary-foreground transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                {savingBranch ? "Saving Changes..." : "Update Branch Details"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
