"use client";

import { useState, useCallback } from "react";
import ReauthDialog from "./ReauthDialog";
import { getPatientPersonalData } from "@/app/(app)/patients/personal-actions";

// Reveals encrypted patient contact details only after re-authentication
// (PRD §6, §15.3). Data is fetched on demand and never rendered server-side.
export default function PatientPersonalData({
  patientId,
}: {
  patientId: string;
}) {
  const [data, setData] = useState<{
    fullName: string;
    phone: string | null;
    email: string | null;
  } | null>(null);
  const [showReauth, setShowReauth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getPatientPersonalData(patientId);
    setLoading(false);
    if (res.ok) {
      setData({ fullName: res.fullName, phone: res.phone, email: res.email });
      return true;
    }
    if (res.reason === "REAUTH_REQUIRED") {
      setShowReauth(true);
    } else {
      setError("מטופל לא נמצא");
    }
    return false;
  }, [patientId]);

  if (data) {
    return (
      <dl className="space-y-2 text-sm">
        <div className="flex gap-2">
          <dt className="w-20 text-slate-500">שם מלא</dt>
          <dd className="font-medium">{data.fullName}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 text-slate-500">טלפון</dt>
          <dd dir="ltr" className="font-medium">
            {data.phone || "—"}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 text-slate-500">אימייל</dt>
          <dd dir="ltr" className="font-medium">
            {data.email || "—"}
          </dd>
        </div>
      </dl>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">
        פרטי הקשר מוצפנים. צפייה דורשת אימות מחדש.
      </p>
      <button
        className="btn-secondary"
        onClick={fetchData}
        disabled={loading}
      >
        {loading ? "טוען…" : "🔒 הצג פרטים אישיים"}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

      <ReauthDialog
        open={showReauth}
        onClose={() => setShowReauth(false)}
        onSuccess={() => {
          setShowReauth(false);
          void fetchData();
        }}
        description="צפייה בפרטים אישיים של מטופל דורשת אימות מחדש."
      />
    </div>
  );
}
