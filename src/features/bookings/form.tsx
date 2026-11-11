import { randomUUID } from "node:crypto";
import { ActionForm, Field, Check } from "@/components/ui/form";
import { submitBooking } from "./actions";
import Link from "next/link";
export function BookingForm({
  services,
  preferredDate,
}: {
  services: string[];
  preferredDate?: string;
}) {
  return (
    <ActionForm action={submitBooking} submit="Send booking request ↗">
      <input type="hidden" name="request_id" value={randomUUID()} />
      <label className="honeypot" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <div className="form-grid">
        <Field label="Your name" name="name" required />
        <Field label="Phone number" name="phone" type="tel" required />
        <Field label="Email address" name="email" type="email" required />
        <Field
          label="What can we photograph?"
          name="service"
          options={services}
          required
        />
        <Field
          label="Preferred date & start time · Sri Lanka"
          name="starts_at"
          type="datetime-local"
          value={preferredDate ? `${preferredDate}T09:00` : undefined}
          required
        />
        <Field
          label="Estimated duration · hours"
          name="duration"
          type="number"
          value={1}
          min={0.5}
          max={72}
          step="0.5"
          required
        />
      </div>
      <Field label="Venue / location" name="venue" />
      <Field
        label="Anything else you’d like us to know?"
        name="requirements"
        type="textarea"
      />
      <Check name="privacy">
        I have read the <Link href="/privacy">privacy information</Link> and
        acknowledge the use of these details to manage my request.
      </Check>
      <p className="muted small">
        This is a request, not a confirmed reservation. We’ll be in touch to
        plan the details.
      </p>
    </ActionForm>
  );
}
