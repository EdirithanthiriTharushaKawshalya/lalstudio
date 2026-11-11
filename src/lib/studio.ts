export const studioDefaults = {
  name: "LAL STUDIO",
  established: 1982,
  phone: "0782918452",
  international_phone: "+94 78 291 8452",
  email: "lalstudio82@gmail.com",
  address: "Lal Studio, Hatton National Bank, Ambalangoda, Sri Lanka",
  map_destination: "Lal Studio, Hatton National Bank, Ambalangoda, Sri Lanka",
  introduction:
    "LAL STUDIO is one of Ambalangoda’s oldest photography studios. We’ve been part of the town since 1982, photographing everything from family portraits in our studio to wedding days surrounded by loved ones.",
  hero_headline: "For the moments\nyou want to keep.",
  hero_image: "",
  hero_image_key: "",
  hero_image_alt:
    "AI-edited illustrative Sri Lankan bridal portrait beside a staircase in soft black and white",
  timezone: "Asia/Colombo",
  currency: "LKR",
  social_facebook: "",
  social_instagram: "",
  opening_hours: "",
  booking_availability: "",
  gallery_expiry_days: "",
  document_retention_days: "",
};
export type StudioSettings = typeof studioDefaults;
export const services = [
  "Wedding photography",
  "Event photography",
  "Studio portraits",
  "Family & individual portraits",
  "Photo printing",
  "Frames & enlargements",
  "Camera & equipment rentals",
];
export const bookingStatuses = [
  "Pending",
  "Confirmed",
  "Completed",
  "Cancelled",
  "Declined",
] as const;
export const rentalStatuses = [
  "Pending Review",
  "Approved",
  "Ready for Pickup",
  "Collected",
  "Returned",
  "Rejected",
  "Cancelled",
] as const;
export const photos = {
  hero: "/photos/hero-celebration.jpg",
  wedding: "/photos/wedding.jpg",
  portrait: "/photos/sri-lankan-portrait.webp",
  family: "/photos/family.jpg",
  couple: "/photos/couple.jpg",
  event: "/photos/event.jpg",
  camera: "/photos/camera.jpg",
  printing: "/photos/printing-framing.webp",
};
export type Row = {
  id: string;
  [key: string]: string | number | boolean | null | undefined;
};
export const samplePortfolio: Row[] = [
  {
    id: "sample-1",
    title: "A day to remember",
    category: "Weddings",
    description: "The quiet moments. The big feelings. A story told together.",
    thumbnail: photos.wedding,
    featured: true,
    published: true,
    sort_order: 0,
  },
  {
    id: "sample-2",
    title: "Simply, you",
    category: "Portraits",
    description: "Honest portraits, made with a little time and a lot of care.",
    thumbnail: photos.portrait,
    featured: true,
    published: true,
    sort_order: 1,
  },
  {
    id: "sample-3",
    title: "All together now",
    category: "Families",
    description: "The people who make every ordinary day extraordinary.",
    thumbnail: photos.family,
    featured: true,
    published: true,
    sort_order: 2,
  },
  {
    id: "sample-4",
    title: "A celebration of love",
    category: "Weddings",
    description: "A new chapter, surrounded by the people you love.",
    thumbnail: photos.couple,
    featured: true,
    published: true,
    sort_order: 3,
  },
  {
    id: "sample-5",
    title: "An occasion worth keeping",
    category: "Events",
    description: "Little details and shared celebrations.",
    thumbnail: photos.event,
    featured: true,
    published: true,
    sort_order: 4,
  },
];
export const sampleEquipment: Row[] = [
  {
    id: "sample-camera",
    name: "Camera & lens rentals",
    category: "Cameras",
    description:
      "Tell us what you’re creating. Contact the studio for our available camera bodies, lenses and accessories.",
    thumbnail: photos.camera,
    accessories: "Confirm the kit with our team",
    published: true,
  },
];
export function money(value: number | string) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
  }).format(Number(value));
}
export function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(new Date(value));
}
export function localTimestamp(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value))
    throw new Error("Enter a valid date and time.");
  const parsed = new Date(value + "+05:30");
  if (
    !Number.isFinite(parsed.getTime()) ||
    !new Date(parsed.getTime() + 19800000).toISOString().startsWith(value)
  )
    throw new Error("Enter a valid date and time.");
  return parsed.toISOString();
}
