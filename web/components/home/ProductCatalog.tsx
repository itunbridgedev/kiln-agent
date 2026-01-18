import CategorySection from "./CategorySection";

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  category: {
    id: number;
    name: string;
  };
}

interface Category {
  id: number;
  name: string;
  description: string | null;
  products: Product[];
}

interface ProductCatalogProps {
  categories: Category[];
  loading: boolean;
}

export default function ProductCatalog({
  categories,
  loading,
}: ProductCatalogProps) {
  if (loading) {
    return (
      <section className="products-section">
        <p>Loading products...</p>
      </section>
    );
  }

  if (categories.length === 0) {
    return (
      <section className="products-section">
        <p className="no-products">No products available at this time.</p>
      </section>
    );
  }

  return (
    <section className="products-section">
      {categories.map((category) => (
        <CategorySection
          key={category.id}
          category={category}
          products={category.products}
        />
      ))}
    </section>
  );
}
