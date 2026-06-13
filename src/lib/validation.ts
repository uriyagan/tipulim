import { z } from "zod";

// Input validation schemas (shared by server actions / API).

export const loginSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
  password: z.string().min(1, "נדרשת סיסמה"),
});

export const reauthSchema = z.object({
  password: z.string().min(1, "נדרשת סיסמה"),
});

export const forgotSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
});

export const resetSchema = z.object({
  token: z.string().min(10, "טוקן לא תקין"),
  password: z.string().min(8, "סיסמה חייבת לכלול לפחות 8 תווים"),
});

export const patientSchema = z.object({
  firstName: z.string().trim().min(1, "נדרש שם פרטי"),
  lastName: z.string().trim().min(1, "נדרש שם משפחה"),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("כתובת אימייל לא תקינה")
    .optional()
    .or(z.literal("")),
});

export const sessionSchema = z.object({
  patientId: z.string().min(1, "נדרש מטופל"),
  // ISO date-time string from the form (datetime-local).
  sessionDate: z.string().min(1, "נדרש תאריך מפגש"),
  durationMin: z.coerce.number().int().min(5).max(600).default(50),
  tags: z.array(z.string()).default([]),
});

export const sessionUpdateSchema = z.object({
  sessionDate: z.string().min(1).optional(),
  durationMin: z.coerce.number().int().min(5).max(600).optional(),
  status: z
    .enum(["SCHEDULED", "COMPLETED", "MISSING_NOTE", "PROCESSING_AI"])
    .optional(),
  invoiceStatus: z.enum(["NOT_ISSUED", "ISSUED", "VIEWED"]).optional(),
  tags: z.array(z.string()).optional(),
});

export const noteSchema = z.object({
  sessionId: z.string().min(1),
  content: z.string().trim().min(1, "נדרש תוכן"),
});

export type PatientInput = z.infer<typeof patientSchema>;
export type SessionInput = z.infer<typeof sessionSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
