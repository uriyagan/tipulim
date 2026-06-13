import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-3xl font-bold text-slate-900">404</h1>
      <p className="text-slate-500">הדף המבוקש לא נמצא.</p>
      <Link href="/dashboard" className="btn-primary">
        חזרה ללוח הבקרה
      </Link>
    </main>
  );
}
