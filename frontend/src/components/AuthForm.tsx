import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";

interface AuthFormProps {
  mode: "login" | "register";
  onSuccess: () => void;
}

export const AuthForm = ({ mode, onSuccess }: AuthFormProps) => {
  const isLogin = mode === "login";
  const { login, register, authLoading, authError, clearAuthError } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const success = isLogin
      ? await login(email, password)
      : await register(username, email, password);
    if (success) onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm font-sans">
      <h1 className="text-2xl font-semibold text-primary tracking-tight">
        {isLogin ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-2 text-sm text-secondary">
        {isLogin
          ? "Sign in to manage access requests."
          : "Access, but never permanent."}
      </p>

      <div className="mt-8 space-y-4">
        {!isLogin && (
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-medium text-secondary mb-1.5"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                clearAuthError();
              }}
              required
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-primary placeholder:text-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="jane_doe"
            />
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium text-secondary mb-1.5"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearAuthError();
            }}
            required
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-primary placeholder:text-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            placeholder="you@company.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium text-secondary mb-1.5"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearAuthError();
            }}
            required
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-primary placeholder:text-muted outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            placeholder="••••••••"
          />
        </div>
      </div>

      {authError && (
        <div className="mt-4 rounded-lg border border-danger/20 bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
          {authError}
        </div>
      )}

      <button
        type="submit"
        disabled={authLoading}
        className="mt-6 w-full rounded-lg bg-surface-raised px-4 py-2.5 cursor-pointer text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {authLoading ? "Please wait..." : isLogin ? "Login" : "Create account"}
      </button>
    </form>
  );
};
