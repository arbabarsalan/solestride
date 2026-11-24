import { Link } from "react-router-dom";

const SHOP_CATEGORIES = [
  { name: "Men", slug: "men" },
  { name: "Women", slug: "women" },
  { name: "Kids", slug: "kids" },
  { name: "Unstitched", slug: "unstitched" },
  { name: "Accessories", slug: "accessories" },
];

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-canvas">
      <div className="mx-auto grid max-w-shell grid-cols-2 gap-8 px-6 py-12 text-sm text-muted md:grid-cols-4">
        <div>
          <p className="font-semibold tracking-[0.2em] text-ink">LIBAS</p>
          <p className="mt-3 leading-relaxed">Eastern wear stitched and shipped across Pakistan.</p>
        </div>
        <div>
          <p className="font-medium text-ink">Shop</p>
          <ul className="mt-3 space-y-2">
            <li><Link to="/shop" className="transition-colors hover:text-ink">All products</Link></li>
            {SHOP_CATEGORIES.map((category) => (
              <li key={category.slug}>
                <Link to={`/shop?category=${category.slug}`} className="transition-colors hover:text-ink">
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-medium text-ink">Account</p>
          <ul className="mt-3 space-y-2">
            <li><Link to="/login" className="transition-colors hover:text-ink">Sign in</Link></li>
            <li><Link to="/register" className="transition-colors hover:text-ink">Create account</Link></li>
            <li><Link to="/account/orders" className="transition-colors hover:text-ink">My orders</Link></li>
            <li><Link to="/cart" className="transition-colors hover:text-ink">Cart</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-ink">Help</p>
          <ul className="mt-3 space-y-2">
            <li>Free shipping over Rs 5,000</li>
            <li>Cash on delivery available</li>
            <li><Link to="/admin/orders" className="transition-colors hover:text-ink">Order dashboard</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-shell flex-col gap-2 px-6 py-6 text-center text-xs text-muted md:flex-row md:items-center md:justify-between md:text-left">
          <p>&copy; {new Date().getFullYear()} LIBAS. All rights reserved.</p>
          <p>Tradition, tailored for today.</p>
        </div>
      </div>
    </footer>
  );
}
