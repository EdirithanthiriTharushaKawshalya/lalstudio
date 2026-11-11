import { ActionForm, Field, Check } from "@/components/ui/form";
import type { Row } from "@/lib/studio";
import { dateTime } from "@/lib/studio";
import { advanceRental } from "./actions";

export function RentalWorkflow({ rental }: { rental: Row }) {
  const stage = String(rental.status);
  const next =
    stage === "Pending Review"
      ? "Approved"
      : stage === "Approved"
        ? "Ready for Pickup"
        : stage === "Ready for Pickup"
          ? "Collected"
          : stage === "Collected"
            ? "Returned"
            : undefined;
  return (
    <section className="editor-panel rental-workflow">
      <h3>Confirmation, handover & return</h3>
      <p className="small muted">
        Request → phone confirmation & approval → ready for pickup → handed to
        client → returned. Financial entries are optional at every step.
      </p>
      {rental.phone_confirmed_at && (
        <p className="small">
          Phone confirmation: {dateTime(String(rental.phone_confirmed_at))}
        </p>
      )}
      {rental.collected_at && (
        <p className="small">
          Handed to client: {dateTime(String(rental.collected_at))}
          <br />
          Recorded by staff: {String(rental.handed_over_by)}
        </p>
      )}
      {rental.returned_at && (
        <p className="small">
          Returned: {dateTime(String(rental.returned_at))}
          <br />
          Recorded by staff: {String(rental.returned_by)}
        </p>
      )}
      {next ? (
        <ActionForm
          key={stage}
          action={advanceRental.bind(null, rental.id, next)}
          submit={
            next === "Approved"
              ? "Approve after phone confirmation"
              : next === "Ready for Pickup"
                ? "Mark ready for pickup"
                : next === "Collected"
                  ? "Record handover to client"
                  : "Record equipment return"
          }
        >
          {next === "Collected" && (
            <Field
              name="condition"
              label="Equipment condition at handover"
              type="textarea"
              required
            />
          )}
          {next === "Returned" && (
            <Field
              name="condition"
              label="Equipment condition on return"
              type="textarea"
              required
            />
          )}
          <Check name="confirmed">
            {next === "Approved"
              ? "I spoke with the client, reviewed their identity documents and confirmed availability."
              : next === "Ready for Pickup"
                ? "The assigned equipment is prepared for collection."
                : next === "Collected"
                  ? "I have physically handed the assigned equipment to this client."
                  : "The client has returned the assigned equipment and I have checked its condition."}
          </Check>
        </ActionForm>
      ) : (
        <p className="small muted">
          {stage === "Returned"
            ? "This rental is returned. No further handover action is needed."
            : "This request is closed. No equipment handover is active."}
        </p>
      )}
    </section>
  );
}
