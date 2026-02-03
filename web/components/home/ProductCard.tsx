"use client";

import { useRouter } from "next/navigation";

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/classes/${product.id}`);
  };

  return (
    <div
      className="product-card"
      onClick={handleClick}
      style={{ cursor: "pointer" }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleClick();
        }
      }}
    >
      {product.imageUrl && (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="product-image"
        />
      )}
      <div className="product-info">
        <h4 className="product-name">{product.name}</h4>
        {product.description && (
          <p className="product-description">{product.description}</p>
        )}
        <p className="product-price">${product.price}</p>
      </div>
    </div>
  );
}
