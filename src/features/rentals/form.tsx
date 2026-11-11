import { randomUUID } from "node:crypto";
import Link from "next/link";
import { ActionForm, Field, Check } from "@/components/ui/form";
import { submitRental } from "./actions";
import type { Row } from "@/lib/studio";
export function RentalRequestForm({
  equipment,
  phone,
}: {
  equipment: Row;
  phone: string;
}) {
  return (
    <ActionForm
      action={submitRental}
      submit="Send rental request ↗"
      successAction={{
        href: `tel:${phone.replace(/\s/g, "")}`,
        label: `Call ${phone} to confirm availability`,
      }}
    >
      <h3>Request {String(equipment.name)}</h3>
      <input type="hidden" name="request_id" value={randomUUID()} />
      <label className="honeypot" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} />
      </label>
      <Field
        label="Quantity"
        name={`qty_${equipment.id}`}
        type="number"
        value={1}
        min={1}
        max={20}
        required
      />
      {equipment.id.startsWith("sample") && (
        <p className="message">
          The live equipment catalog has not been supplied. Contact the studio
          for available models.
        </p>
      )}
      <div className="form-grid">
        <Field
          name="starts_at"
          label="Pickup · Sri Lanka time"
          type="datetime-local"
          required
        />
        <Field
          name="ends_at"
          label="Return · Sri Lanka time"
          type="datetime-local"
          required
        />
        <Field name="name" label="Your full name" required />
        <Field name="phone" label="Phone" type="tel" required />
        <Field name="email" label="Email" type="email" required />
        <Field name="address" label="Home address" required />
      </div>
      <Field name="notes" label="Notes" type="textarea" />
      <h3>Identity verification</h3>
      <p className="muted small">
        To protect the studio’s equipment, staff manually check your ID and
        selfie. These files are stored privately and are accessible only to
        authorized staff. Ask the studio about the retention period before
        sending your documents. JPEG, PNG or WebP · maximum 5 MB each.
      </p>
      <div className="form-grid">
        <Field name="id_front" label="ID · front" type="file" required />
        <Field name="id_back" label="ID · back" type="file" required />
        <Field name="selfie" label="Your selfie" type="file" required />
      </div>
      <Check name="privacy">
        I acknowledge the identity verification and have read the{" "}
        <Link href="/privacy">privacy information</Link>.
      </Check>
      <p className="small muted">
        After submitting, call {phone} with your request reference to confirm
        availability. Sending this form does not reserve equipment.
      </p>
    </ActionForm>
  );
}
