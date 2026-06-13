"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReauthDialog from "./ReauthDialog";

// Inline gate shown when a page requires an elevated (re-authenticated)
// session before rendering sensitive content. On success it refreshes the
// route so the server component can re-render with the data.
export default function ReauthGate({
  title = "נדרש אימות מחדש",
  description = "פעולה זו דורשת הזנת סיסמה מחדש.",
}: {
  title?: string;
  description?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="card text-center">
      <p className="mb-4 text-sm text-slate-600">{description}</p>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        🔒 אימות מחדש
      </button>
      <ReauthDialog
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          router.refresh();
        }}
        title={title}
        description={description}
      />
    </div>
  );
}
