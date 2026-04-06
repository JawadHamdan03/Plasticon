import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authCopy, type Locale } from "../content/authCopy";
import { useAuth } from "../context/AuthContext";
import { SelectField, TextField } from "../components/FormField";

type RegisterPageProps = {
  locale: Locale;
};

const roleOptions = ["WORKER", "ENGINEER", "ACCOUNTANT", "ADMIN"] as const;
const nationalIdPattern = /^\d{9}$/;
const usernamePattern = /^[A-Za-z0-9_]{3,30}$/;
const phonePattern = /^\d{10}$/;

export function RegisterPage({ locale }: RegisterPageProps) {
  const copy = authCopy[locale];
  const navigate = useNavigate();
  const { register, user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<(typeof roleOptions)[number]>("WORKER");
  const [shiftId, setShiftId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!nationalIdPattern.test(nationalId.trim())) {
      setErrorMessage(copy.registerFieldErrorNationalId);
      return;
    }

    if (!usernamePattern.test(username.trim())) {
      setErrorMessage(copy.registerFieldErrorUsername);
      return;
    }

    if (phone.trim() && !phonePattern.test(phone.trim())) {
      setErrorMessage(copy.registerFieldErrorPhone);
      return;
    }

    if (
      shiftId.trim() &&
      (!/^\d+$/.test(shiftId.trim()) || Number(shiftId) < 1)
    ) {
      setErrorMessage(copy.registerFieldErrorShift);
      return;
    }

    if (password.length < 8) {
      setErrorMessage(copy.registerFieldErrorPassword);
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        fullName: fullName.trim(),
        username: username.trim(),
        nationalId: nationalId.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role: isAdmin ? role : "WORKER",
        shiftId: shiftId.trim(),
        password,
        confirmPassword,
        profileImage,
      });

      navigate("/login");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `${copy.registerErrorPrefix}: ${error.message}`
          : copy.registerErrorPrefix,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-card auth-card--wide">
      <div className="auth-card__heading">
        <p className="auth-card__eyebrow">{copy.appName}</p>
        <h2>{copy.registerTitle}</h2>
        <p>{copy.registerSubtitle}</p>
      </div>

      <form className="auth-form auth-form--grid" onSubmit={handleSubmit}>
        <TextField
          label={copy.fullNameLabel}
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder={copy.namePlaceholder}
          autoComplete="name"
          required
        />

        <TextField
          label={copy.usernameLabel}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder={copy.usernamePlaceholder}
          autoComplete="username"
          pattern="[A-Za-z0-9_]{3,30}"
          required
        />

        <TextField
          label={copy.nationalIdLabel}
          value={nationalId}
          onChange={(event) => setNationalId(event.target.value)}
          placeholder={copy.nationalIdPlaceholder}
          inputMode="numeric"
          pattern="\d{9}"
          maxLength={9}
          required
        />

        <TextField
          label={copy.emailLabel}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={copy.emailPlaceholder}
          autoComplete="email"
          required
        />

        <TextField
          label={copy.phoneLabel}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder={copy.phonePlaceholder}
          autoComplete="tel"
          inputMode="numeric"
          pattern="\d{10}"
          maxLength={10}
        />

        {isAdmin ? (
          <SelectField
            label={copy.roleLabel}
            value={role}
            onChange={(event) =>
              setRole(event.target.value as (typeof roleOptions)[number])
            }
            hint={copy.registerRoleHintAdmin}
          >
            {roleOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectField>
        ) : (
          <TextField
            label={copy.roleLabel}
            value="WORKER"
            readOnly
            hint={copy.registerRoleHintWorker}
          />
        )}

        <TextField
          label={copy.shiftLabel}
          value={shiftId}
          onChange={(event) => setShiftId(event.target.value)}
          inputMode="numeric"
          placeholder="e.g. 1 or 2"
        />

        <TextField
          label={copy.passwordLabel}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={copy.passwordPlaceholder}
          autoComplete="new-password"
          required
        />

        <TextField
          label={copy.confirmPasswordLabel}
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder={copy.confirmPasswordPlaceholder}
          autoComplete="new-password"
          required
        />

        <label className="field field--full">
          <span className="field__label">{copy.profileImageLabel}</span>
          <input
            className="field__control field__control--file"
            type="file"
            accept="image/*"
            onChange={(event) =>
              setProfileImage(event.target.files?.[0] ?? null)
            }
          />
        </label>

        {errorMessage ? (
          <div className="auth-alert auth-alert--error field--full">
            {errorMessage}
          </div>
        ) : null}

        {!isAdmin ? (
          <div className="auth-alert field--full">
            {copy.registerAdminRequired}
          </div>
        ) : null}

        <button
          type="submit"
          className="auth-button field--full"
          disabled={isSubmitting || !isAdmin}
        >
          {isSubmitting ? `${copy.registerButton}...` : copy.registerButton}
        </button>
      </form>

      <footer className="auth-card__footer">
        <span>{copy.registerHint}</span>
        <Link className="auth-link auth-link--strong" to="/login">
          {copy.loginRouteLabel}
        </Link>
      </footer>
    </section>
  );
}
