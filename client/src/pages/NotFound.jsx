import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-shell px-6 py-24">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="mt-3 text-muted">
        Nothing here. <Link to="/" className="underline">Back to home</Link>.
      </p>
    </div>
  );
}
