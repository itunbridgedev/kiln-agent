import ProductCard from "./ProductCard";

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
}

interface Category {
  id: number;
  name: string;
  description: string | null;
}

interface CategorySectionProps {
  category: Category;
  products: Product[];
}

export default function CategorySection({
  category,
  products,
}: CategorySectionProps) {
  return (
    <div className="category-section">
      <h3 className="category-title">{category.name}</h3>
      {category.description && (
        <p className="category-description">{category.description}</p>
      )}

      {products.length === 0 ? (
        <p className="no-products">No products in this category yet.</p>
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
