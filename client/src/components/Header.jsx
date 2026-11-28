import { Link, NavLink } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const links = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/about", label: "About" },
];

const linkClass = ({ isActive }) =>
  `text-muted transition-colors hover:text-ink${isActive ? " text-ink" : ""}`;

export default function Header() {
  const { count } = useCart();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-shell items-center justify-between px-6">
        <Link to="/" className="text-sm font-semibold tracking-[0.2em]">
          LIBAS
        </Link>
        <nav className="flex items-center gap-8 text-sm text-muted">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
          <Link to="/cart" className="text-muted transition-colors hover:text-ink">
            Cart{count > 0 && <span className="ml-1.5 text-xs">({count})</span>}
          </Link>
          {user ? (
            <>
              <Link to="/account/orders" className="text-muted transition-colors hover:text-ink">
                {(user.full_name || user.email).split(" ")[0]}
              </Link>
              <button onClick={logout} className="text-muted transition-colors hover:text-ink">
                Sign out
              </button>
            </>
          ) : (
            <Link to="/login" className="text-muted transition-colors hover:text-ink">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
