// HTML email templates (Hebrew, RTL).

export function passwordResetEmail(resetUrl: string): {
  subject: string;
  html: string;
} {
  return {
    subject: "איפוס סיסמה — מערכת ניהול טיפולים",
    html: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
      <h2>איפוס סיסמה</h2>
      <p>התקבלה בקשה לאיפוס הסיסמה לחשבונך. הקישור תקף לשעה אחת.</p>
      <p style="margin:24px 0">
        <a href="${resetUrl}" style="background:#1c4ef5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">
          איפוס סיסמה
        </a>
      </p>
      <p style="font-size:13px;color:#64748b">אם לא ביקשת לאפס סיסמה, ניתן להתעלם מהודעה זו.</p>
      <p style="font-size:12px;color:#94a3b8;word-break:break-all">${resetUrl}</p>
    </div>`,
  };
}
