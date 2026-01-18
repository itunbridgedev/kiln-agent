interface AuthToggleProps {
  isRegistering: boolean;
  onToggle: () => void;
  onClearSession: () => void;
}

export default function AuthToggle({
  isRegistering,
  onToggle,
  onClearSession,
}: AuthToggleProps) {
  return (
    <>
      <div className="toggle-mode">
        {isRegistering
          ? "Already have an account? "
          : "Don't have an account? "}
        <button type="button" onClick={onToggle} className="link-btn">
          {isRegistering ? "Sign in" : "Create one"}
        </button>
      </div>

      <div style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
        <button
          type="button"
          onClick={onClearSession}
          className="link-btn"
          style={{ fontSize: "12px" }}
        >
          Having trouble? Clear cookies
        </button>
      </div>
    </>
  );
}
