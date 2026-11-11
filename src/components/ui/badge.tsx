export function Badge({ children }: { children: React.ReactNode }) {
  const s = String(children);
  return (
    <span
      className={`badge ${/Pending|Review/.test(s) ? "amber" : /Confirmed|Approved|Completed|Returned|Ready|active/.test(s) ? "green" : /Cancel|Reject|Declin|retired/.test(s) ? "red" : ""}`}
    >
      {children}
    </span>
  );
}
