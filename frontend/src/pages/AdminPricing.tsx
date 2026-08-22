import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Edit2, Trash2, Plus, Save, X, LogIn, Film, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRANCHES, fetchBranches as fetchSharedBranches } from "@/lib/booking-data";
import { api, API_BASE, type Branch } from "@/lib/api";

interface PricingItem {
  id?: string;
  name?: string;
  price: number;
  originalPrice?: number;
  offerPrice?: number;
  description?: string;
  image?: string;
  service?: string;
  duration?: number;
  hallId?: string;
}

const AdminPricing = () => {
  const [activeTab, setActiveTab] = useState<"services" | "cakes" | "decorations">("services");
  const [pricing, setPricing] = useState<Record<string, Record<any, any>>>({});
  const [cakes, setCakes] = useState<PricingItem[]>([]);
  const [decorations, setDecorations] = useState<PricingItem[]>([]);
  const [decorationPrice, setDecorationPrice] = useState(1500);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<PricingItem>({} as PricingItem);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string>("branch-1");
  const [token, setToken] = useState<string | null>(null);
  const [branchList, setBranchList] = useState<Branch[]>([]);

  // Check for saved token on component mount
  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken');
    if (savedToken) {
      setToken(savedToken);
      setIsLoggedIn(true);
    }
    
    // Fetch dynamic branches
    const loadBranches = async () => {
      try {
        const data = await api.getBranches();
        setBranchList(data);
      } catch (error) {
        console.error("Failed to load branches:", error);
      }
    };
    loadBranches();
  }, []);

  useEffect(() => {
    if (isLoggedIn && token) {
      // Save token to localStorage when logged in
      localStorage.setItem('adminToken', token);
      fetchPricing();
    }
  }, [isLoggedIn, token, selectedBranch]);

  const handleLogin = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        setIsLoggedIn(true);
      } else {
        alert("Invalid password");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed");
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-24">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-primary glow-gold">
            <LogIn className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-6 text-center font-display text-2xl font-bold text-foreground">Admin Login</h2>

          <input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground font-body focus:border-primary focus:outline-none"
          />
          <button
            onClick={handleLogin}
            className="w-full rounded-xl bg-gradient-gold py-3 text-sm font-bold text-primary-foreground transition-all hover:scale-[1.02] font-body"
          >
            Login
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground font-body">
            Password: admin123
          </p>
        </div>
      </div>
    );
  }

  const fetchPricing = async () => {
    try {
      setLoading(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [pricingRes, cakesRes, decorationsRes, decorationPriceRes] = await Promise.all([
        fetch(`${API_BASE}/pricing?branch=${encodeURIComponent(selectedBranch)}`, { headers }),
        fetch(`${API_BASE}/cakes?branch=${encodeURIComponent(selectedBranch)}`, { headers }),
        fetch(`${API_BASE}/decorations?branch=${encodeURIComponent(selectedBranch)}`, { headers }),
        fetch(`${API_BASE}/decoration-price?branch=${encodeURIComponent(selectedBranch)}`, { headers }),
      ]);

      if (pricingRes.ok) {
        const pricing = await pricingRes.json();
        console.log("Fetched pricing:", pricing);
        setPricing(pricing);
      }
      if (cakesRes.ok) {
        const cakes = await cakesRes.json();
        console.log("Fetched cakes:", cakes);
        setCakes(cakes);
      }
      if (decorationsRes.ok) {
        const decorations = await decorationsRes.json();
        console.log("Fetched decorations:", decorations);
        setDecorations(decorations);
      }
      if (decorationPriceRes.ok) {
        const data = await decorationPriceRes.json();
        console.log("Fetched decoration price:", data);
        setDecorationPrice(data.decorationPrice);
      }
    } catch (error) {
      console.error("Error fetching pricing:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditService = (service: string, duration: number, price: any, hallId?: string) => {
    setEditingId(hallId ? `${service}-${hallId}-${duration}` : `${service}-${duration}`);
    const actualPrice = typeof price === 'object' ? (price.price || 0) : price;
    const offerPrice = typeof price === 'object' ? price.offerPrice : undefined;
    setEditValues({ service, duration, price: actualPrice, offerPrice, hallId } as PricingItem);
  };

  const handleEditCake = (cake: PricingItem) => {
    setEditingId(cake.id || "");
    setEditValues(cake);
  };

  const handleEditDecoration = (decoration: PricingItem) => {
    setEditingId(decoration.id || "");
    setEditValues(decoration);
  };

  const handleSaveService = async () => {
    try {
      console.log("Saving service pricing with values:", { ...editValues, branch: selectedBranch });

      const response = await fetch(`${API_BASE}/pricing?branch=${encodeURIComponent(selectedBranch)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ...editValues, branch: selectedBranch }),
      });

      if (response.ok) {
        const updated = await response.json();
        console.log("Pricing updated successfully and saved to database:", updated);
        
        // Verify the update by fetching fresh data from server
        await fetchPricing();
        
        setEditingId(null);
        alert(`✅ Service pricing saved to database!\n\nService: ${editValues.service}\nDuration: ${editValues.duration}h\nPrice: ₹${editValues.price}\nOffer: ₹${editValues.offerPrice}\n\n⏱️ Users will see updated prices within 30 seconds.`);
      } else {
        console.error("Error saving pricing:", response.status, await response.text());
        alert("❌ Failed to save pricing to database");
      }
    } catch (error) {
      console.error("Error saving pricing:", error);
      alert("❌ Error saving pricing: " + error);
    }
  };

  const handleSaveCake = async () => {
    try {
      const baseUrl = editValues.id?.startsWith("cake-") ? `${API_BASE}/cakes/${editValues.id}` : `${API_BASE}/cakes`;
      const url = `${baseUrl}?branch=${encodeURIComponent(selectedBranch)}`;
      const method = editValues.id?.startsWith("cake-") ? "PUT" : "POST";

      console.log("Saving cake with data:", { ...editValues, branch: selectedBranch });

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ...editValues, branch: selectedBranch }),
      });

      const data = await response.json();
      console.log("Response status:", response.status, data);

      if (response.ok) {
        await fetchPricing();
        setEditingId(null);
        alert(`✅ Cake saved to database!\n\n${editValues.id ? "Updated" : "Created"}: ${editValues.name}\nPrice: ₹${editValues.price}\n\n⏱️ Users will see updated cakes within 30 seconds.`);
      } else {
        alert(`❌ Error: ${data.error || "Failed to save cake"}`);
      }
    } catch (error) {
      console.error("Error saving cake:", error);
      alert(`❌ Error: ${error.message}`);
    }
  };

  const handleSaveDecoration = async () => {
    try {
      const baseUrl = editValues.id?.startsWith("extra-") ? `${API_BASE}/decorations/${editValues.id}` : `${API_BASE}/decorations`;
      const url = `${baseUrl}?branch=${encodeURIComponent(selectedBranch)}`;
      const method = editValues.id?.startsWith("extra-") ? "PUT" : "POST";

      console.log("Saving decoration with data:", { ...editValues, branch: selectedBranch });

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ...editValues, branch: selectedBranch }),
      });

      const data = await response.json();
      console.log("Response status:", response.status, data);

      if (response.ok) {
        await fetchPricing();
        setEditingId(null);
        alert(`✅ Decoration saved to database!\n\n${editValues.id ? "Updated" : "Created"}: ${editValues.name}\nPrice: ₹${editValues.price}\n\n⏱️ Users will see updated decorations within 30 seconds.`);
      } else {
        alert(`❌ Error: ${data.error || "Failed to save decoration"}`);
      }
    } catch (error) {
      console.error("Error saving decoration:", error);
      alert(`❌ Error: ${error.message}`);
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

  if (loading) {
    return <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl italic text-primary">Pricing Management</h1>
            <p className="text-sm text-muted-foreground font-body mt-1">
              {(branchList.length > 0 ? branchList : BRANCHES).find((b) => b.id === selectedBranch)?.name}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="rounded-full border border-border bg-muted px-4 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
            >
              {(branchList.length > 0 ? branchList : BRANCHES).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setIsLoggedIn(false);
                setPassword("");
                setToken(null);
                localStorage.removeItem('adminToken');
                console.log('Logged out and cleared session');
              }}
              className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-medium transition-all font-body hover:border-primary/50"
            >
              <LogIn className="h-3 w-3" />
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 sm:gap-4 mb-8 border-b border-border overflow-x-auto scrollbar-hide">
          {(["services", "cakes", "decorations"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-2 sm:px-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Services Tab */}
        {activeTab === "services" && (
          <div className="space-y-4">
            {Object.entries(pricing).map(([service, durationsOrHalls]) => {
              let branchHalls = [];
              if (selectedBranch === "branch-2") {
                branchHalls = [
                  { id: "prime", name: "Prime Screen" },
                  { id: "private", name: "Private Screen" }
                ];
              }
              const hasHalls = branchHalls.length > 0;
              
              const renderDurations = (durations: any, hallId?: string, hallName?: string) => (
                <div key={`${service}${hallId ? `-${hallId}` : ''}`} className="border border-border rounded-lg p-6 mb-4">
                  <h3 className="font-semibold text-lg mb-4 capitalize">
                    {service.replace("-", " ")} {hallName ? `- ${hallName}` : ''}
                  </h3>
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((duration) => {
                      const price = durations[duration] || durations[String(duration)] || 0;
                      const editKey = hallId ? `${service}-${hallId}-${duration}` : `${service}-${duration}`;
                      const isEditing = editingId === editKey;
                      return (
                        <div key={editKey} className="flex items-center justify-between bg-muted p-3 rounded-lg">
                          <span className="font-medium">{duration} Hour{duration !== 1 ? "s" : ""}</span>
                          {isEditing ? (
                            <div className="flex flex-col flex-1 gap-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Original</label>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs">₹</span>
                                    <input
                                      type="number"
                                      value={editValues.originalPrice || ""}
                                      onChange={(e) => setEditValues({ ...editValues, originalPrice: e.target.value ? Number(e.target.value) : undefined })}
                                      className="flex-1 px-2 py-1 text-xs border border-border rounded bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-green-600 mb-1 block">🎉 Offer</label>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-green-600 font-bold">₹</span>
                                    <input
                                      type="number"
                                      value={editValues.offerPrice || ""}
                                      onChange={(e) => setEditValues({ ...editValues, offerPrice: e.target.value ? Number(e.target.value) : undefined })}
                                      className="flex-1 px-2 py-1 text-xs border-2 border-green-500 rounded bg-card text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 font-semibold"
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  onClick={handleSaveService}
                                  className="bg-primary text-primary-foreground text-xs"
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingId(null)}
                                  className="text-xs"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4">
                              {typeof price === 'object' && price.offerPrice ? (
                                <>
                                  <span className="font-bold text-green-500">₹{price.offerPrice}</span>
                                  <span className="text-sm line-through text-muted-foreground">₹{price.originalPrice || price.price}</span>
                                </>
                              ) : (
                                <span className="font-bold text-primary">₹{typeof price === 'object' ? price.price : price}</span>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditService(service, Number(duration), price, hallId)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );

              if (hasHalls) {
                return (
                  <div key={service}>
                    {branchHalls.map(hall => {
                      const hallDurations = durationsOrHalls[hall.id] || {};
                      return renderDurations(hallDurations, hall.id, hall.name);
                    })}
                  </div>
                );
              } else {
                return renderDurations(durationsOrHalls);
              }
            })}
          </div>
        )}

        {/* Cakes Tab */}
        {activeTab === "cakes" && (
          <div className="space-y-4">
            {cakes.map((cake) => {
              const isEditing = editingId === cake.id;
              return (
                <div key={cake.id} className="border border-border rounded-lg p-6">
                  {isEditing ? (
                    <div className="space-y-4">
                      <input
                        type="text"
                        placeholder="Cake name"
                        value={editValues.name || ""}
                        onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                        className="w-full px-3 py-2 border border-primary rounded text-foreground bg-card placeholder:text-muted-foreground caret-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        type="text"
                        placeholder="Description"
                        value={editValues.description || ""}
                        onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                        className="w-full px-3 py-2 border border-primary rounded text-foreground bg-card placeholder:text-muted-foreground caret-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        type="text"
                        placeholder="Quantity (e.g. 1/2 kg, 1kg, 2kg)"
                        value={editValues.quantity || ""}
                        onChange={(e) => setEditValues({ ...editValues, quantity: e.target.value })}
                        className="w-full px-3 py-2 border border-primary rounded text-foreground bg-card placeholder:text-muted-foreground caret-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-muted-foreground">Anniversary Offer Pricing</label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-semibold text-muted-foreground mb-2 block">Original Price</label>
                            <div className="flex items-center gap-2">
                              <span className="text-foreground">₹</span>
                              <input
                                type="number"
                                placeholder="Original"
                                value={editValues.originalPrice || ""}
                                onChange={(e) => setEditValues({ ...editValues, originalPrice: e.target.value ? Number(e.target.value) : undefined })}
                                className="w-full px-3 py-2 border border-border rounded text-foreground bg-card placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-green-600 mb-2 block">🎉 Offer Price</label>
                            <div className="flex items-center gap-2">
                              <span className="text-green-600 font-bold">₹</span>
                              <input
                                type="number"
                                placeholder="Offer"
                                value={editValues.offerPrice || ""}
                                onChange={(e) => setEditValues({ ...editValues, offerPrice: e.target.value ? Number(e.target.value) : undefined })}
                                className="w-full px-3 py-2 border-2 border-green-500 rounded text-green-600 bg-card placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500 font-semibold"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3 rounded text-xs text-green-700 dark:text-green-300">
                          <p className="font-semibold mb-1">Customer will see:</p>
                          <p className="line-through">₹{editValues.originalPrice}</p>
                          <p className="text-green-600 font-bold text-sm">₹{editValues.offerPrice}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveCake} className="bg-primary text-primary-foreground">
                          <Save className="h-4 w-4 mr-2" /> Save
                        </Button>
                        <Button variant="outline" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4 mr-2" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-lg">{cake.name}</h4>
                        <p className="text-sm text-muted-foreground">{cake.description}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(cake.variants || [{ quantity: cake.quantity || '1kg', price: cake.price, offerPrice: cake.offerPrice }]).map((v: any, i: number) => (
                              <div key={i} className="bg-muted px-3 py-1 rounded-full border border-border text-xs">
                                <span className="font-bold text-foreground">{v.quantity}: </span>
                                {v.offerPrice ? (
                                  <span className="text-green-600 font-bold">₹{v.offerPrice} <span className="text-muted-foreground/50 line-through font-normal text-[10px]">₹{v.price}</span></span>
                                ) : (
                                  <span className="text-primary font-bold">₹{v.price}</span>
                                )}
                              </div>
                            ))}
                          </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditCake(cake)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteCake(cake.id || "")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <Button
              onClick={() => {
                setEditingId("new-cake");
                setEditValues({ name: "", description: "", variants: [{ quantity: "1kg", price: 0 }] });
              }}
              className="w-full bg-primary text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-2" /> Add New Cake
            </Button>
            {editingId === "new-cake" && (
              <div className="border border-border rounded-lg p-6 space-y-4">
                <input
                  type="text"
                  placeholder="Cake name"
                  value={editValues.name || ""}
                  onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                  className="w-full px-3 py-2 border border-primary rounded text-foreground bg-card placeholder:text-muted-foreground caret-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={editValues.description || ""}
                  onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                  className="w-full px-3 py-2 border border-primary rounded text-foreground bg-card placeholder:text-muted-foreground caret-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="space-y-3 border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-muted-foreground uppercase">Price Variants</label>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => setEditValues({ ...editValues, variants: [...(editValues.variants || []), { quantity: "", price: 0 }] })}
                      className="text-xs"
                    >
                      + Add Variant
                    </Button>
                  </div>
                  {(editValues.variants || []).map((v: any, idx: number) => (
                    <div key={idx} className="space-y-2 p-3 bg-muted/50 rounded-lg border border-border">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Quantity (e.g. 1kg)"
                          value={v.quantity}
                          onChange={(e) => {
                            const newVariants = [...editValues.variants];
                            newVariants[idx].quantity = e.target.value;
                            setEditValues({ ...editValues, variants: newVariants });
                          }}
                          className="px-3 py-1.5 text-xs border border-border rounded bg-card"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-xs">₹</span>
                          <input
                            type="number"
                            placeholder="Price"
                            value={v.price}
                            onChange={(e) => {
                              const newVariants = [...editValues.variants];
                              newVariants[idx].price = Number(e.target.value);
                              setEditValues({ ...editValues, variants: newVariants });
                            }}
                            className="w-full px-3 py-1.5 text-xs border border-border rounded bg-card"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-green-600">₹</span>
                          <input
                            type="number"
                            placeholder="Offer Price"
                            value={v.offerPrice || ""}
                            onChange={(e) => {
                              const newVariants = [...editValues.variants];
                              newVariants[idx].offerPrice = e.target.value ? Number(e.target.value) : undefined;
                              setEditValues({ ...editValues, variants: newVariants });
                            }}
                            className="w-full px-3 py-1.5 text-xs border border-green-200 rounded bg-card text-green-600 font-bold"
                          />
                        </div>
                        {editValues.variants?.length > 1 && (
                          <Button 
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const newVariants = editValues.variants.filter((_: any, i: number) => i !== idx);
                              setEditValues({ ...editValues, variants: newVariants });
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveCake} className="bg-primary text-primary-foreground">
                    <Save className="h-4 w-4 mr-2" /> Create
                  </Button>
                  <Button variant="outline" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4 mr-2" /> Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Decorations Tab */}
        {activeTab === "decorations" && (
          <div className="space-y-4">
            <div className="border border-border rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-lg mb-4">Base Decoration Price</h3>
              {editingId === "decoration-price" ? (
                <div className="flex gap-2">
                  <span>₹</span>
                  <input
                    type="number"
                    value={decorationPrice}
                    onChange={(e) => setDecorationPrice(Number(e.target.value))}
                    className="flex-1 px-3 py-2 border border-primary rounded text-foreground bg-card placeholder:text-muted-foreground caret-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button onClick={handleSaveDecorationPrice} className="bg-primary text-primary-foreground">
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="font-bold text-primary text-lg">₹{decorationPrice}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId("decoration-price")}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {decorations.map((decoration) => {
              const isEditing = editingId === decoration.id;
              return (
                <div key={decoration.id} className="border border-border rounded-lg p-6">
                  {isEditing ? (
                    <div className="space-y-4">
                      <input
                        type="text"
                        placeholder="Decoration name"
                        value={editValues.name || ""}
                        onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                        className="w-full px-3 py-2 border border-primary rounded text-foreground bg-card placeholder:text-muted-foreground caret-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        type="text"
                        placeholder="Description"
                        value={editValues.description || ""}
                        onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                        className="w-full px-3 py-2 border border-primary rounded text-foreground bg-card placeholder:text-muted-foreground caret-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-muted-foreground">Anniversary Offer Pricing</label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-semibold text-muted-foreground mb-2 block">Original Price</label>
                            <div className="flex items-center gap-2">
                              <span className="text-foreground">₹</span>
                              <input
                                type="number"
                                placeholder="Original"
                                value={editValues.originalPrice || ""}
                                onChange={(e) => setEditValues({ ...editValues, originalPrice: e.target.value ? Number(e.target.value) : undefined })}
                                className="w-full px-3 py-2 border border-border rounded text-foreground bg-card placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-green-600 mb-2 block">🎉 Offer Price</label>
                            <div className="flex items-center gap-2">
                              <span className="text-green-600 font-bold">₹</span>
                              <input
                                type="number"
                                placeholder="Offer"
                                value={editValues.offerPrice || ""}
                                onChange={(e) => setEditValues({ ...editValues, offerPrice: e.target.value ? Number(e.target.value) : undefined })}
                                className="w-full px-3 py-2 border-2 border-green-500 rounded text-green-600 bg-card placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500 font-semibold"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3 rounded text-xs text-green-700 dark:text-green-300">
                          <p className="font-semibold mb-1">Customer will see:</p>
                          <p className="line-through">₹{editValues.originalPrice}</p>
                          <p className="text-green-600 font-bold text-sm">₹{editValues.offerPrice}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveDecoration} className="bg-primary text-primary-foreground">
                          <Save className="h-4 w-4 mr-2" /> Save
                        </Button>
                        <Button variant="outline" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4 mr-2" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-lg">{decoration.name}</h4>
                        <p className="text-sm text-muted-foreground">{decoration.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          {decoration.offerPrice !== undefined && decoration.offerPrice !== null ? (
                            <>
                              <p className="font-bold text-green-500">₹{decoration.offerPrice}</p>
                              <p className="text-sm line-through text-muted-foreground">₹{decoration.originalPrice || decoration.price}</p>
                            </>
                          ) : (
                            <p className="font-bold text-primary">₹{decoration.price}</p>
                          )}
                        </div>
                        {decoration.video && (
                          <Link
                            to="/reels"
                            className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground transition-colors hover:border-primary hover:text-primary"
                          >
                            <Film className="h-3.5 w-3.5" />
                            View Reels
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditDecoration(decoration)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteDecoration(decoration.id || "")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <Button
              onClick={() => {
                setEditingId("new-decoration");
                setEditValues({ name: "", price: 0, description: "" });
              }}
              className="w-full bg-primary text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-2" /> Add New Decoration
            </Button>
            {editingId === "new-decoration" && (
              <div className="border border-border rounded-lg p-6 space-y-4">
                <input
                  type="text"
                  placeholder="Decoration name"
                  value={editValues.name || ""}
                  onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                  className="w-full px-3 py-2 border border-primary rounded text-foreground bg-card placeholder:text-muted-foreground caret-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={editValues.description || ""}
                  onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                  className="w-full px-3 py-2 border border-primary rounded text-foreground bg-card placeholder:text-muted-foreground caret-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex gap-2">
                    <span>₹</span>
                    <input
                      type="number"
                      placeholder="Regular Price"
                      value={editValues.price}
                      onChange={(e) => setEditValues({ ...editValues, price: Number(e.target.value) })}
                      className="flex-1 px-3 py-2 border border-primary rounded text-foreground bg-card placeholder:text-muted-foreground caret-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <span>₹</span>
                    <input
                      type="number"
                      placeholder="Original Price"
                      value={editValues.originalPrice || ""}
                      onChange={(e) => setEditValues({ ...editValues, originalPrice: e.target.value ? Number(e.target.value) : undefined })}
                      className="flex-1 px-3 py-2 border border-border rounded text-foreground bg-card placeholder:text-muted-foreground caret-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <span>₹</span>
                    <input
                      type="number"
                      placeholder="Offer Price"
                      value={editValues.offerPrice || ""}
                      onChange={(e) => setEditValues({ ...editValues, offerPrice: e.target.value ? Number(e.target.value) : undefined })}
                      className="flex-1 px-3 py-2 border border-border rounded text-foreground bg-card placeholder:text-muted-foreground caret-foreground focus:outline-none focus:ring-2 focus:ring-primary text-green-500"
                    />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>💡 For Anniversary with offer: Set Original Price and Offer Price</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveDecoration} className="bg-primary text-primary-foreground">
                    <Save className="h-4 w-4 mr-2" /> Create
                  </Button>
                  <Button variant="outline" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4 mr-2" /> Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPricing;
