import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Capture impersonation one-time code from URL, exchange for access token, store in sessionStorage
try {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('impersonationCode');
  if (code) {
    fetch('/api/impersonation/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then(({ accessToken }) => {
        sessionStorage.setItem('impersonationToken', accessToken);
      })
      .catch(() => {
        // Best-effort; if exchange fails, ensure no stale token
        sessionStorage.removeItem('impersonationToken');
      })
      .finally(() => {
        url.searchParams.delete('impersonationCode');
        window.history.replaceState({}, document.title, url.toString());
      });
  }
} catch {}

createRoot(document.getElementById("root")!).render(<App />);
