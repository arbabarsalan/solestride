import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-shell grid-cols-2 gap-8 px-6 py-12 text-sm text-muted md:grid-cols-4">
        <div>
          <p className="font-semibold tracking-[0.2em] text-ink">LIBAS</p>
          <p className="mt-3 leading-relaxed">Tradition, tailored for today.</p>
        </div>
        <div>
          <p className="font-medium text-ink">Shop</p>
          <ul className="mt-3 space-y-2">
            <li><Link to="/shop" className="hover:text-ink">All products</Link></li>
            <li><Link to="/cart" className="hover:text-ink">Cart</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-ink">Account</p>
          <ul className="mt-3 space-y-2">
            <li><Link to="/login" className="hover:text-ink">Sign in</Link></li>
            <li><Link to="/register" className="hover:text-ink">Create account</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-ink">Support</p>
          <ul className="mt-3 space-y-2">
            <li>Free shipping over Rs 5,000</li>
            <li>Cash on delivery available</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-6 text-center text-xs text-muted">
        &copy; {new Date().getFullYear()} LIBAS
      </div>
    </footer>
  );
}
