interface Product {
  id: number;
  name: string;
  description: string | null;
  price: string;
  categoryId: number;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  category: {
    id: number;
    name: string;
  };
}

interface ProductTableProps {
  products: Product[];
  loading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}

export default function ProductTable({
  products,
  loading,
  onEdit,
  onDelete,
}: ProductTableProps) {
  if (loading) {
    return <p>Loading...</p>;
  }

  if (products.length === 0) {
    return <p className="no-data">No products yet. Create your first one!</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Category</th>
          <th>Price</th>
          <th>Order</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {products.map((product) => (
          <tr key={product.id}>
            <td>{product.name}</td>
            <td>{product.category.name}</td>
            <td>${product.price}</td>
            <td>{product.displayOrder}</td>
            <td>
              <span
                className={`status-badge ${product.isActive ? "active" : "inactive"}`}
              >
                {product.isActive ? "Active" : "Inactive"}
              </span>
            </td>
            <td className="actions">
              <button onClick={() => onEdit(product)} className="edit-btn">
                Edit
              </button>
              <button
                onClick={() => onDelete(product.id)}
                className="delete-btn"
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
