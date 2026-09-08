import { CheckCircle, ArrowRight, Calendar, Clock, MapPin, Users, Cake, Gift, CreditCard, Phone, FileText, Download } from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { BRANCHES } from "../lib/booking-data";
import { type Branch } from "@/lib/api";
import { api } from "@/lib/api";
import { getEffectivePrice, getOriginalPrice, hasOffer } from "@/lib/utils";

const BookingConfirmed = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [branchList, setBranchList] = useState<Branch[]>([]);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const data = await api.getBranches();
        setBranchList(data);
      } catch (err) {}
    };
    loadBranches();
  }, []);

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        const orderId = searchParams.get("orderId") || location.state?.orderId;
        
        if (orderId) {
          // Check Razorpay payment status
          const statusResponse = await api.checkRazorpayPaymentStatus(orderId);
          // Extract bookingId from orderId (format: order_bookingId_timestamp)
          const parts = orderId.split('_');
          const bookingId = parts.length > 1 ? parts.slice(1, -1).join('_') : null;
          

          
          // If we have a bookingId but flow didn't finish, try fetching it
          if (bookingId) {
             const b = await api.getBookingById(bookingId);
             if (b) {
               setBooking(b);
               setLoading(false);
               return;
             }
          }
        }
        
        // Fallback: Get booking from location state
        const stateBooking = location.state?.booking;
        if (stateBooking) {
           // We might want to refresh from DB to get the latest
           try {
             const refreshed = await api.getBookingById(stateBooking.id);
             setBooking(refreshed);
           } catch {
             setBooking(stateBooking);
           }
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
      } finally {
        setLoading(false);
      }
    };

    checkPaymentStatus();
  }, [searchParams, location.state]);

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gradient-to-b from-primary/5 to-transparent">
      <div className="container mx-auto max-w-2xl px-4">
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 glow-gold animate-pulse">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <p className="text-lg text-muted-foreground font-body">Loading booking details...</p>
            </div>
          </div>
        ) : booking ? (
          <>
            {/* Success Header */}
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 p-8 mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 glow-gold">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-2">Booking Confirmed!</h1>
              <p className="text-sm text-muted-foreground font-body">
                Thank you{booking?.name ? `, ${booking.name}` : ""}! Your event slot has been reserved.
              </p>
            </div>

            {/* Booking ID Card */}
            <div className="rounded-2xl border-2 border-primary bg-primary/5 p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-body uppercase tracking-wide mb-1">Booking Reference ID</p>
                  <p className="font-mono text-xl font-bold text-primary">{booking.id}</p>
                </div>
                <FileText className="h-8 w-8 text-primary opacity-50" />
              </div>
            </div>

            {/* Slot Details Section */}
            <div className="rounded-2xl border border-border bg-card p-6 mb-6">
              <h2 className="font-display text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Event Details
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex gap-3">
                  <Calendar className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-body">Date</p>
                    <p className="font-semibold text-foreground">{new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Clock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-body">Time Slot</p>
                    <p className="font-semibold text-foreground">{booking.timeSlot}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Clock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-body">Duration</p>
                    <p className="font-semibold text-foreground">{booking.duration} hour{booking.duration > 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Users className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-body">Members</p>
                    <p className="font-semibold text-foreground">{booking.membersCount} Person{booking.membersCount > 1 ? "s" : ""}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Location & Service Section */}
            <div className="rounded-2xl border border-border bg-card p-6 mb-6">
              <h2 className="font-display text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Location & Service
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground font-body uppercase tracking-wide mb-1">Branch</p>
                  <p className="font-semibold text-foreground">
                    {(() => {
                      const b = (branchList.length > 0 ? branchList : BRANCHES).find((br) => br.id === booking.branch);
                      return b ? b.name : booking.branch;
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-body uppercase tracking-wide mb-1">Address</p>
                  <p className="font-semibold text-foreground">
                    {(() => {
                      const b = (branchList.length > 0 ? branchList : BRANCHES).find((br) => br.id === booking.branch);
                      return b ? b.address : "N/A";
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-body uppercase tracking-wide mb-1">Service</p>
                  <p className="font-semibold text-foreground">
                    {booking.service === "private-theatre-party-hall" ? "Private Theatre + Party Hall" : booking.service}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-body uppercase tracking-wide mb-1">Occasion</p>
                  <p className="font-semibold text-foreground">
                    {booking.occasion === "Other" ? booking.customOccasion || "Other" : booking.occasion}
                  </p>
                </div>
              </div>
            </div>

            {/* Decorations & Add-ons Section */}
            {(booking.selectedCake || booking.extraDecorations?.length > 0) && (
              <div className="rounded-2xl border border-border bg-card p-6 mb-6">
                <h2 className="font-display text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  Add-ons & Decorations
                </h2>
                <div className="space-y-3">
                  {booking.selectedCake && (
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Cake className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-foreground text-sm">{booking.selectedCake.name}</span>
                      </div>
                      <div className="text-right">
                        {hasOffer(booking.selectedCake) ? (
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] line-through text-muted-foreground/60">₹{getOriginalPrice(booking.selectedCake)}</span>
                            <span className="font-bold text-green-600">₹{getEffectivePrice(booking.selectedCake)}</span>
                          </div>
                        ) : (
                          <span className="font-bold text-primary">₹{booking.selectedCake.price}</span>
                        )}
                      </div>
                    </div>
                  )}
                  {booking.extraDecorations?.map((d: any) => (
                    <div key={d.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-foreground text-sm">{d.name}</span>
                      </div>
                      <div className="text-right">
                        {hasOffer(d) ? (
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] line-through text-muted-foreground/60">₹{getOriginalPrice(d)}</span>
                            <span className="font-bold text-green-600">₹{getEffectivePrice(d)}</span>
                          </div>
                        ) : (
                          <span className="font-bold text-primary">₹{d.price}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Summary Section */}
            <div className="rounded-2xl border border-border bg-card p-6 mb-6">
              <h2 className="font-display text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Payment Summary
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-border">
                  <span className="text-sm text-muted-foreground font-body">Service & Decoration</span>
                  <span className="font-semibold text-foreground">₹{((booking.totalPrice || 0) - (booking.selectedCake ? getEffectivePrice(booking.selectedCake) : 0) - (booking.extraDecorations?.reduce((sum: number, d: any) => sum + getEffectivePrice(d), 0) || 0)).toLocaleString()}</span>
                </div>
                {booking.selectedCake && (
                  <div className="flex justify-between items-center pb-3 border-b border-border">
                    <span className="text-sm text-muted-foreground font-body">{booking.selectedCake.name}</span>
                    <span className="font-semibold text-foreground">₹{getEffectivePrice(booking.selectedCake).toLocaleString()}</span>
                  </div>
                )}
                {booking.extraDecorations?.length > 0 && (
                  <div className="flex justify-between items-center pb-3 border-b border-border">
                    <span className="text-sm text-muted-foreground font-body">Extra Decorations</span>
                    <span className="font-semibold text-foreground">₹{booking.extraDecorations.reduce((sum: number, d: any) => sum + getEffectivePrice(d), 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3">
                  <span className="font-bold text-foreground">Total Amount</span>
                  <span className="text-2xl font-bold text-primary">₹{booking.totalPrice?.toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-6 space-y-2 pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground font-body">Amount Paid</span>
                  <span className={`font-bold ${booking.amountPaid > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>₹{(booking.amountPaid || 0).toLocaleString()}</span>
                </div>
                {booking.balanceAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground font-body">Balance Due</span>
                    <span className="font-bold text-orange-600">₹{(booking.balanceAmount || 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="mt-3 p-3 rounded-lg bg-primary/5">
                  <p className="text-sm font-semibold text-primary">
                    {booking.paymentStatus === "paid" ? "✓ Fully Paid" : "✓ Slot Confirmed - Balance due on event day"}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Info Section */}
            <div className="rounded-2xl border border-border bg-card p-6 mb-6">
              <h2 className="font-display text-xl font-bold text-foreground mb-4">Your Information</h2>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Users className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-body">Name</p>
                    <p className="font-semibold text-foreground">{booking.name}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Phone className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-body">Phone</p>
                    <p className="font-semibold text-foreground">{booking.phone}</p>
                  </div>
                </div>
                </div>
              </div>

            {/* Next Steps Section */}
            <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 mb-6">
              <h2 className="font-display text-lg font-bold text-foreground mb-4">What's Next?</h2>
              <div className="space-y-3">
                {booking.balanceAmount > 0 && (
                  <div className="flex gap-3">
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground font-bold text-xs">1</div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">Pay Balance Amount</p>
                      <p className="text-xs text-muted-foreground font-body">Pay ₹{booking.balanceAmount.toLocaleString()} on the event day at the branch</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground font-bold text-xs">{booking.balanceAmount > 0 ? 2 : 1}</div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">Reach Early</p>
                    <p className="text-xs text-muted-foreground font-body">Please arrive 10-15 minutes before your scheduled time</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 font-semibold text-foreground hover:bg-muted transition-colors"
              >
                <Download className="h-4 w-4" />
                Print Receipt
              </button>
              <Link
                to="/"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-gold px-6 py-3 font-semibold text-primary-foreground transition-all hover:scale-105"
              >
                Back to Home <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground font-body mb-6">Booking details could not be loaded. Try refreshing or contact support.</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-8 py-3 text-sm font-semibold text-primary-foreground transition-all hover:scale-105"
            >
              Back to Home <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingConfirmed;
