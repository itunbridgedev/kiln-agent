interface Category {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  _count?: {
    products: number;
  };
}

interface CategoryTableProps {
  categories: Category[];
  loading: boolean;
  onEdit: (category: Category) => void;
  onDelete: (id: number) => void;
}

export default function CategoryTable({
  categories,
  loading,
  onEdit,
  onDelete,
}: CategoryTableProps) {
  if (loading) {
    return <p>Loading...</p>;
  }

  if (categories.length === 0) {
    return <p className="no-data">No categories yet. Create your first one!</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Description</th>
          <th>Products</th>
          <th>Order</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {categories.map((category) => (
          <tr key={category.id}>
            <td>{category.name}</td>
            <td>{category.description || "-"}</td>
            <td>{category._count?.products || 0}</td>
            <td>{category.displayOrder}</td>
            <td>
              <span
                className={`status-badge ${category.isActive ? "active" : "inactive"}`}
              >
                {category.isActive ? "Active" : "Inactive"}
              </span>
            </td>
            <td className="actions">
              <button onClick={() => onEdit(category)} className="edit-btn">
                Edit
              </button>
              <button
                onClick={() => onDelete(category.id)}
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
