"use client";

import { useActionState } from "react";
import { signInAdmin } from "../../app/admin/actions";

export default function AdminLoginForm() {
  const [state, action, pending] = useActionState(signInAdmin, {});

  return (
    <form action={action} className="admin-login-form">
      <label>
        Admin email
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue="aman.velorion@gmail.com"
        />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {state.error && <p className="admin-error" role="alert">{state.error}</p>}
      <button className="admin-button admin-button-primary" disabled={pending}>
        {pending ? "Signing in…" : "Sign in securely"}
      </button>
    </form>
  );
}
