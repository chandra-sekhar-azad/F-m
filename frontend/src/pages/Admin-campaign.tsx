import { useState, useEffect } from "react";
import { Send, Users, MessageSquare, AlertCircle, Phone, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

interface Booking {
  id: string;
  name: string;
  phone: string;
  date: string;
}

interface AdminCampaignProps {
  token: string;
  selectedBranch: string;
}

const AdminCampaign = ({ token, selectedBranch }: AdminCampaignProps) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedPhones, setSelectedPhones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Custom numbers input
  const [customNumbers, setCustomNumbers] = useState("");

  useEffect(() => {
    fetchPastBookings();
  }, [selectedBranch]);

  const fetchPastBookings = async () => {
    try {
      setLoading(true);
      // Fetch bookings without date filter to get all past bookings
      const data = await api.getBookings(token, selectedBranch, "all");
      setBookings(data);
    } catch (err) {
      console.error("Error fetching bookings for campaign:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // Extract unique phone numbers
      const uniquePhones = Array.from(new Set(bookings.map(b => b.phone).filter(Boolean)));
      setSelectedPhones(uniquePhones);
    } else {
      setSelectedPhones([]);
    }
  };

  const handleTogglePhone = (phone: string) => {
    setSelectedPhones(prev => 
      prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]
    );
  };

  const handleSendCampaign = async () => {
    setSuccess(null);
    setError(null);

    // Combine selected phones from bookings and custom numbers
    const parsedCustomNumbers = customNumbers
      .split(/[\n,]+/)
      .map(n => n.trim())
      .filter(n => n.length > 8);

    const allRecipients = Array.from(new Set([...selectedPhones, ...parsedCustomNumbers]));

    if (allRecipients.length === 0) {
      setError("Please select at least one recipient or enter custom numbers.");
      return;
    }

    if (!message.trim()) {
      setError("Please enter a message to send.");
      return;
    }

    try {
      setSending(true);
      await api.sendWhatsAppCampaign(token, message, undefined, allRecipients);
      setSuccess(`Successfully initiated campaign for ${allRecipients.length} recipients!`);
      setMessage("");
      setSelectedPhones([]);
      setCustomNumbers("");
    } catch (err: any) {
      setError(err.message || "Failed to send campaign. Check server logs.");
      console.error("Campaign error:", err);
    } finally {
      setSending(false);
    }
  };

  // Get unique bookings by phone for the list
  const uniqueBookings = bookings.reduce((acc: Booking[], current) => {
    const x = acc.find(item => item.phone === current.phone);
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold font-display text-white">WhatsApp Campaigns</h2>
        <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Meta API Integration
        </div>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3 text-yellow-200 text-sm">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-bold mb-1">WhatsApp Messaging Rules</p>
          <p className="opacity-90 leading-relaxed">
            Sending messages to users outside the 24-hour service window requires pre-approved message templates from Meta. If you haven't approved this message as a template on your Meta Business account, it may fail to deliver unless the user has contacted you recently.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recipients Column */}
        <div className="space-y-6">
          <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Select Recipients
            </h3>
            
            <div className="mb-4">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                Custom Phone Numbers (comma or newline separated)
              </label>
              <textarea
                rows={3}
                value={customNumbers}
                onChange={(e) => setCustomNumbers(e.target.value)}
                placeholder="+919876543210, +918765432109"
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-primary outline-none"
              />
            </div>

            <div className="flex items-center justify-between mb-3 pt-4 border-t border-white/5">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Past Customers
              </span>
              <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-white transition-colors text-muted-foreground">
                <input
                  type="checkbox"
                  checked={selectedPhones.length > 0 && selectedPhones.length === uniqueBookings.length && uniqueBookings.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-white/20 bg-black/50 text-primary focus:ring-primary/50"
                />
                Select All
              </label>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {loading ? (
                <div className="text-center py-4 text-muted-foreground text-sm">Loading customers...</div>
              ) : uniqueBookings.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">No bookings found.</div>
              ) : (
                uniqueBookings.map((booking, idx) => (
                  <label key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:border-white/10 bg-black/20 cursor-pointer transition-colors group">
                    <input
                      type="checkbox"
                      checked={selectedPhones.includes(booking.phone)}
                      onChange={() => handleTogglePhone(booking.phone)}
                      className="rounded border-white/20 bg-black/50 text-primary focus:ring-primary/50"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">{booking.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {booking.phone}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Message Column */}
        <div className="space-y-6">
          <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Compose Message
            </h3>
            
            <textarea
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your WhatsApp message here..."
              className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-primary outline-none mb-6 resize-none"
            />

            {error && (
              <div className="mb-4 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 text-green-400 text-sm bg-green-400/10 p-3 rounded-lg border border-green-400/20 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> {success}
              </div>
            )}

            <button
              onClick={handleSendCampaign}
              disabled={sending}
              className="w-full bg-primary text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {sending ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Send Campaign to {selectedPhones.length + (customNumbers.trim() ? customNumbers.split(/[\n,]+/).length : 0)} Recipients
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCampaign;
