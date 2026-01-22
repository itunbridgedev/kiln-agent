interface Category {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  isSystemCategory: boolean;
  featureModule: string | null;
  parentCategoryId: number | null;
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
    return <p className="text-center py-8 text-gray-500">Loading...</p>;
  }

  if (categories.length === 0) {
    return (
      <p className="text-center py-12 text-gray-500">
        No categories yet. Create your first one!
      </p>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Products
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Order
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {categories.map((category) => (
            <tr key={category.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900">
                    {category.name}
                  </span>
                  {category.isSystemCategory && (
                    <span
                      className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800"
                      title={
                        category.featureModule
                          ? `Feature: ${category.featureModule}`
                          : "System category"
                      }
                    >
                      System
                    </span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {category.description || "-"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {category._count?.products || 0}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {category.displayOrder}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    category.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {category.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {category.isSystemCategory ? (
                  <span className="text-gray-400 text-sm">Protected</span>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(category)}
                      className="text-primary hover:text-primary-dark font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(category.id)}
                      className="text-error hover:text-red-700 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
