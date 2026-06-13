// Prompt builders. Data minimization (PRD §15.5): prompts never include
// patient identifiers, ids, phone or email — only the clinical text itself.

export const NOTE_SYSTEM = `אתה עוזר תיעוד למטפל/ת בתחום בריאות הנפש.
המטרה: להפוך תמליל גולמי של מפגש טיפולי לסיכום מקצועי, מובנה וקריא בעברית.
אל תמציא מידע שלא נאמר. שמור על טון מקצועי ונייטרלי.
אל תכלול שמות מלאים, מספרי טלפון, כתובות או מזהים אישיים — תאר את המטופל כ"המטופל/ת".`;

export function buildNotePrompt(transcript: string): string {
  return `הפוך את התמליל הבא לסיכום מפגש מובנה עם הכותרות הבאות:
**נושאים מרכזיים**, **מהלך המפגש**, **תצפיות קליניות**, **משימות והמשך**.

תמליל:
"""
${transcript}
"""`;
}

export const SUMMARY_SYSTEM = `אתה עוזר קליני. החזר אך ורק JSON תקין לפי הסכימה המבוקשת, בעברית.
אל תכלול מזהים אישיים.`;

export function buildSummaryPrompt(noteText: string): string {
  return `הפק סיכום ביניים מובנה מהטקסט הקליני הבא.
החזר JSON בלבד בשדות: keyTopics (מערך מחרוזות), emotionalState (מחרוזת),
progressIndicators (מחרוזת), observations (מחרוזת).

טקסט:
"""
${noteText}
"""`;
}

export function buildIntentPrompt(transcript: string): string {
  return `מתוך המשפט הקצר הבא, חלץ את שם המטופל ואת התאריך אם הוזכרו.
החזר JSON בלבד: { "patientName": string|null, "date": string|null }
התאריך בפורמט yyyy-mm-dd אם ניתן, אחרת null.

משפט:
"""
${transcript}
"""`;
}
