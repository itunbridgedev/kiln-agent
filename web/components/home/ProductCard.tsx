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
  return (
    <div className="product-card">
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
