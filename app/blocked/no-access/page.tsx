const codes = [
  ["200", "OK", "Request succeeded; message was encrypted and sent successfully."],
  ["201", "Created", "New encrypted message was created and stored securely."],
  ["202", "Accepted", "Request accepted; encryption in progress; may be long-running."],
  ["204", "No Content", "Message encrypted and sent, but no body returned."],
  ["400", "Bad Request", "Request failed due to invalid or missing encryption parameters."],
  ["401", "Unauthorized", "Client lacks valid encryption keys or credentials."],
  ["403", "Forbidden", "Server refuses to encrypt or send the message, such as policy violation."],
  ["404", "Not Found", "Message or recipient not found; encryption cannot proceed."],
  ["409", "Conflict", "Encryption failed due to conflicting keys or message state."],
  ["415", "Unsupported Media Type", "Requested encryption format is not supported."],
  ["500", "Internal Server Error", "Server failed to encrypt or send the message."],
  ["503", "Service Unavailable", "Encryption service is temporarily unavailable."],
  ["504", "Gateway Timeout", "Encryption request timed out."],
];

export default async function BlockedPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const activeCode = params.code ?? "401";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-panel-strong w-full max-w-5xl rounded-[2.5rem] p-8">
        <div className="inline-flex size-14 items-center justify-center rounded-[1.75rem] bg-rose-400/20 text-xl font-bold text-rose-100">
          XT
        </div>
        <h1 className="mt-6 text-4xl font-semibold">Access Blocked</h1>
        <p className="mt-3 text-sm text-slate-300">
          xThat could not verify encryption or access security.
        </p>
        <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          Failed code: <strong className="font-semibold text-red-300">{activeCode}</strong>
          {params.reason ? ` (${params.reason})` : ""}
        </div>

        <div className="mt-6 overflow-hidden rounded-[2rem] border border-white/10">
          {codes.map(([code, label, description]) => (
            <div
              key={code}
              className={`grid gap-3 border-b border-white/10 px-4 py-4 md:grid-cols-[120px_180px_1fr] ${
                code === activeCode ? "bg-rose-400/10" : "bg-white/5"
              }`}
            >
              <div className={code === activeCode ? "font-bold text-red-300" : "font-semibold"}>
                {code}
              </div>
              <div className="font-medium">{label}</div>
              <div className="text-sm text-slate-300">{description}</div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-slate-400">
          Real transport encryption comes from HTTPS and Cloudflare Tunnel or Access. This xThat
          page only reports whether the required app-level security checks passed.
        </p>
      </div>
    </div>
  );
}
