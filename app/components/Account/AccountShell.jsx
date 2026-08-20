export function AccountShell({ children }) {
  return (
    <div
      className="flex items-center justify-center bg-bone px-6 py-16 md:px-8"
      style={{ minHeight: "calc(100dvh - var(--nav-height) - var(--stripe-height))" }}
    >
      <div className="w-full max-w-md rounded-sm border border-pine/15 bg-paper p-8 md:p-10">
        {children}
      </div>
    </div>
  );
}
