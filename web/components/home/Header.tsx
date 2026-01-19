interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

interface HeaderProps {
  user: User | null;
  studioName?: string;
  onLogout: () => void;
  onNavigateAdmin: () => void;
  onNavigateLogin: () => void;
}

export default function Header({
  user,
  studioName,
  onLogout,
  onNavigateAdmin,
  onNavigateLogin,
}: HeaderProps) {
  const isAdmin = user?.roles?.includes("admin");

  return (
    <header className="home-header">
      <div className="header-content">
        <div className="header-branding">
          <h1>{studioName || "Kiln Agent"}</h1>
          <p className="header-subtitle">powered by Kiln Agent</p>
        </div>
        <nav className="header-nav">
          {user ? (
            <>
              <span className="user-greeting">Hi, {user.name}</span>
              {isAdmin && (
                <button onClick={onNavigateAdmin} className="nav-btn">
                  Admin
                </button>
              )}
              <button onClick={onLogout} className="nav-btn">
                Logout
              </button>
            </>
          ) : (
            <button onClick={onNavigateLogin} className="nav-btn">
              Login
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
