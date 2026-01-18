import React from "react";

interface LoginFormProps {
  isRegistering: boolean;
  formData: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    phone: string;
    agreedToTerms: boolean;
    agreedToSms: boolean;
  };
  error: string;
  loading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function LoginForm({
  isRegistering,
  formData,
  error,
  loading,
  onInputChange,
  onSubmit,
}: LoginFormProps) {
  return (
    <form onSubmit={onSubmit} className="auth-form">
      {isRegistering && (
        <div className="form-group">
          <label htmlFor="name">Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={onInputChange}
            required
            placeholder="Enter your full name"
          />
        </div>
      )}

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={onInputChange}
          required
          placeholder="Enter your email"
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={onInputChange}
          required
          placeholder="Enter your password"
        />
      </div>

      {isRegistering && (
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={onInputChange}
            required
            placeholder="Confirm your password"
          />
        </div>
      )}

      {isRegistering && (
        <div className="form-group">
          <label htmlFor="phone">Phone Number (Optional)</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={onInputChange}
            placeholder="(555) 123-4567"
          />
        </div>
      )}

      {isRegistering && (
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="agreedToTerms"
              checked={formData.agreedToTerms}
              onChange={onInputChange}
              required
            />
            <span>
              I agree to the{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer">
                Terms & Conditions
              </a>
            </span>
          </label>
        </div>
      )}

      {isRegistering && (
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="agreedToSms"
              checked={formData.agreedToSms}
              onChange={onInputChange}
            />
            <span>I agree to receive SMS text messages from Kiln Agent</span>
          </label>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <button type="submit" className="submit-btn" disabled={loading}>
        {loading
          ? "Please wait..."
          : isRegistering
            ? "Create Account"
            : "Sign In"}
      </button>
    </form>
  );
}
