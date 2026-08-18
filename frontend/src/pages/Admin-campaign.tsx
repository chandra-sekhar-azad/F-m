import { useState, useEffect } from "react";
import { Send, Users, MessageSquare, AlertCircle, Phone, CheckCircle2, Search } from "lucide-react";
import { api } from "@/lib/api";

interface User {
  name: string;
  phone: string;
  firstBooking?: string;
}

interface AdminCampaignProps {
  token: string;
  selectedBranch: string;
}

const AdminCampaign = ({ token, selectedBranch }: AdminCampaignProps) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedPhones, setSelectedPhones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [customNumbers, setCustomNumbers] = useState("");

  useEffect(() => {
    fetchUsers();
  }, [token]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFilteredUsers(
      q
        ? users.filter(u => u.name?.toLowerCase().includes(q) || u.phone?.includes(q))
        : users
    );
  }, [search, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers(token);
      // Sort by most recent first
      const sorted = [...data].sort((a, b) => {
        if (!a.firstBooking) return 1;
        if (!b.firstBooking) return -1;
        return new Date(b.firstBooking).getTime() - new Date(a.firstBooking).getTime();
      });
      setUsers(sorted);
      setFilteredUsers(sorted);
    } catch (err) {
      console.error("Error fetching users for campaign:", err);
      setError("Failed to load customers from database.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedPhones(filteredUsers.map(u => u.phone).filter(Boolean));
    } else {
      setSelectedPhones([]);
    }
  };

  const handleTogglePhone = (phone: string) => {
    setSelectedPhones(prev =>
      prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]
    );
  };

  const parsedCustomPhones = customNumbers
    .split(/[\n,]+/)
    .map(n => n.trim())
    .filter(n => n.length > 8);

  const totalRecipients = Array.from(new Set([...selectedPhones, ...parsedCustomPhones])).length;

  const handleSendCampaign = async () => {
    setSuccess(null);
    setError(null);

    const allRecipients = Array.from(new Set([...selectedPhones, ...parsedCustomPhones]));

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
      setSuccess(`Campaign initiated for ${allRecipients.length} recipients!`);
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

  const allFilteredSelected =
    filteredUsers.length > 0 &&
    filteredUsers.every(u => selectedPhones.includes(u.phone));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold font-display text-white">WhatsApp Campaigns</h2>
        <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          {users.length} Customers in DB
        </div>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3 text-yellow-200 text-sm">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold mb-1">WhatsApp Messaging Rules</p>
          <p className="opacity-90 leading-relaxed">
            Sending messages to users outside the 24-hour service window requires pre-approved message templates from Meta. If you haven't approved this message as a template on your Meta Business account, it may fail to deliver unless the user has contacted you recently.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recipients Column */}
        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Select Recipients
          </h3>

          {/* Custom numbers */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
              Custom Phone Numbers (comma or newline separated)
            </label>
            <textarea
              rows={2}
              value={customNumbers}
              onChange={(e) => setCustomNumbers(e.target.value)}
              placeholder="+919876543210, +918765432109"
              className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-primary outline-none resize-none"
            />
            {parsedCustomPhones.length > 0 && (
              <p className="text-xs text-primary mt-1">{parsedCustomPhones.length} custom number{parsedCustomPhones.length > 1 ? "s" : ""} added</p>
            )}
          </div>

          {/* Search + select all */}
          <div className="pt-3 border-t border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                DB Customers ({users.length})
              </span>
              <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-white transition-colors text-muted-foreground">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={handleSelectAll}
                  className="rounded border-white/20 bg-black/50 text-primary focus:ring-primary/50"
                />
                {allFilteredSelected ? "Deselect All" : "Select All"}
              </label>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full bg-black/20 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* User list */}
          <div className="max-h-[320px] overflow-y-auto space-y-1.5 pr-1">
            {loading ? (
              <div className="text-center py-6 text-muted-foreground text-sm">Loading customers...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                {search ? "No customers match your search." : "No customers found in database."}
              </div>
            ) : (
              filteredUsers.map((user, idx) => {
                const isSelected = selectedPhones.includes(user.phone);
                return (
                  <label
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary/40 bg-primary/5"
                        : "border-white/5 hover:border-white/10 bg-black/20"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleTogglePhone(user.phone)}
                      className="rounded border-white/20 bg-black/50 text-primary focus:ring-primary/50 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">{user.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3 shrink-0" />
                        {user.phone}
                        {user.firstBooking && (
                          <span className="ml-2 opacity-60">
                            · {new Date(user.firstBooking).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                          </span>
                        )}
                      </p>
                    </div>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                  </label>
                );
              })
            )}
          </div>

          {selectedPhones.length > 0 && (
            <p className="text-xs text-primary font-medium pt-2 border-t border-white/5">
              {selectedPhones.length} customer{selectedPhones.length > 1 ? "s" : ""} selected
            </p>
          )}
        </div>

        {/* Message Column */}
        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Compose Message
          </h3>

          <textarea
            rows={10}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Hi {name}! 🎉\n\nWe have an exciting offer just for you...\n\nBook now at friendsandmemories.in`}
            className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-primary outline-none resize-none"
          />

          <p className="text-xs text-muted-foreground">
            Supports WhatsApp formatting: *bold*, _italic_, ~strikethrough~
          </p>

          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
              {error}
            </div>
          )}

          {success && (
            <div className="text-green-400 text-sm bg-green-400/10 p-3 rounded-lg border border-green-400/20 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> {success}
            </div>
          )}

          <button
            onClick={handleSendCampaign}
            disabled={sending || totalRecipients === 0 || !message.trim()}
            className="w-full bg-primary text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-black/30 border-t-black" />
                Sending to {totalRecipients} recipients...
              </span>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Campaign to {totalRecipients} Recipient{totalRecipients !== 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminCampaign;
