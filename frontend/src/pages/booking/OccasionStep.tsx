import { Sparkles } from "lucide-react";
import type { BookingData } from "@/lib/booking-data";

interface OccasionStepProps {
  booking: BookingData;
  occasions: string[];
  stepLoading: boolean;
  update: (partial: Partial<BookingData>) => void;
}

const OccasionStep = ({ booking, occasions, stepLoading, update }: OccasionStepProps) => {
  return (
    <div className="space-y-6">
      {stepLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground font-body animate-pulse">Loading occasions...</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-primary/5 p-4 border border-primary/20">
            <p className="text-xs text-primary font-body font-semibold flex items-center gap-2">
              <Sparkles className="h-3 w-3" /> Select one of the option
            </p>
          </div>
          <div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {occasions.map((o) => (
                <button
                  key={o}
                  onClick={() => update({ occasion: o })}
                  className={`rounded-xl border py-3 text-xs font-medium transition-all font-body ${booking.occasion === o ? "border-primary bg-muted text-primary" : "border-border text-foreground hover:border-primary"
                    }`}
                >
                  {o}
                </button>
              ))}
            </div>
            {booking.occasion === "Other" && (
              <div className="mt-4">
                <label htmlFor="booking-customOccasion" className="sr-only">Specific Occasion</label>
                <input
                  id="booking-customOccasion"
                  name="customOccasion"
                  type="text"
                  placeholder="Please specify your occasion"
                  value={booking.customOccasion || ""}
                  onChange={(e) => update({ customOccasion: e.target.value })}
                  className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground font-body focus:border-primary focus:outline-none"
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default OccasionStep;
