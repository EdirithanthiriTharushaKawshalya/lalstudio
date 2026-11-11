import type { Metadata } from "next";
import { settings } from "@/lib/data";
export const metadata: Metadata = { title: "Privacy information" };
export default async function Privacy() {
  const s = await settings();
  return (
    <section className="section inner-page prose privacy">
      <span className="eyebrow">YOUR INFORMATION, WITH CARE</span>
      <h1>Privacy information.</h1>
      <h2>Who we are</h2>
      <p>
        LAL STUDIO, {s.address}. Contact{" "}
        <a href={`mailto:${s.email}`}>{s.email}</a> or {s.international_phone}{" "}
        with questions or a request to access, correct or delete your
        information.
      </p>
      <h2>Booking and rental requests</h2>
      <p>
        We collect your name, contact details, preferred dates, venue, equipment
        selection and requirements to respond to requests, plan work and manage
        our records. A request does not automatically confirm a booking or
        rental.
      </p>
      <h2>Identity documents</h2>
      <p>
        Rental requests ask for the front and back of your ID and a selfie to
        help staff manually verify identity and protect equipment. Documents are
        kept in private storage; only authorized studio staff can access
        temporary viewing links. Do not send documents for anyone else without
        their authority.
      </p>
      <p>
        {s.document_retention_days
          ? `Verification documents are scheduled for removal ${s.document_retention_days} days after upload.`
          : "The studio has not yet confirmed its document retention period. Contact the studio before uploading identity documents."}
      </p>
      <h2>Client galleries and outside services</h2>
      <p>
        Delivery pages may contain a client display name, event details and
        cover photograph. Private links may be passcode protected and can expire
        or be revoked. Facebook and Google Drive control permissions for
        photographs hosted on their platforms. Anyone who receives a shared link
        may be able to use it, subject to those permissions.
      </p>
      <h2>Access, storage and cookies</h2>
      <p>
        Authorized studio staff use this information to manage studio
        operations. Supabase provides database, authentication and storage
        infrastructure. Essential cookies keep staff signed in and remember
        successful gallery access. This application does not add advertising
        trackers.
      </p>
      <h2>Policies to confirm before launch</h2>
      <p>
        The owner must confirm document and client-record retention,
        cancellation and refund terms, deposits, late returns, identity checks,
        photo publication consent, third-party processing arrangements and how
        privacy requests will be handled. Opening hours and prices must also be
        supplied. This page should be reviewed against the studio’s actual
        practices before live collection begins.
      </p>
    </section>
  );
}
