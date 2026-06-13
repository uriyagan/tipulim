"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Client-side inactivity auto-logout (PRD §15.2). After `minutes` with no
// user activity, the session is destroyed and the user returns to /login.
export default function IdleLogout({
  minutes,
  onLogout,
}: {
  minutes: number;
  onLogout: () => Promise<void>;
}) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const ms = minutes * 60 * 1000;

    const doLogout = async () => {
      await onLogout();
      router.push("/login");
    };

    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(doLogout, ms);
    };

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [minutes, onLogout, router]);

  return null;
}
