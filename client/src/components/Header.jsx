import { Link, NavLink } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";

const links = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/about", label: "About" },
];

export default function Header() {
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-shell items-center justify-between px-6">
        <Link to="/" className="text-sm font-semibold tracking-[0.2em]">
          SOLESTRIDE
        </Link>
        <nav className="flex items-center gap-8 text-sm text-muted">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                isActive ? "text-ink" : "hover:text-ink transition-colors"
              }
            >
              {l.label}
            </NavLink>
          ))}
          <Link to="/cart" className="hover:text-ink transition-colors">
            Cart{count > 0 && <span className="ml-1.5 text-xs">({count})</span>}
          </Link>
        </nav>
      </div>
    </header>
  );
}
