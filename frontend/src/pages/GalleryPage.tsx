import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useSearchParams } from "react-router-dom";
import { branchDetails } from "@/data/branch-details";

const GalleryPage = () => {
  const [searchParams] = useSearchParams();
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>(searchParams.get("branch") || "branch-1");
  const [loading, setLoading] = useState(true);

  const [galleryImages, setGalleryImages] = useState<
    { id: string; src: string; alt: string; title: string; date: string }[]
  >([]);

  useEffect(() => {
    const loadGallery = async () => {
      try {
        setLoading(true);
        const testimonials = await api.getTestimonials(selectedBranch);
        const mapped = testimonials.map((item) => ({
          id: item.id,
          src: item.image || "",
          alt: item.title || "Testimonial",
          title: item.title || "Customer Memory",
          date: item.date || "Recent",
        }));
        setGalleryImages(mapped);
      } catch (error) {
        console.error("Failed to load gallery:", error);
      } finally {
        setLoading(false);
      }
    };
    loadGallery();
  }, [selectedBranch]);

  const handlePrevious = () => {
    if (selectedImage !== null) {
      setSelectedImage(selectedImage === 0 ? galleryImages.length - 1 : selectedImage - 1);
    }
  };

  const handleNext = () => {
    if (selectedImage !== null) {
      setSelectedImage(selectedImage === galleryImages.length - 1 ? 0 : selectedImage + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4">

        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="font-display text-4xl italic text-primary mb-4">Gallery</h1>
          <p className="text-lg text-muted-foreground">Explore memories from our past events</p>

          {/* Branch selector */}
          <div className="mt-4 flex justify-center">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="rounded-full border border-border bg-muted px-6 py-3 text-m font-semibold text-foreground focus:border-primary focus:outline-none transition-all hover:border-primary/50"
            >
              {branchDetails.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name.split("-")[1]?.trim() || branch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Images / Videos toggle removed — gallery shows images only */}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Loading gallery...</div>
        ) : galleryImages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No images uploaded yet for this branch.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleryImages.map((image, index) => (
              <div
                key={image.id}
                onClick={() => setSelectedImage(index)}
                className="group relative overflow-hidden rounded-2xl cursor-pointer bg-muted aspect-square border border-border hover:border-primary/50 transition-all"
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-end p-4">
                  <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <h3 className="font-semibold">{image.title}</h3>
                    <p className="text-sm text-gray-200">{image.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lightbox Modal (images only) */}
        {selectedImage !== null && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <div className="relative max-w-4xl w-full">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
              >
                <X className="h-8 w-8" />
              </button>
              <img
                src={galleryImages[selectedImage].src}
                alt={galleryImages[selectedImage].alt}
                className="w-full max-h-[80vh] object-contain rounded-lg"
              />
              <div className="mt-4 text-center text-white">
                <h3 className="text-xl font-semibold">{galleryImages[selectedImage].title}</h3>
                <p className="text-gray-300">{galleryImages[selectedImage].date}</p>
              </div>
              <div className="flex justify-between items-center mt-6">
                <Button onClick={handlePrevious} variant="outline" size="icon" className="bg-white/10 border-white/20 hover:bg-white/20">
                  <ChevronLeft className="h-6 w-6 text-white" />
                </Button>
                <span className="text-white text-sm">{selectedImage + 1} / {galleryImages.length}</span>
                <Button onClick={handleNext} variant="outline" size="icon" className="bg-white/10 border-white/20 hover:bg-white/20">
                  <ChevronRight className="h-6 w-6 text-white" />
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default GalleryPage;
