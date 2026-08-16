import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Search, Loader, Users as UsersIcon } from "lucide-react";

interface UsersDbProps {
  token: string;
}

interface User {
  name: string;
  phone: string;
  firstBooking?: string;
}

export default function UsersDb({ token }: UsersDbProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await api.getUsers(token);
        setUsers(data);
      } catch (err) {
        setError("Failed to load users");
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, [token]);

  const filteredUsers = users.filter((u) => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.phone.includes(search)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-primary" />
            Users Database
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            View all customers who have booked slots in the past.
          </p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-muted pl-10 pr-4 py-2 rounded-xl border border-border focus:border-primary focus:outline-none text-foreground text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-center">
          {error}
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Name</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Phone Number</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">First Booking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">{user.name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{user.phone}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {user.firstBooking ? new Date(user.firstBooking).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-muted/50 p-4 text-xs text-muted-foreground text-center border-t border-border">
            Total Customers: <span className="font-bold text-foreground">{filteredUsers.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}
