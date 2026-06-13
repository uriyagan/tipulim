import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { isAiConfigured } from "@/lib/ai";
import VoiceSessionWizard from "@/components/VoiceSessionWizard";

export const dynamic = "force-dynamic";

export default async function VoiceSessionPage() {
  await requireSession();
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href="/sessions/new" className="text-sm text-brand-600">
        ← יצירה ידנית
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">תיעוד מפגש מהקלטה</h1>
        <p className="text-sm text-slate-500">
          הקלטת סיכום של מפגש שהתקיים — תמלול וסיכום ב‑AI, ושיוך לתיק המטופל
          לאחר אישור ידני.
        </p>
      </div>
      <VoiceSessionWizard aiConfigured={isAiConfigured()} />
    </div>
  );
}
