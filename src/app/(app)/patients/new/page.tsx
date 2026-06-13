import Link from "next/link";
import { createPatientAction } from "../actions";
import PatientForm from "@/components/PatientForm";

export default function NewPatientPage() {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href="/patients" className="text-sm text-brand-600">
        ← חזרה למטופלים
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">מטופל חדש</h1>
      <PatientForm action={createPatientAction} submitLabel="יצירת מטופל" />
    </div>
  );
}
