import { useState, useEffect, useRef } from "react";

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  systemRoles: string[];
  teachingRoles: Array<{ id: number; name: string; }>;
}

interface UserSearchProps {
  onSelectUser: (user: User) => void;
}

export default function UserSearch({ onSelectUser }: UserSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const searchUsers = async () => {
      if (searchTerm.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `/api/admin/users?search=${encodeURIComponent(searchTerm)}`,
          { credentials: "include" }
        );
        if (response.ok) {
          const data = await response.json();
          setResults(data);
          setShowResults(true);
        }
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const handleSelectUser = (user: User) => {
    onSelectUser(user);
    setSearchTerm("");
    setResults([]);
    setShowResults(false);
  };

  const getRoleBadges = (roles: string[]) => {
    if (roles.length === 0) return <span className="text-gray-400 text-xs">Customer</span>;
    return roles.map((role) => (
      <span
        key={role}
        className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded ${
          role === "admin"
            ? "bg-red-100 text-red-800"
            : role === "manager"
              ? "bg-blue-100 text-blue-800"
              : role === "staff"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
        }`}
      >
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    ));
  };

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Search users by name or email..."
          className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <svg
          className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {loading && (
          <div className="absolute right-3 top-3.5">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {user.name}
                  </div>
                  <div className="text-sm text-gray-500 truncate">{user.email}</div>
                </div>
                <div className="flex flex-wrap gap-1 ml-3">
                  {getRoleBadges(user.systemRoles)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && searchTerm.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
          No users found matching "{searchTerm}"
        </div>
      )}
    </div>
  );
}
