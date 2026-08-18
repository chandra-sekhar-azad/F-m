import React, { lazy, Suspense, useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  MapPin, Clock, PartyPopper, Cake, Sparkles, Check,
  CreditCard, ArrowLeft, ArrowRight, Film, User, Calendar, RefreshCw, Volume2, VolumeX
} from "lucide-react";
import { api, API_BASE, Branch, CakeOption, ExtraDecoration } from "../lib/api";
import { BookingData, INITIAL_BOOKING, DECORATION_PRICE } from "../lib/booking-data";
import { getEffectivePrice, getOriginalPrice, hasOffer } from "../lib/utils";

const formatServiceName = (serviceId: string) => {
  if (serviceId === "private-theatre-party-hall") return "Standard Pack";
  if (serviceId === "premium-pack") return "Premium Pack ";
  return serviceId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const parse12HourTime = (timeString: string) => {
  const match = timeString.trim().match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();
  if (hours === 12) hours = 0;
  if (period === "PM") hours += 12;
  return hours * 60 + minutes;
};

const to12HourTime = (minutes: number) => {
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const period = normalized >= 12 * 60 ? "PM" : "AM";
  const hour24 = Math.floor(normalized / 60);
  const hour12 = hour24 % 12 || 12;
  const mins = normalized % 60;
  return `${hour12}:${String(mins).padStart(2, "0")} ${period}`;
};

const formatSlotRange = (startTime: string, durationHours: number) => {
  const startMinutes = parse12HourTime(startTime);
  if (startMinutes === null) return startTime;
  const endMinutes = startMinutes + durationHours * 60;
  return `${startTime} - ${to12HourTime(endMinutes)}`;
};

const ALL_STEPS = [
  "Select Branch & Service",
  "Date, Time & Details",
  "Occasion",
  "Cake Selection",
  "Extra Decorations",
  "Summary",
  "Payment",
];

const STEP_ICONS = [MapPin, Clock, PartyPopper, Cake, Sparkles, Check, CreditCard];
const OccasionStep = lazy(() => import("./booking/OccasionStep"));
const CakeStep = lazy(() => import("./booking/CakeStep"));
const DecorationsStep = lazy(() => import("./booking/DecorationsStep"));

const BookingPage = () => {
  const [step, setStep] = useState(0);
  const [booking, setBooking] = useState<BookingData>({ ...INITIAL_BOOKING });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [occasions, setOccasions] = useState<string[]>([]);
  const [cakes, setCakes] = useState<CakeOption[]>([]);
  const [decorations, setDecorations] = useState<ExtraDecoration[]>([]);
  const [pricing, setPricing] = useState<Record<string, Record<any, any>>>({});
  const [decorationPrice, setDecorationPrice] = useState(0);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [halls, setHalls] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  // Per-step lazy loading states
  const [occasionsLoaded, setOccasionsLoaded] = useState(false);
  const [cakesLoaded, setCakesLoaded] = useState(false);
  const [decorationsLoaded, setDecorationsLoaded] = useState(false);
  const [stepLoading, setStepLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [lastFetchedBranch, setLastFetchedBranch] = useState<string>("");
  const [decorationMuted, setDecorationMuted] = useState<Record<string, boolean>>({});

  // Load booking state from localStorage on mount
  useEffect(() => {
    const savedBooking = localStorage.getItem('bookingState');
    const savedStep = localStorage.getItem('bookingStep');

    if (savedBooking) {
      try {
        const parsedBooking = JSON.parse(savedBooking);
        setBooking(parsedBooking);
      } catch (error) {
        console.error('Failed to restore booking state:', error);
      }
    }

    if (savedStep) {
      try {
        const parsedStep = parseInt(savedStep, 10);
        setStep(parsedStep);
      } catch (error) {
        console.error('Failed to restore booking step:', error);
      }
    }
  }, []);

  // Save booking state to localStorage — debounced to avoid writing on every keystroke
  const saveBookingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveBookingTimer.current) clearTimeout(saveBookingTimer.current);
    saveBookingTimer.current = setTimeout(() => {
      localStorage.setItem('bookingState', JSON.stringify(booking));
    }, 500);
    return () => {
      if (saveBookingTimer.current) clearTimeout(saveBookingTimer.current);
    };
  }, [booking]);

  const saveStepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveStepTimer.current) clearTimeout(saveStepTimer.current);
    saveStepTimer.current = setTimeout(() => {
      localStorage.setItem('bookingStep', String(step));
    }, 300);
    return () => {
      if (saveStepTimer.current) clearTimeout(saveStepTimer.current);
    };
  }, [step]);

  // Function to reload pricing data (for real-time updates)
  const reloadPricingData = async () => {
    try {
      const branch = booking.branch || "branch-1";
      const data = await api.getStepBranchService(branch);
      setPricing(data.pricing);
      setDecorationPrice(data.decorationPrice);
    } catch (error) {
      console.error("Failed to refresh pricing data:", error);
    }
  };

  // Set up periodic refresh of pricing data (every 5 minutes) for real-time updates
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      reloadPricingData();
    }, 5 * 60 * 1000); // Refresh every 5 minutes (was 30s)

    return () => clearInterval(refreshInterval);
  }, [booking.branch]);

  // Step 0 init: branches + pricing only — fastest possible load
  useEffect(() => {
    const initBooking = async () => {
      try {
        const initialBranch = booking.branch || "branch-1";
        const data = await api.getStepBranchService(initialBranch);

        setBranches(data.branches);
        setPricing(data.pricing);
        setDecorationPrice(data.decorationPrice);
        setHalls(data.halls || []);
        setLastFetchedBranch(initialBranch);

        const services = Object.keys(data.pricing);
        if (services.length === 1 && !booking.service) {
          setBooking(prev => ({ ...prev, service: services[0] as any, branch: initialBranch }));
        }
      } catch (error) {
        console.error("Failed to initialize booking data:", error);
      } finally {
        setLoading(false);
      }
    };
    initBooking();
  }, []);

  // Branch change: reload pricing + reset already-loaded step data
  useEffect(() => {
    if (!loading && booking.branch && booking.branch !== lastFetchedBranch) {
      const loadBranchData = async () => {
        try {
          const data = await api.getStepBranchService(booking.branch);
          setPricing(data.pricing);
          setDecorationPrice(data.decorationPrice);
          setHalls(data.halls || []);
          setLastFetchedBranch(booking.branch);

          // Invalidate step caches so they reload for the new branch
          setCakesLoaded(false);
          setDecorationsLoaded(false);
          setOccasionsLoaded(false);

          const services = Object.keys(data.pricing);
          const isBhimavaram = booking.branch === "branch-2" ||
            data.branches.find(b => b.id === booking.branch)?.name.toLowerCase().includes("bhimavaram");

          if (services.length === 1) {
            setBooking(prev => ({
              ...prev,
              hall: '',  // reset hall on branch change
              service: services[0] as any,
              membersCount: (isBhimavaram && prev.membersCount > 10) ? 10 : prev.membersCount,
            }));
          } else if (isBhimavaram) {
            setBooking(prev => ({ ...prev, hall: '', ...(prev.membersCount > 10 ? { membersCount: 10 } : {}) }));
          } else {
            setBooking(prev => ({ ...prev, hall: '' }));
          }
        } catch (error) {
          console.error("Failed to update branch data:", error);
        }
      };
      loadBranchData();
    }
  }, [booking.branch, loading, lastFetchedBranch]);

  useEffect(() => {
    if (booking.branch && booking.date && booking.service && booking.duration) {
      const loadSlots = async () => {
        try {
          const { availableSlots, bookedSlots } = await api.getAvailableSlots(booking.branch, booking.date, booking.service, booking.duration, false, booking.hall || undefined);
          setAvailableSlots(availableSlots);
          setBookedSlots(bookedSlots);
        } catch (error) {
          console.error("Failed to load available slots:", error);
        }
      };
      loadSlots();
    }
  }, [booking.branch, booking.date, booking.service, booking.duration, booking.hall]);

  // Step 2: occasions — tiny payload, cached after first load
  useEffect(() => {
    if (step === 2 && !occasionsLoaded) {
      const loadOccasions = async () => {
        setStepLoading(true);
        try {
          const data = await api.getStepOccasions();
          setOccasions(data.occasions);
          setOccasionsLoaded(true);
        } catch (error) {
          console.error("Failed to load occasions:", error);
        } finally {
          setStepLoading(false);
        }
      };
      loadOccasions();
    }
  }, [step, occasionsLoaded]);

  // Step 3: cakes for selected branch only
  useEffect(() => {
    if (step === 3 && !cakesLoaded) {
      const loadCakes = async () => {
        setStepLoading(true);
        try {
          const branch = booking.branch || "branch-1";
          const data = await api.getStepCakes(branch);
          setCakes(data.cakes);
          setCakesLoaded(true);
        } catch (error) {
          console.error("Failed to load cakes:", error);
        } finally {
          setStepLoading(false);
        }
      };
      loadCakes();
    }
  }, [step, cakesLoaded]);

  // Step 4: decorations for selected branch only
  useEffect(() => {
    if (step === 4 && !decorationsLoaded) {
      const loadDecorations = async () => {
        setStepLoading(true);
        try {
          const branch = booking.branch || "branch-1";
          const data = await api.getStepDecorations(branch);
          setDecorations(data.decorations);
          setDecorationPrice(data.decorationPrice);
          setDecorationsLoaded(true);
        } catch (error) {
          console.error("Failed to load decorations:", error);
        } finally {
          setStepLoading(false);
        }
      };
      loadDecorations();
    }
  }, [step, decorationsLoaded]);

  const update = (partial: Partial<BookingData>) => setBooking((prev) => ({ ...prev, ...partial }));

  const SERVICE_CHARGE = 11;

  // Get visible steps based on service selection
  const isPremiumPack = booking.service === 'premium-pack';
  const STEPS = isPremiumPack 
    ? ["Select Branch & Service", "Date, Time & Details", "Occasion", "Summary", "Payment"]
    : ALL_STEPS;

  // Get correct icons based on selected service
  const getStepIcons = () => {
    if (isPremiumPack) {
      return [MapPin, Clock, PartyPopper, Check, CreditCard]; // 5 icons for premium pack
    }
    return STEP_ICONS; // 7 icons for standard pack
  };

  // Navigate to next step, skipping cake and extras for premium-pack
  const goToNextStep = () => {
    if (step === 2 && isPremiumPack) {
      setStep(5); // Skip to summary for premium-pack
    } else if (step === 4 && isPremiumPack) {
      setStep(6); // Skip extras for premium-pack
    } else {
      setStep(Math.min(6, step + 1));
    }
  };

  // Navigate to previous step, accounting for skipped steps
  const goToPrevStep = () => {
    if (step === 5 && isPremiumPack) {
      setStep(2); // Back to occasion from summary for premium-pack
    } else if (step === 3 && !isPremiumPack) {
      setStep(2); // Back to occasion from cake for standard-pack
    } else {
      setStep(Math.max(0, step - 1));
    }
  };

  const totalPrice = useMemo(() => {
    let total = 0;
    if (booking.service && booking.duration) {
      const servicePrice = pricing[booking.service]?.[booking.duration];
      if (servicePrice !== undefined) {
        if (typeof servicePrice === 'object' && servicePrice.price !== undefined) {
          const effectivePrice = (servicePrice.offerPrice != null) ? servicePrice.offerPrice : servicePrice.price;
          total += effectivePrice;
        } else {
          total += servicePrice;
        }
      }
    }
    if (booking.decorationRequired) total += decorationPrice;
    if (booking.selectedCake) total += getEffectivePrice(booking.selectedCake);
    booking.extraDecorations.forEach((d) => (total += getEffectivePrice(d)));

    // Extra person charge for Branch 1
    if (booking.branch === "branch-1" && booking.membersCount > 10) {
      total += (booking.membersCount - 10) * 150;
    }

    // Fixed platform service charge
    total += SERVICE_CHARGE;

    return total;
  }, [booking, pricing, decorationPrice]);

  const advanceAmount = useMemo(() => totalPrice < 3000 ? 1011 : 1511, [totalPrice]);
  const balanceAmount = useMemo(() => totalPrice - advanceAmount, [totalPrice, advanceAmount]);


  const canNext = (): boolean => {
    switch (step) {
      case 0: {
        if (!booking.branch || !booking.service) return false;
        const selectedBranch = branches.find(b => b.id === booking.branch);
        if (selectedBranch?.bookingsEnabled === false) return false;
        // require hall selection if this branch has multiple halls
        if (halls.length > 0 && !booking.hall) return false;
        return true;
      }
      case 1:
        const isBhimavaram = booking.branch === "branch-2" || branches.find(b => b.id === booking.branch)?.name.toLowerCase().includes("bhimavaram");
        const isCountOk = isBhimavaram ? booking.membersCount <= 10 : true;
        return !!booking.date && !!booking.duration && !!booking.timeSlot && !!booking.name && !!booking.phone && booking.membersCount > 0 && isCountOk;
      case 2: return !!booking.occasion;
      default: return true;
    }
  };

  const [paymentType] = useState<'advance'>('advance'); // advance only

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (document.getElementById('razorpay-script')) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.id = 'razorpay-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (paymentMethod: 'razorpay' | 'mock' = 'razorpay') => {
    try {
      setPaymentLoading(true);

      const extraCharge = (booking.branch === "branch-1" && booking.membersCount > 10) ? (booking.membersCount - 10) * 150 : 0;
      const amountToPay = advanceAmount; // always advance

      const bookingData = {
        ...booking,
        totalPrice,
        extraPersonsCharge: extraCharge,
        paymentStatus: "pending",
        paymentType,
        amountPaid: 0,
        balanceAmount: totalPrice, // Full balance until payment is confirmed
        phone: `+91 ${booking.phone}`
      };

      const createdBooking = await api.createBooking(bookingData);

      if (paymentMethod === 'mock') {
        const paymentResponse = await api.processMockPayment(
          createdBooking.id,
          amountToPay,
          paymentType
        );

        if (paymentResponse.success) {
          // Clear booking state from localStorage on successful completion
          localStorage.removeItem('bookingState');
          localStorage.removeItem('bookingStep');
          navigate("/booking-confirmed", { state: { booking: paymentResponse.booking } });
        }
      } else {
        // Load Razorpay script
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error("Failed to load Razorpay script");
        }

        const paymentResponse = await api.initiateRazorpayPayment(
          createdBooking.id,
          amountToPay,
          `91${booking.phone}`,
          paymentType,
          createdBooking // Pass complete booking details for Razorpay receipt
        );

        if (!paymentResponse.orderId) {
          throw new Error("Failed to create payment order");
        }

        // Open Razorpay checkout with UPI Intent Flow (not deprecated Collect Flow)
        const options: any = {
          key: paymentResponse.keyId,
          order_id: paymentResponse.orderId,
          amount: paymentResponse.amount,
          currency: paymentResponse.currency,
          name: "Friends&Memories",
          description: "Order Payment",
          image: "/logo.png",
          notes: {
            bookingId: createdBooking.id,
            paymentType: paymentType
          },
          // Use Intent flow (recommended) - not deprecated Collect flow
          // Razorpay will show all enabled payment methods on dashboard
          timeout: 600,
          handler: (response: any) => {
            console.log("✅ Payment successful via Razorpay!", response);

            // Immediately clear localStorage and prepare redirect
            localStorage.removeItem('bookingState');
            localStorage.removeItem('bookingStep');

            // Update booking payment status in background (non-blocking)
            Promise.resolve()
              .then(() => {
                console.log("📤 Sending payment confirmation to backend...");
                return api.processMockPayment(
                  createdBooking.id,
                  amountToPay,
                  paymentType
                );
              })
              .then(() => {
                console.log("✅ Backend payment processed");
              })
              .catch((processError) => {
                console.error("⚠️ Backend processing failed (non-blocking):", processError);
              });

            // Verify payment signature with backend (non-blocking)
            Promise.resolve()
              .then(() => {
                console.log("🔐 Verifying payment signature...");
                return fetch(`${API_BASE}/payments/razorpay/callback`, {
                  method: 'POST',
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    bookingId: createdBooking.id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    amountPaid: amountToPay,
                    paymentType: paymentType
                  })
                });
              })
              .then((verifyRes) => {
                if (!verifyRes.ok) {
                  console.warn("⚠️ Payment verification returned status:", verifyRes.status);
                } else {
                  console.log("✅ Payment verified successfully");
                }
              })
              .catch((verifyError) => {
                console.error("⚠️ Payment verification failed (non-blocking):", verifyError);
              });

            // IMMEDIATE redirect - do not wait for verification
            console.log("🚀 Initiating redirect to booking-confirmed...");
            setPaymentLoading(false);

            // Use setTimeout with 0ms to ensure React state update, then navigate
            setTimeout(() => {
              try {
                console.log("📍 Executing navigate...");
                const confirmedBooking = {
                  ...createdBooking,
                  paymentStatus: amountToPay >= totalPrice ? "paid" : "partially-paid",
                  paymentType,
                  amountPaid: amountToPay,
                  balanceAmount: Math.max(0, totalPrice - amountToPay),
                  paymentMode: "razorpay",
                };
                navigate({
                  pathname: "/booking-confirmed",
                  search: `?orderId=${response.razorpay_order_id}`,
                }, {
                  state: {
                    booking: confirmedBooking,
                    orderId: response.razorpay_order_id,
                    paymentId: response.razorpay_payment_id
                  },
                  replace: true
                });
              } catch (navError) {
                console.error("❌ Navigation failed:", navError);
                // Fallback: Use window.location if react-router fails
                window.location.href = "/booking-confirmed";
              }
            }, 0);
          },
          prefill: {
            name: booking.name,
            contact: booking.phone
          },
          theme: {
            color: "#F59E0B",
            backdrop_color: "rgba(0, 0, 0, 0.1)"
          },
          retry: {
            enabled: true,
            max_count: 3
          }
        };

        const razorpay = new (window as any).Razorpay(options);
        razorpay.on('payment.failed', (response: any) => {
          console.error("Payment failed:", response.error);
          alert(`Payment failed: ${response.error.description}`);
          setPaymentLoading(false);
        });
        razorpay.open();
      }
    } catch (error) {
      console.error("Payment failed:", error);
      alert(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setPaymentLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto max-w-3xl px-4">
        {loading ? (
          <div className="flex items-center justify-center min-h-screen">
            <p className="text-lg text-muted-foreground font-body">Loading booking data...</p>
          </div>
        ) : (
          <>
            {/* Anniversary Banner */}
            <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-gold p-[1px] glow-gold animate-pulse-slow">
              <div className="flex flex-col items-center justify-center gap-2 rounded-[calc(1rem-1px)] bg-card/90 px-4 py-3 text-center md:flex-row md:gap-6">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <span className="font-display text-sm font-bold text-foreground">2nd Anniversary offer on Bhimavaram Branch</span>
                </div>
                <p className="text-xs text-muted-foreground font-body">Discount On Premium Pack</p>
                <div className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary border border-primary/20">
                  Up to 20% OFF
                </div>
                <button
                  onClick={() => reloadPricingData()}
                  title="Refresh prices in real-time"
                  className="ml-auto md:ml-0 p-2 rounded-full hover:bg-primary/10 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 text-primary" />
                </button>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-10 flex items-center justify-between overflow-x-auto pb-2">
              {STEPS.map((s, i) => {
                const stepIcons = getStepIcons();
                const Icon = stepIcons[i];
                return (
                  <div key={s} className="flex flex-col items-center gap-1 min-w-[60px]">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm transition-all ${i < step
                          ? "border-primary bg-primary text-primary-foreground"
                          : i === step
                            ? "border-primary text-primary glow-gold"
                            : "border-border text-muted-foreground"
                        }`}
                    >
                      {i < step ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <span className="hidden text-[10px] text-muted-foreground md:block font-body">{s}</span>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-bold text-foreground">{STEPS[step]}</h2>
                {step < 5 && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-body">Total Estimation</p>
                    <p className="text-lg font-bold text-primary font-display">₹{totalPrice.toLocaleString()}</p>
                  </div>
                )}
              </div>

              {/* Step 0: Branch & Service */}
              {step === 0 && (
                <div className="space-y-6">
                  <div>
                    <label className="mb-3 block text-sm font-medium text-foreground font-body">Select Branch</label>
                    <div className="grid gap-4 md:grid-cols-2">
                      {branches.map((b) => {
                        const isPaused = b.bookingsEnabled === false;
                        return (
                          <button
                            key={b.id}
                            onClick={() => !isPaused && update({ branch: b.id })}
                            disabled={isPaused}
                            className={`rounded-2xl border-2 p-6 text-left transition-all relative ${
                              isPaused
                                ? "border-red-500/20 opacity-70 cursor-not-allowed bg-red-500/5"
                                : booking.branch === b.id
                                  ? "border-primary glow-gold bg-muted shadow-lg"
                                  : "border-border hover:border-primary hover:shadow-md"
                            }`}
                          >
                            {isPaused && (
                              <span className="absolute top-3 right-3 rounded-full bg-red-500/10 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-500 uppercase tracking-wider">
                                Stopped
                              </span>
                            )}
                            <div className="flex items-start gap-3 mb-3">
                              <div className={`p-2 rounded-lg ${booking.branch === b.id && !isPaused ? "bg-primary/20" : "bg-muted"}`}>
                                <MapPin className={`h-5 w-5 ${booking.branch === b.id && !isPaused ? "text-primary" : "text-muted-foreground"}`} />
                              </div>
                              <div>
                                <p className="font-bold text-foreground text-base font-body">{b.name}</p>
                                {booking.branch === b.id && !isPaused && (
                                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">Selected ✓</span>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground font-body leading-relaxed">{b.address}</p>
                            {b.phone && <p className="mt-2 text-xs text-primary font-body font-medium">📞 {b.phone}</p>}
                            {isPaused && (
                              <div className="mt-3 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">
                                <p className="text-xs text-red-500 font-semibold font-body leading-relaxed">
                                  🚫 Bookings stopped temporarily. For more information contact admin.
                                </p>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Hall selector — only shown when selected branch has multiple halls */}
                  {halls.length > 0 && (
                    <div>
                      <label className="mb-3 block text-sm font-medium text-foreground font-body">Select Screen</label>
                      <div className="grid gap-3 grid-cols-2">
                        {halls.map((hall) => (
                          <button
                            key={hall.id}
                            onClick={() => update({ hall: hall.id })}
                            className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all text-left ${
                              booking.hall === hall.id
                                ? "border-primary glow-gold bg-muted shadow-lg"
                                : "border-border hover:border-primary hover:shadow-md"
                            }`}
                          >
                            <div className="flex-1 text-center">
                              <p className="font-bold text-foreground text-sm font-body">{hall.name}</p>
                              {booking.hall === hall.id && (
                                <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">Selected ✓</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="mb-3 block text-sm font-medium text-foreground font-body">Service</label>
                    <div className="grid gap-3 md:grid-cols-1">
                      {Object.keys(pricing)
                        .map((serviceId) => (
                          <button
                            key={serviceId}
                            onClick={() => update({ service: serviceId as any })}
                            className={`flex items-center gap-3 rounded-xl border p-4 transition-all ${booking.service === serviceId ? "border-primary glow-gold bg-muted" : "border-border hover:border-primary"
                              }`}
                          >
                            <Film className="h-5 w-5 text-primary" />
                            <div className="text-left">
                              <span className="font-semibold text-foreground text-sm font-body">{formatServiceName(serviceId)}</span>
                              {serviceId === "premium-pack" ? (
                                <>
                                  <ul className="mb-0 text-[10px] text-muted-foreground font-body list-disc pl-4">
                                    <li>Fog entry</li>
                                    <li>Photos</li>
                                    <li>Cake</li>
                                    <li>Theatre</li>
                                    <li>Decoration</li>
                                  </ul>
                                </>
                              ) : (
                                <p className="text-[10px] text-muted-foreground font-body">Best combined experience</p>
                              )}
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Date, Time & Details (Merged) */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="booking-date" className="mb-2 block text-sm font-medium text-foreground font-body">Select Date</label>
                      <input
                        id="booking-date"
                        name="date"
                        type="date"
                        value={booking.date}
                        min={new Date().toISOString().split("T")[0]}
                        max={(() => { const d = new Date(); d.setMonth(d.getMonth() + 6); return d.toISOString().split("T")[0]; })()}
                        onChange={(e) => {
                          const selected = e.target.value;
                          const today = new Date().toISOString().split("T")[0];
                          if (selected < today) return; // block past dates
                          update({ date: selected, timeSlot: "" });
                        }}
                        className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground font-body focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="booking-membersCount" className="mb-2 block text-sm font-medium text-foreground font-body">Members Count</label>
                      <input
                        id="booking-membersCount"
                        name="membersCount"
                        type="number"
                        min="1"
                        max={(booking.branch === "branch-2" || branches.find(b => b.id === booking.branch)?.name.toLowerCase().includes("bhimavaram")) ? 10 : undefined}
                        value={booking.membersCount || ""}
                        onChange={(e) => {
                          let val = parseInt(e.target.value) || 0;
                          const isBhimavaram = booking.branch === "branch-2" || branches.find(b => b.id === booking.branch)?.name.toLowerCase().includes("bhimavaram");
                          if (isBhimavaram && val > 10) val = 10;
                          update({ membersCount: val });
                        }}
                        className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground font-body focus:border-primary focus:outline-none"
                      />
                      {booking.branch === "branch-1" && booking.membersCount > 10 && (
                        <p className="mt-1 text-[10px] text-primary font-body animate-pulse">
                          * Extra {(booking.membersCount - 10)} persons: +₹{(booking.membersCount - 10) * 150}
                        </p>
                      )}
                      {(booking.branch === "branch-2" || branches.find(b => b.id === booking.branch)?.name.toLowerCase().includes("bhimavaram")) && (
                        <p className="mt-1 text-[10px] text-red-500 font-bold font-body animate-bounce">
                          * Maximum 10 persons allowed for Bhimavaram branch.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground font-body">Duration</label>
                    <div className="flex gap-3">
                      {[1, 2, 3, 4].map((d) => (
                        <button
                          key={d}
                          onClick={() => update({ duration: d, timeSlot: "" })}
                          className={`flex-1 rounded-xl border py-3 text-sm font-medium transition-all font-body ${booking.duration === d ? "border-primary bg-muted text-primary" : "border-border text-foreground hover:border-primary/50"
                            }`}
                        >
                          {d} Hour{d > 1 ? "s" : ""}
                        </button>
                      ))}
                    </div>
                  </div>

                  {booking.duration > 0 && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground font-body">Available Time Slots</label>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                        {availableSlots.length > 0 ? (
                          availableSlots.map((slot) => {
                            const isBooked = bookedSlots.includes(slot);
                            const displayRange = formatSlotRange(slot, booking.duration);
                            return (
                              <button
                                key={slot}
                                disabled={isBooked}
                                onClick={() => update({ timeSlot: slot })}
                                className={`rounded-xl border p-3 text-center transition-all ${booking.timeSlot === slot
                                    ? "border-primary bg-primary/10 text-primary glow-gold shadow-sm"
                                    : isBooked
                                      ? "cursor-not-allowed border-border bg-muted/50 text-muted-foreground line-through opacity-50"
                                      : "border-border text-foreground hover:border-primary/50 hover:bg-muted"
                                  }`}
                              >
                                <span className="block text-[10px] font-bold md:text-sm font-body">{displayRange}</span>
                              </button>
                            );
                          })
                        ) : (
                          <p className="col-span-full py-2 text-center text-xs text-muted-foreground font-body">
                            No slots available.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-border">
                    <h4 className="mb-4 text-sm font-semibold text-foreground font-body">Your Information</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label htmlFor="booking-name" className="mb-1 text-xs text-muted-foreground font-body">Full Name</label>
                        <input
                          id="booking-name"
                          name="name"
                          type="text"
                          value={booking.name}
                          onChange={(e) => update({ name: e.target.value })}
                          className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm font-body focus:border-primary focus:outline-none"
                          placeholder="Name"
                          autoComplete="name"
                        />
                      </div>
                      <div>
                        <label htmlFor="booking-phone" className="mb-1 text-xs text-muted-foreground font-body">Phone</label>
                        <div className="flex items-center rounded-xl border border-border bg-muted overflow-hidden">
                          <span className="pl-3 pr-1 text-sm text-foreground">+91</span>
                          <input
                            id="booking-phone"
                            name="phone"
                            type="tel"
                            value={booking.phone}
                            onChange={(e) => update({ phone: e.target.value })}
                            className="w-full bg-transparent px-2 py-2.5 text-sm font-body focus:outline-none"
                            maxLength={10}
                            placeholder="Number"
                            autoComplete="tel-national"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Occasion */}
              {step === 2 && (
                <Suspense
                  fallback={(
                    <div className="flex items-center justify-center py-12">
                      <p className="text-sm text-muted-foreground font-body animate-pulse">Loading occasion step...</p>
                    </div>
                  )}
                >
                  <OccasionStep booking={booking} occasions={occasions} stepLoading={stepLoading} update={update} />
                </Suspense>
              )}

              {/* Step 3: Cake */}
              {step === 3 && !isPremiumPack && (
                <Suspense
                  fallback={(
                    <div className="flex items-center justify-center py-12">
                      <p className="text-sm text-muted-foreground font-body animate-pulse">Loading cake step...</p>
                    </div>
                  )}
                >
                  <CakeStep booking={booking} cakes={cakes} stepLoading={stepLoading} update={update} />
                </Suspense>
              )}

              {/* Step 4: Extra Decorations */}
              {step === 4 && !isPremiumPack && (
                <Suspense
                  fallback={(
                    <div className="flex items-center justify-center py-12">
                      <p className="text-sm text-muted-foreground font-body animate-pulse">Loading decorations step...</p>
                    </div>
                  )}
                >
                  <DecorationsStep
                    booking={booking}
                    decorations={decorations}
                    stepLoading={stepLoading}
                    decorationMuted={decorationMuted}
                    setDecorationMuted={setDecorationMuted}
                    update={update}
                  />
                </Suspense>
              )}

              {/* Step 5: Summary */}
              {step === 5 && (
                <div className="space-y-4">
                  {[
                    { label: "Branch", value: branches.find((b) => b.id === booking.branch)?.name },
                    ...(booking.hall ? [{ label: "Hall", value: halls.find(h => h.id === booking.hall)?.name || booking.hall }] : []),
                    { label: "Service", value: formatServiceName(booking.service || "") },
                    { label: "Date", value: booking.date },
                    { label: "Time", value: `${booking.timeSlot} (${booking.duration}hr)` },
                    { label: "Members", value: `${booking.membersCount} Persons` },
                    { label: "Name", value: booking.name },
                    { label: "Occasion", value: booking.occasion === "Other" ? booking.customOccasion || "Other" : booking.occasion },
                    ...(isPremiumPack ? [] : [{ label: "Decoration", value: `Yes` }]),
                    {
                      label: (() => {
                        const servicePrice = pricing[booking.service]?.[booking.duration];
                        if (typeof servicePrice === 'object' && servicePrice?.offerPrice != null) return "Offer price";
                        return "Price";
                      })(),
                      value: (() => {
                        const servicePrice = pricing[booking.service]?.[booking.duration];
                        if (!servicePrice) return "N/A";
                        if (typeof servicePrice === 'object' && servicePrice.price !== undefined) {
                          const hasOfferPrice = servicePrice.offerPrice !== undefined && servicePrice.offerPrice !== null;
                          if (hasOfferPrice) {
                            return (
                              <div className="flex items-center gap-1.5 justify-end flex-wrap">
                                <span className="text-secondary font-bold text-base">₹{servicePrice.offerPrice}</span>
                                <span className="line-through text-muted-foreground/50 italic text-[10px]">₹{servicePrice.price}</span>
                                <span className="text-[9px] bg-secondary/20 px-1.5 py-0.5 rounded-full text-secondary font-bold uppercase tracking-wider whitespace-nowrap">Offer</span>
                              </div>
                            );
                          }
                          return `₹${servicePrice.price}`;
                        }
                        return `₹${servicePrice}`;
                      })()
                    },
                    ...(!isPremiumPack ? [{
                      label: "Cake",
                      value: booking.selectedCake
                        ? (
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold">{booking.selectedCake.name}</span>
                            {hasOffer(booking.selectedCake) ? (
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="line-through text-muted-foreground/60 text-[10px]">₹{getOriginalPrice(booking.selectedCake)}</span>
                                <span className="text-green-500 font-bold">₹{getEffectivePrice(booking.selectedCake)}</span>
                              </div>
                            ) : (
                              <span className="text-primary font-bold">₹{booking.selectedCake.price}</span>
                            )}
                          </div>
                        )
                        : "None"
                    }] : []),
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between border-b border-border pb-3 items-start gap-4">
                      <span className="text-xs text-muted-foreground font-body shrink-0">{item.label}</span>
                      <div className="text-xs font-medium text-foreground font-body text-right">{item.value as any}</div>
                    </div>
                  ))}

                  {booking.branch === "branch-1" && booking.membersCount > 10 && (
                    <div className="flex justify-between border-b border-border pb-2">
                      <span className="text-xs text-primary font-bold font-body">Extra Persons (&gt;10)</span>
                      <span className="text-xs font-bold text-primary font-body">₹{(booking.membersCount - 10) * 150}</span>
                    </div>
                  )}

                  {!isPremiumPack && booking.extraDecorations.length > 0 && (
                    <div className="border-b border-border pb-2">
                      <span className="text-xs text-muted-foreground font-body">Extras</span>
                      <div className="mt-1 space-y-1">
                        {booking.extraDecorations.map((d) => (
                          <div key={d.id} className="flex justify-between">
                            <span className="text-[10px] text-foreground font-body">{d.name}</span>
                            <span className="text-[10px] text-primary font-body">
                              ₹{getEffectivePrice(d)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Service/Maintenance charge line */}
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-xs text-muted-foreground font-body">Service &amp; Maintenance Charge</span>
                    <span className="text-xs font-bold text-foreground font-body">₹11</span>
                  </div>

                  <div className="flex justify-between pt-2">
                    <span className="text-lg font-bold text-foreground font-display">Grand Total</span>
                    <span className="text-lg font-bold text-primary font-display">₹{totalPrice.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => setStep(6)}
                    className="w-full mt-6 rounded-xl bg-gradient-gold py-4 text-sm font-bold text-primary-foreground transition-all hover:scale-[1.02] glow-gold font-body"
                  >
                    Proceed to Payment
                  </button>
                  <button
                    onClick={() => goToPrevStep()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-foreground transition-colors hover:border-primary font-body"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                </div>
              )}

              {/* Step 6: Payment Choice */}
              {step === 6 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary glow-gold">
                      <CreditCard className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-display text-xl font-bold">Secure Payment</h3>
                    <p className="text-xs text-muted-foreground">Pay advance to confirm your booking</p>
                  </div>

                  <div className="rounded-2xl border border-primary bg-primary/5 ring-1 ring-primary p-5">
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <p className="font-bold text-sm text-foreground">Advance Payment</p>
                        <p className="text-[10px] text-muted-foreground">Remaining ₹{balanceAmount.toLocaleString()} to be paid at venue</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary font-display">₹{advanceAmount.toLocaleString()}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">of ₹{totalPrice.toLocaleString()} total</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-orange-50 p-3 border border-orange-100">
                    <p className="text-[10px] text-orange-800 text-center font-medium italic">
                      * Advance amount is non-refundable. Balance to be paid at venue.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <button
                      onClick={() => handlePayment('razorpay')}
                      disabled={paymentLoading}
                      className="w-full rounded-xl bg-gradient-gold py-4 text-sm font-bold text-primary-foreground transition-all hover:scale-[1.02] disabled:opacity-50 font-body"
                    >
                      {paymentLoading ? "Connecting..." : `Pay ₹${advanceAmount.toLocaleString()} Now`}
                    </button>

                    {/* Dev-only mock payment button — hidden in production builds */}
                    {import.meta.env.DEV && (
                      <button
                        onClick={() => handlePayment('mock')}
                        disabled={paymentLoading}
                        className="w-full rounded-xl border-2 border-dashed border-yellow-400 bg-yellow-50 py-3 text-sm font-bold text-yellow-800 transition-all hover:bg-yellow-100 disabled:opacity-50 font-body"
                      >
                        {paymentLoading ? "Processing..." : `[DEV] Mock Pay ₹${advanceAmount.toLocaleString()}`}
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setStep(5);
                        setPaymentLoading(false);
                      }}
                      disabled={paymentLoading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-foreground transition-colors hover:border-primary disabled:opacity-30 font-body"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation */}
              {step < 5 && (
                <div className="mt-8 flex justify-between">
                  <button
                    onClick={() => goToPrevStep()}
                    disabled={step === 0}
                    className="flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary disabled:opacity-30 font-body"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    onClick={() => goToNextStep()}
                    disabled={!canNext()}
                    className="flex items-center gap-2 rounded-xl bg-gradient-gold px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 font-body"
                  >
                    Next <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BookingPage;
