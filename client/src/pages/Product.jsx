import { useParams } from "react-router-dom";

export default function Product() {
  const { slug } = useParams();
  return (
    <div className="mx-auto max-w-shell px-6 py-16">
      <p className="text-sm text-muted">Product: {slug}</p>
    </div>
  );
}
