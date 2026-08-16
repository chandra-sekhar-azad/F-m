// Determine API base URL - use env var if available, otherwise use production URL
const API_URL = import.meta.env.VITE_API_URL || 'https://f-m-xk1e.onrender.com/api';
export const API_BASE = API_URL;

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  mapLink?: string;
  bookingsEnabled?: boolean;
}

export interface CakeOption {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  offerPrice?: number;
  description: string;
  image?: string;
  quantity?: string;
  variants?: Array<{ quantity: string; price: number; offerPrice?: number }>;
}

export interface ExtraDecoration {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  offerPrice?: number;
  description: string;
  image?: string;
  video?: string;
}

export interface TestimonialImage {
  id: string;
  image: string;
  title?: string;
  date?: string;
}

export interface BranchVideo {
  id: string;
  url: string;
  title: string;
}

export interface ReelVideo {
  id: string;
  branch: string;
  url: string;
  title: string;
  publicId?: string;
  createdAt?: string;
}

const normalizeBranchVideos = (data: unknown): BranchVideo[] => {
  if (!Array.isArray(data)) return [];

  return data
    .map((item, index) => {
      if (typeof item === "string") {
        return { id: `video-${index}`, url: item, title: "" };
      }

      if (!item || typeof item !== "object") return null;

      const video = item as Record<string, any>;
      return {
        id: video.id || `video-${index}`,
        url: video.url || video.secure_url || video.videoUrl || "",
        title: video.title || video.name || "",
      };
    })
    .filter((video): video is BranchVideo => Boolean(video?.url));
};

export const api = {
  async getBranches(): Promise<Branch[]> {
    const res = await fetch(`${API_BASE}/branches?t=${Date.now()}`);
    if (!res.ok) throw new Error("Failed to fetch branches");
    return res.json();
  },

  async getOccasions(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/occasions`);
    if (!res.ok) throw new Error("Failed to fetch occasions");
    return res.json();
  },

  async getBookingInit(branchId: string): Promise<any> {
    const timestamp = Date.now();
    const res = await fetch(`${API_BASE}/bookings/init/${branchId}?t=${timestamp}`);
    if (!res.ok) throw new Error("Failed to fetch booking init data");
    return res.json();
  },

  async getCakes(branch?: string): Promise<CakeOption[]> {
    const query = new URLSearchParams();
    if (branch) query.append("branch", branch);
    query.append("t", Date.now().toString());
    const res = await fetch(`${API_BASE}/cakes?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch cakes");
    return res.json();
  },

  async getDecorations(branch?: string): Promise<ExtraDecoration[]> {
    const query = new URLSearchParams();
    if (branch) query.append("branch", branch);
    query.append("t", Date.now().toString());
    const res = await fetch(`${API_BASE}/decorations?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch decorations");
    return res.json();
  },

  async getReels(branch: string = "all"): Promise<ReelVideo[]> {
    const res = await fetch(`${API_BASE}/reels?branch=${encodeURIComponent(branch)}`);
    if (!res.ok) throw new Error("Failed to fetch reels");
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .map((item, index) => {
        if (typeof item === "string") {
          return { id: `reel-${index}`, branch: branch === "all" ? "branch-1" : branch, url: item, title: "" };
        }

        if (!item || typeof item !== "object") return null;

        const reel = item as Record<string, any>;
        return {
          id: reel.id || `reel-${index}`,
          branch: reel.branch || (branch === "all" ? "branch-1" : branch),
          url: reel.url || reel.secure_url || reel.videoUrl || "",
          title: reel.title || reel.name || "",
          publicId: reel.publicId || reel.public_id,
          createdAt: reel.createdAt || reel.created_at,
        } as ReelVideo;
      })
      .filter((item): item is ReelVideo => Boolean(item?.url));
  },

  async getPricing(branch?: string): Promise<Record<string, Record<number, any>>> {
    const query = new URLSearchParams();
    if (branch) query.append("branch", branch);
    query.append("t", Date.now().toString());
    const res = await fetch(`${API_BASE}/pricing?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch pricing");
    return res.json();
  },

  async getDecorationPrice(branch?: string): Promise<number> {
    const query = new URLSearchParams();
    if (branch) query.append("branch", branch);
    query.append("t", Date.now().toString());
    const res = await fetch(`${API_BASE}/decoration-price?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch decoration price");
    const data = await res.json();
    return data.decorationPrice;
  },

  async getAdminGallery(token: string, branch: string, type?: "cake" | "decoration"): Promise<any[]> {
    const params = new URLSearchParams({ branch });
    if (type) params.append("type", type);
    const res = await fetch(`${API_BASE}/admin/gallery?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch gallery");
    return res.json();
  },

  async updateGalleryImage(
    token: string,
    branch: string,
    type: "cake" | "decoration",
    id: string,
    image: string
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/gallery/${type}/${id}?branch=${encodeURIComponent(branch)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ image, branch }),
    });
    if (!res.ok) throw new Error("Failed to update gallery image");
    return res.json();
  },

  async getTestimonials(branch?: string): Promise<TestimonialImage[]> {
    const query = branch ? `?branch=${encodeURIComponent(branch)}` : "";
    const res = await fetch(`${API_BASE}/gallery/testimonials${query}`);
    if (!res.ok) throw new Error("Failed to fetch testimonials");
    return res.json();
  },

  async addTestimonialImage(
    token: string,
    branch: string,
    image: string,
    title?: string,
    date?: string
  ): Promise<TestimonialImage> {
    const res = await fetch(`${API_BASE}/admin/gallery/testimonials?branch=${encodeURIComponent(branch)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ branch, image, title, date }),
    });
    if (!res.ok) throw new Error("Failed to add testimonial image");
    return res.json();
  },

  async deleteTestimonialImage(token: string, branch: string, id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/gallery/testimonials/${id}?branch=${encodeURIComponent(branch)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to delete testimonial image");
  },

  async updateTestimonialImage(token: string, branch: string, id: string, data: { title?: string; image?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/gallery/testimonials/${id}?branch=${encodeURIComponent(branch)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update testimonial");
    return res.json();
  },

  async getGalleryVideos(branch: string): Promise<{ id: string; url: string; title: string }[]> {
    const res = await fetch(`${API_BASE}/admin/gallery/videos?branch=${encodeURIComponent(branch)}`);
    if (!res.ok) throw new Error("Failed to fetch gallery videos");
    return res.json();
  },

  async getGalleryVideoUploadSignature(token: string, branch: string): Promise<{
    signature: string; timestamp: number; folder: string; cloud_name: string; api_key: string;
  }> {
    const res = await fetch(`${API_BASE}/admin/gallery/videos/sign?branch=${encodeURIComponent(branch)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to get upload signature");
    return res.json();
  },

  async saveGalleryVideo(token: string, branch: string, url: string, title?: string): Promise<{ id: string; url: string; title: string }[]> {
    const res = await fetch(`${API_BASE}/admin/gallery/videos?branch=${encodeURIComponent(branch)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ url, title }),
    });
    if (!res.ok) throw new Error("Failed to save gallery video");
    return res.json();
  },

  async updateGalleryVideo(token: string, branch: string, id: string, title: string): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/gallery/videos/${id}?branch=${encodeURIComponent(branch)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error("Failed to update gallery video");
    return res.json();
  },

  async deleteGalleryVideo(token: string, branch: string, id: string): Promise<{ id: string; url: string; title: string }[]> {
    const res = await fetch(`${API_BASE}/admin/gallery/videos/${id}?branch=${encodeURIComponent(branch)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to delete gallery video");
    return res.json();
  },

  async getHeroImages(branch: string): Promise<string[]> {
    const res = await fetch(`${API_BASE}/admin/hero-images?branch=${encodeURIComponent(branch)}`);
    if (!res.ok) throw new Error("Failed to fetch hero images");
    return res.json();
  },

  async addHeroImage(token: string, branch: string, image: string): Promise<string[]> {
    const res = await fetch(`${API_BASE}/admin/hero-images?branch=${encodeURIComponent(branch)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ image }),
    });
    if (!res.ok) throw new Error("Failed to add hero image");
    return res.json();
  },

  async deleteHeroImage(token: string, branch: string, index: number): Promise<string[]> {
    const res = await fetch(`${API_BASE}/admin/hero-images/${index}?branch=${encodeURIComponent(branch)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error("Failed to delete hero image");
    return res.json();
  },

  async getBookingById(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/bookings/${id}`);
    if (!res.ok) throw new Error("Failed to fetch booking details");
    return res.json();
  },

  async createBooking(booking: any) {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(booking),
    });
    if (!res.ok) throw new Error("Failed to create booking");
    return res.json();
  },

  async getAvailableSlots(branchId: string, date: string, service: string, duration: number, isAdmin = false): Promise<{ availableSlots: string[], bookedSlots: string[] }> {
    const params = new URLSearchParams({ duration: String(duration) });
    if (isAdmin) params.set('admin', 'true');
    const res = await fetch(`${API_BASE}/bookings/availability/${branchId}/${date}/${service}?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch available slots");
    const data = await res.json();
    return { availableSlots: data.availableSlots, bookedSlots: data.bookedSlots };
  },

  async adminLogin(password: string): Promise<{ token: string; branch: string }> {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) throw new Error("Invalid password");
    return res.json();
  },

  async sendWhatsAppCampaign(token: string, message: string, image?: string): Promise<{ success: boolean; count: number; error?: string }> {
    const res = await fetch(`${API_BASE}/admin/campaign/whatsapp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message, image }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to send WhatsApp campaign");
    }
    return res.json();
  },

  async getUsers(token: string): Promise<{ name: string; phone: string; firstBooking?: string }[]> {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch users");
    return res.json();
  },

  async getBookings(token: string, branch?: string, status?: string, startDate?: string, endDate?: string): Promise<any[]> {
    let url = `${API_BASE}/bookings`;
    const params = new URLSearchParams();
    if (branch) params.append("branch", branch);
    if (status) params.append("status", status);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch bookings");
    return res.json();
  },

  async getDashboardStats(token: string, branch?: string, startDate?: string, endDate?: string): Promise<any> {
    let url = `${API_BASE}/admin/dashboard/stats`;
    const params = new URLSearchParams();
    if (branch) params.append("branch", branch);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch statistics");
    return res.json();
  },

  async getSocialLinks(branch: string): Promise<any> {
    const res = await fetch(`${API_BASE}/catalog/social-links?branch=${encodeURIComponent(branch)}&t=${Date.now()}`);
    if (!res.ok) throw new Error("Failed to fetch social links");
    return res.json();
  },

  async updateSocialLinks(token: string, branch: string, data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/catalog/social-links?branch=${encodeURIComponent(branch)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const dataRes = await res.json();
    if (!res.ok) {
      console.error("Server Error updating social links:", dataRes);
      throw new Error(dataRes.message || "Failed to update social links");
    }
    return dataRes;
  },

  async getBranchDetails(branch: string): Promise<any> {
    const res = await fetch(`${API_BASE}/catalog/branch-details?branch=${encodeURIComponent(branch)}&t=${Date.now()}`);
    if (!res.ok) throw new Error("Failed to fetch branch details");
    return res.json();
  },

  async updateBranch(token: string, branch: string, data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/catalog/branch-details?branch=${encodeURIComponent(branch)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const dataRes = await res.json();
    if (!res.ok) {
      console.error("Server Error updating branch details:", dataRes);
      throw new Error(dataRes.message || "Failed to update branch details");
    }
    return dataRes;
  },

  async updateBooking(token: string, bookingId: string, data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/bookings/${bookingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update booking");
    return res.json();
  },

  async deleteBooking(token: string, bookingId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/bookings/${bookingId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to delete booking");
    return res.json();
  },

  async deleteMultipleBookings(token: string, ids: string[], code: string): Promise<any> {
    const res = await fetch(`${API_BASE}/bookings/delete-multiple`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ids, code }),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to delete bookings");
    }
    return res.json();
  },

  async initiateRazorpayPayment(bookingId: string, amount: number, phone: string, paymentType: string = 'full', bookingDetails: any = {}): Promise<any> {
    const res = await fetch(`${API_BASE}/payments/razorpay/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        bookingId, 
        amount, 
        phone, 
        paymentType, 
        amountPaid: amount,
        bookingDetails // Include complete booking details for Razorpay notes
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Razorpay API Error:', data);
      throw new Error(data.message || "Failed to initiate Razorpay payment");
    }
    return data;
  },

  async checkRazorpayPaymentStatus(orderId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/payments/razorpay/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    if (!res.ok) throw new Error("Failed to check payment status");
    return res.json();
  },

  async processMockPayment(bookingId: string, amount: number, paymentType: string = 'full'): Promise<any> {
    const res = await fetch(`${API_BASE}/payments/mock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, amountPaid: amount, paymentType }),
    });
    if (!res.ok) throw new Error("Failed to process mock payment");
    return res.json();
  },

  async downloadBookingsExcel(token: string, branch?: string): Promise<void> {
    let url = `${API_BASE}/admin/bookings/download`;
    if (branch) url += `?branch=${branch}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to download bookings file");

    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `bookings_${branch || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  async getReviews(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/reviews`);
    if (!res.ok) throw new Error("Failed to fetch reviews");
    return res.json();
  },

  async addReview(name: string, rating: number, comment: string, branch?: string): Promise<any> {
    const query = branch ? `?branch=${encodeURIComponent(branch)}` : "";
    const res = await fetch(`${API_BASE}/reviews${query}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, rating, comment }),
    });
    if (!res.ok) throw new Error("Failed to add review");
    return res.json();
  },

  async getBranchVideos(branch: string): Promise<BranchVideo[]> {
    const res = await fetch(`${API_BASE}/admin/branch-videos?branch=${encodeURIComponent(branch)}`);
    if (!res.ok) throw new Error("Failed to fetch branch videos");
    const data = await res.json();
    return normalizeBranchVideos(data);
  },

  async getVideoUploadSignature(token: string, branch: string): Promise<{
    signature: string;
    timestamp: number;
    folder: string;
    cloud_name: string;
    api_key: string;
  }> {
    const res = await fetch(`${API_BASE}/admin/branch-videos/sign?branch=${encodeURIComponent(branch)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error("Failed to get upload signature");
    return res.json();
  },

  async uploadVideoToCloudinary(
    file: File,
    sig: { signature: string; timestamp: number; folder: string; cloud_name: string; api_key: string },
    onProgress?: (pct: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sig.api_key);
      formData.append("timestamp", String(sig.timestamp));
      formData.append("signature", sig.signature);
      formData.append("folder", sig.folder);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${sig.cloud_name}/video/upload`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          resolve(data.secure_url);
        } else {
          reject(new Error(`Cloudinary upload failed: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during video upload"));
      xhr.send(formData);
    });
  },

  async saveBranchVideo(token: string, branch: string, url: string, title?: string): Promise<BranchVideo[]> {
    const res = await fetch(`${API_BASE}/admin/branch-videos?branch=${encodeURIComponent(branch)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url, title }),
    });
    if (!res.ok) throw new Error("Failed to save branch video");
    return normalizeBranchVideos(await res.json());
  },

  async updateBranchVideo(token: string, branch: string, id: string, title: string): Promise<BranchVideo[]> {
    const res = await fetch(`${API_BASE}/admin/branch-videos/${encodeURIComponent(id)}?branch=${encodeURIComponent(branch)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error("Failed to update branch video");
    return normalizeBranchVideos(await res.json());
  },

  async deleteBranchVideo(token: string, branch: string, id: string): Promise<BranchVideo[]> {
    const res = await fetch(`${API_BASE}/admin/branch-videos/${encodeURIComponent(id)}?branch=${encodeURIComponent(branch)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to delete branch video");
    return normalizeBranchVideos(await res.json());
  },

  async toggleBranchBookings(token: string, branch: string, enabled: boolean): Promise<void> {
    const res = await fetch(`${API_BASE}/branches/${branch}/bookings-toggle`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ bookingsEnabled: enabled }),
    });
    if (!res.ok) throw new Error("Failed to toggle branch bookings");
  },

  // ── Chunked step loaders ──────────────────────────────────────────────────
  async getStepBranchService(branchId: string): Promise<{
    branches: Branch[];
    pricing: Record<string, Record<any, any>>;
    decorationPrice: number;
  }> {
    const res = await fetch(`${API_BASE}/bookings/step/branch-service/${branchId}?t=${Date.now()}`);
    if (!res.ok) throw new Error("Failed to load branch/service data");
    return res.json();
  },

  async getStepOccasions(): Promise<{ occasions: string[] }> {
    const res = await fetch(`${API_BASE}/bookings/step/occasions`);
    if (!res.ok) throw new Error("Failed to load occasions");
    return res.json();
  },

  async getStepCakes(branchId: string): Promise<{ cakes: CakeOption[] }> {
    const res = await fetch(`${API_BASE}/bookings/step/cakes/${branchId}?t=${Date.now()}`);
    if (!res.ok) throw new Error("Failed to load cakes");
    return res.json();
  },

  async getStepDecorations(branchId: string): Promise<{ decorations: ExtraDecoration[]; decorationPrice: number }> {
    const res = await fetch(`${API_BASE}/bookings/step/decorations/${branchId}?t=${Date.now()}`);
    if (!res.ok) throw new Error("Failed to load decorations");
    return res.json();
  },
};
