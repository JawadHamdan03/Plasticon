import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, Eye, EyeOff, Factory, ArrowRight, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { loginSchema, type LoginInput } from "../../lib/validations";

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: true },
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError("");
    try {
      await signIn({ email: data.email.trim(), password: data.password });
      if (data.rememberMe) localStorage.setItem("plasticon_remember_me", "true");
      else localStorage.removeItem("plasticon_remember_me");
      navigate("/dashboard");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Invalid email or password");
    }
  };

  return (
    <div className="auth-root">
      {/* Illustration side */}
      <div className="auth-illustration">
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", color: "#fff" }}>
          <div
            style={{
              width: 88,
              height: 88,
              background: "rgba(255,255,255,.15)",
              borderRadius: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 2rem",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,.2)",
            }}
          >
            <Factory size={44} color="#fff" />
          </div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 900, margin: "0 0 .75rem", lineHeight: 1.15 }}>
            Plasticon Factory
          </h1>
          <p style={{ fontSize: "1rem", opacity: 0.8, margin: "0 auto", maxWidth: 300, lineHeight: 1.6 }}>
            Manage production, inventory, payroll, and more — all in one place.
          </p>

          <div style={{ marginTop: "3rem", display: "flex", flexDirection: "column", gap: "1rem", textAlign: "left", maxWidth: 300, margin: "3rem auto 0" }}>
            {[
              "Real-time production tracking",
              "Role-based access for every team member",
              "Automated payroll & attendance",
              "Smart inventory management",
            ].map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: ".75rem", color: "rgba(255,255,255,.92)", fontSize: ".9rem" }}>
                <span style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "var(--orange-500)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, fontSize: ".7rem", fontWeight: 800,
                }}>✓</span>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="auth-form-side">
        <div className="auth-card">
          {/* Logo */}
          <div className="auth-card__logo">
            <div style={{
              width: 44, height: 44,
              background: "var(--orange-500)",
              borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(249,115,22,.3)",
            }}>
              <Factory size={24} color="#fff" />
            </div>
            <span className="auth-card__logo-text" style={{ color: "var(--text-primary)" }}>Plasticon</span>
          </div>

          {/* Heading */}
          <div className="auth-card__heading">
            <h1 style={{ margin: "0 0 .4rem", fontSize: "1.8rem", fontWeight: 800 }}>Welcome back</h1>
            <p style={{ margin: 0, color: "var(--text-secondary)" }}>Sign in to your account to continue</p>
          </div>

          {/* Form */}
          <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Email */}
            <div className="form-group">
              <label className="auth-label" htmlFor="login-email">Email address</label>
              <div className="auth-input-wrapper">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="login-email"
                  type="email"
                  className={`auth-input${errors.email ? " auth-input--error" : ""}`}
                  placeholder="you@company.com"
                  autoComplete="email"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <span className="auth-error-text">
                  <AlertCircle size={13} /> {errors.email.message}
                </span>
              )}
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="auth-label" htmlFor="login-password">Password</label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  className={`auth-input${errors.password ? " auth-input--error" : ""}`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  {...register("password")}
                />
                <button
                  type="button"
                  className="auth-input-icon--right"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <span className="auth-error-text">
                  <AlertCircle size={13} /> {errors.password.message}
                </span>
              )}
            </div>

            {/* Remember + Forgot */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label className="auth-checkbox-row">
                <input type="checkbox" {...register("rememberMe")} />
                Remember me
              </label>
              <Link
                to="/forgot-password"
                style={{ fontSize: ".82rem", color: "var(--orange-600)", fontWeight: 600, textDecoration: "none" }}
              >
                Forgot password?
              </Link>
            </div>

            {/* Server error */}
            {serverError && (
              <div className="auth-alert auth-alert--error" style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                <AlertCircle size={15} /> {serverError}
              </div>
            )}

            {/* Submit */}
            <button type="submit" className="auth-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem" }}>
                  <span className="spinner" style={{ width: 16, height: 16, borderTopColor: "#fff" }} />
                  Signing in...
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem" }}>
                  Sign In <ArrowRight size={16} />
                </span>
              )}
            </button>
          </form>

          <p className="auth-footer-link">
            Don't have an account?{" "}
            <Link to="/register">Contact your admin</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
