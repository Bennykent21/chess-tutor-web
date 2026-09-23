import { useState } from "react";
import { Mail, Lock, LogIn, UserPlus, X } from "lucide-react";
import { signInWithPassword, signUpWithPassword } from "../lib/cloud";

export function AuthModal({
  initialMode = "signIn",
  onClose
}: {
  initialMode?: "signIn" | "signUp";
  onClose: () => void;
}) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    setMessage("");
    if (!email.trim() || password.length < 6) {
      setMessage("Enter a valid email and a password with at least 6 characters.");
      return;
    }

    setBusy(true);
    const result = mode === "signIn"
      ? await signInWithPassword(email.trim(), password)
      : await signUpWithPassword(email.trim(), password);
    setBusy(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "signUp") {
      setMessage("Account created. Check your email if confirmation is enabled, then sign in.");
      setMode("signIn");
      return;
    }

    onClose();
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-card auth-card" onMouseDown={event => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="surface-label">CHESS TUTOR ACCOUNT</span>
            <h2>{mode === "signIn" ? "Sign in to sync progress" : "Create your tutor account"}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={17} /></button>
        </div>

        <p className="auth-intro">
          Your training can run locally without an account. Signing in adds cross-device progress, review history, and game records.
        </p>

        <label className="field">
          <span><Mail size={14} /> Email</span>
          <input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" />
        </label>

        <label className="field">
          <span><Lock size={14} /> Password</span>
          <input type="password" autoComplete={mode === "signIn" ? "current-password" : "new-password"} value={password} onChange={event => setPassword(event.target.value)} placeholder="Minimum 6 characters" />
        </label>

        {message && <div className="auth-message">{message}</div>}

        <button className="brass-button full" onClick={submit} disabled={busy}>
          {mode === "signIn" ? <LogIn size={16} /> : <UserPlus size={16} />}
          {busy ? "Working…" : mode === "signIn" ? "Sign in" : "Create account"}
        </button>

        <button className="text-action auth-switch" onClick={() => { setMode(mode === "signIn" ? "signUp" : "signIn"); setMessage(""); }}>
          {mode === "signIn" ? "Create a new account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
