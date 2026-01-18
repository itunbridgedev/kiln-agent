interface User {
  id: number;
  name: string;
  email: string;
}

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onNavigateAdmin: () => void;
  onNavigateLogin: () => void;
}

export default function Header({
  user,
  onLogout,
  onNavigateAdmin,
  onNavigateLogin,
}: HeaderProps) {
  return (
    <header className="home-header">
      <div className="header-content">
        <h1>Kiln Agent</h1>
        <nav className="header-nav">
          {user ? (
            <>
              <span className="user-greeting">Hi, {user.name}</span>
              <button onClick={onNavigateAdmin} className="nav-btn">
                Admin
              </button>
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
