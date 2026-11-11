"use client";
import { useActionState } from "react";
import { Button } from "./button";
export type ActionState = {
  error?: string;
  success?: string;
  reference?: string;
};
export type FormAction = (
  state: ActionState,
  form: FormData,
) => Promise<ActionState>;
export function ActionForm({
  action,
  children,
  submit = "Save changes",
  className = "",
  confirm,
  variant = "primary",
  successAction,
}: {
  action: FormAction;
  children: React.ReactNode;
  submit?: string;
  className?: string;
  confirm?: string;
  variant?: "primary" | "secondary" | "destructive";
  successAction?: { href: string; label: string };
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      className={`form ${className}`}
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      <div aria-live="polite">
        {state.error && (
          <p className="message error" role="alert">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="message success">
            {state.success}
            {state.reference && (
              <>
                <br />
                Reference: <strong>{state.reference}</strong>
              </>
            )}
          </p>
        )}
        {state.success && successAction && (
          <Button href={successAction.href}>{successAction.label}</Button>
        )}
      </div>
      <Button disabled={pending} type="submit" variant={variant}>
        {pending ? "Please wait…" : submit}
      </Button>
    </form>
  );
}
export function Field({
  label,
  name,
  type = "text",
  required,
  value,
  options,
  choices,
  help,
  min,
  max,
  step,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  value?: string | number;
  options?: readonly string[];
  choices?: { value: string; label: string }[];
  help?: string;
  min?: string | number;
  max?: string | number;
  step?: string;
  autoComplete?: string;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required && " *"}
      </span>
      {options || choices ? (
        <select name={name} defaultValue={value ?? ""} required={required}>
          <option value="">Select an option</option>
          {options?.map((x) => (
            <option key={x}>{x}</option>
          ))}
          {choices?.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          name={name}
          defaultValue={value}
          required={required}
          rows={4}
          maxLength={5000}
        />
      ) : (
        <input
          name={name}
          type={type}
          autoComplete={autoComplete}
          defaultValue={type === "file" ? undefined : value}
          required={required}
          min={min}
          max={max}
          step={step}
          maxLength={type === "file" ? undefined : 5000}
          accept={
            type === "file" ? "image/jpeg,image/png,image/webp" : undefined
          }
        />
      )}
      {help && <small>{help}</small>}
    </label>
  );
}
export function Check({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <label className="check">
      <input type="checkbox" name={name} required />
      <span>{children}</span>
    </label>
  );
}
