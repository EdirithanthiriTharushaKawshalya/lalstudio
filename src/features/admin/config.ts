import { bookingStatuses, rentalStatuses } from "@/lib/studio";
export type FieldDef = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: readonly string[];
  help?: string;
};
export type SectionDef = {
  title: string;
  table: string;
  description: string;
  columns: string[];
  fields: FieldDef[];
  statuses?: readonly string[];
};
const f = (
  name: string,
  label: string,
  type = "text",
  required = false,
): FieldDef => ({ name, label, type, required });
export const sections: Record<string, SectionDef> = {
  portfolio: {
    title: "Portfolio",
    table: "portfolio",
    description:
      "A considered collection. One photograph, one story, one Facebook album.",
    columns: ["title", "category", "published", "featured", "sort_order"],
    fields: [
      f("title", "Title", "text", true),
      f("description", "Description", "textarea", true),
      {
        ...f("category", "Category", "text", true),
        options: ["Weddings", "Portraits", "Families", "Events"],
      },
      f("event_date", "Event date", "date"),
      f("facebook_url", "Facebook album URL", "url", true),
      f("thumbnail_file", "Thumbnail (JPEG, PNG or WebP, max 5 MB)", "file"),
      f("sort_order", "Display order", "number"),
      f("published", "Published", "checkbox"),
      f("featured", "Featured on home", "checkbox"),
    ],
  },
  bookings: {
    title: "Bookings",
    table: "bookings",
    description: "From the first enquiry to the final photograph.",
    columns: ["reference", "name", "service", "starts_at", "status"],
    statuses: bookingStatuses,
    fields: [
      f("starts_at", "Start · Asia/Colombo", "datetime-local", true),
      f("ends_at", "End · Asia/Colombo", "datetime-local", true),
      { ...f("status", "Status"), options: bookingStatuses },
      f("venue", "Venue"),
      f("quote", "Quote · LKR", "number"),
      f("internal_notes", "Internal notes", "textarea"),
      f(
        "acknowledge_overlap",
        "I reviewed and accept any schedule overlap",
        "checkbox",
      ),
    ],
  },
  rentals: {
    title: "Rentals",
    table: "rentals",
    description:
      "Review requests, verify documents and keep every kit accounted for.",
    columns: ["reference", "name", "starts_at", "ends_at", "status"],
    statuses: rentalStatuses,
    fields: [
      f("starts_at", "Pickup · Asia/Colombo", "datetime-local", true),
      f("ends_at", "Return · Asia/Colombo", "datetime-local", true),
      { ...f("status", "Status"), options: rentalStatuses },
      f("quote", "Rental fees quote · LKR", "number"),
      f("pickup_condition", "Condition at pickup", "textarea"),
      f("return_condition", "Condition at return", "textarea"),
      f("internal_notes", "Internal notes", "textarea"),
    ],
  },
  equipment: {
    title: "Equipment",
    table: "equipment",
    description:
      "Manage catalog listings here. Track each physical copy in Units.",
    columns: ["name", "category", "daily_rate", "deposit", "published"],
    fields: [
      f("name", "Model name", "text", true),
      {
        ...f("category", "Category"),
        options: ["Cameras", "Lenses", "Accessories"],
        required: true,
      },
      f("description", "Description", "textarea"),
      f("accessories", "Included accessories", "textarea"),
      f("daily_rate", "Daily rate · LKR", "number"),
      f("deposit", "Refundable deposit · LKR", "number"),
      f("thumbnail_file", "Catalog photograph · max 5 MB", "file"),
      f("published", "Published", "checkbox"),
    ],
  },
  units: {
    title: "Physical units",
    table: "equipment_units",
    description: "A separate record for each camera, lens and accessory.",
    columns: ["code", "equipment_id", "status", "condition"],
    fields: [
      f("equipment_id", "Catalog item ID", "text", true),
      f("code", "Serial / internal code", "text", true),
      {
        ...f("status", "Unit status"),
        options: ["active", "maintenance", "retired"],
        required: true,
      },
      f("condition", "Condition", "textarea"),
      f("notes", "Notes", "textarea"),
    ],
  },
  inventory: {
    title: "Inventory",
    table: "inventory",
    description:
      "Printing supplies, frames and everything that keeps the studio moving.",
    columns: ["name", "sku", "category", "quantity", "reorder_threshold"],
    fields: [
      f("name", "Item name", "text", true),
      f("category", "Category", "text", true),
      f("sku", "SKU / internal code", "text", true),
      f("variant", "Size / variant"),
      f("unit", "Unit of measurement", "text", true),
      f("reorder_threshold", "Reorder threshold", "number"),
      f("unit_cost", "Unit cost · LKR", "number"),
      f("selling_price", "Selling price · LKR", "number"),
      f("supplier", "Supplier"),
      f("notes", "Notes", "textarea"),
    ],
  },
  finances: {
    title: "Financial Records",
    table: "financial_transactions",
    description:
      "Optional records for income, expenses and deposits you choose to enter. Totals cover recorded entries only, not all studio activity. All amounts in LKR.",
    columns: ["date", "category", "kind", "amount", "description", "voided"],
    fields: [
      f("date", "Date", "date", true),
      {
        ...f("kind", "Type"),
        options: ["Income", "Expense", "Deposit", "Refund"],
        required: true,
      },
      f("category", "Category", "text", true),
      f("amount", "Amount · LKR", "number", true),
      f("description", "Description", "text", true),
      {
        ...f("payment_method", "Payment method"),
        options: ["Cash", "Bank transfer", "Card", "Other"],
        required: true,
      },
      f("booking_id", "Linked booking ID"),
      f("rental_id", "Linked rental ID"),
      f("stock_movement_id", "Linked stock movement ID"),
      f("reference", "Reference number"),
      f("notes", "Notes", "textarea"),
    ],
  },
  galleries: {
    title: "Event Galleries",
    table: "event_galleries",
    description:
      "Private delivery pages for your clients. Photos stay on Facebook and Google Drive.",
    columns: ["title", "client_name", "event_date", "published", "revoked"],
    fields: [
      f("title", "Event title", "text", true),
      f("client_name", "Client display name", "text", true),
      f("description", "Description", "textarea"),
      f("event_date", "Event date", "date"),
      f("studio_message", "Studio message", "textarea"),
      f("cover_file", "Cover image · max 5 MB", "file"),
      f("facebook_url", "Facebook album URL", "url"),
      f("drive_url", "Google Drive URL", "url"),
      f("passcode", "New passcode (leave empty to keep existing)", "password"),
      f("remove_passcode", "Remove existing passcode", "checkbox"),
      f("expires_at", "Expires · Asia/Colombo", "datetime-local"),
      f("published", "Published", "checkbox"),
      f("revoked", "Revoke client access", "checkbox"),
      f(
        "regenerate",
        "Regenerate share token (old link stops working)",
        "checkbox",
      ),
    ],
  },
  calendar: {
    title: "Master Calendar",
    table: "manual_entries",
    description:
      "Bookings, rentals and studio time, together. Asia/Colombo · UTC+05:30.",
    columns: ["title", "starts_at", "ends_at", "kind"],
    fields: [
      f("title", "Title", "text", true),
      f("starts_at", "Start · Asia/Colombo", "datetime-local", true),
      f("ends_at", "End · Asia/Colombo", "datetime-local", true),
      {
        ...f("kind", "Entry type"),
        options: ["Appointment", "Blocked"],
        required: true,
      },
      f("notes", "Notes", "textarea"),
    ],
  },
};
sections.rentals.fields.push({
  name: "assigned_unit_ids",
  label: "Assign specific unit IDs (comma separated)",
  help: "Optional before collection. Leave empty to keep eligible assigned units or allocate automatically.",
});
sections.services = {
  title: "Service descriptions & prices",
  table: "services",
  description:
    "Prices remain unset until supplied by the studio. Changes update the public services page.",
  columns: ["name", "price", "published"],
  fields: [
    { name: "description", label: "Description", type: "textarea" },
    {
      name: "price",
      label: "Price · LKR (leave empty for contact pricing)",
      type: "number",
    },
    { name: "published", label: "Published", type: "checkbox" },
  ],
};
