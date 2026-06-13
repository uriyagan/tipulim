"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ReauthDialog from "./ReauthDialog";
import {
  archivePatientAction,
  restorePatientAction,
  deletePatientAction,
} from "@/app/(app)/patients/actions";

// Archive / restore / permanent-delete controls. Permanent deletion is only
// offered for archived patients and requires re-auth (PRD §6).
export default function PatientDangerActions({
  patientId,
  status,
}: {
  patientId: string;
  status: "ACTIVE" | "ARCHIVED";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showReauth, setShowReauth] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDelete = () => {
    startTransition(async () => {
      const res = await deletePatientAction(patientId);
      if (res?.error === "REAUTH_REQUIRED") {
        setShowReauth(true);
      } else if (res?.error) {
        setError(res.error);
      }
      // On success the action redirects to /patients.
    });
  };

  return (
    <div className="space-y-3">
      {status === "ACTIVE" ? (
        <button
          className="btn-secondary w-full"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await archivePatientAction(patientId);
              router.refresh();
            })
          }
        >
          העברה לארכיון
        </button>
      ) : (
        <>
          <button
            className="btn-secondary w-full"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await restorePatientAction(patientId);
                router.refresh();
              })
            }
          >
            שחזור מהארכיון
          </button>

          {!confirmDelete ? (
            <button
              className="btn-danger w-full"
              onClick={() => setConfirmDelete(true)}
            >
              מחיקה לצמיתות
            </button>
          ) : (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="mb-2 text-sm text-red-800">
                מחיקה לצמיתות אינה ניתנת לשחזור. להמשיך?
              </p>
              <div className="flex gap-2">
                <button
                  className="btn-danger"
                  disabled={pending}
                  onClick={runDelete}
                >
                  כן, מחק לצמיתות
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setConfirmDelete(false)}
                >
                  ביטול
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}

      <ReauthDialog
        open={showReauth}
        onClose={() => setShowReauth(false)}
        onSuccess={() => {
          setShowReauth(false);
          runDelete();
        }}
        description="מחיקת מטופל לצמיתות דורשת אימות מחדש."
      />
    </div>
  );
}
