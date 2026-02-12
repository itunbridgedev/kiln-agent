import { useAuth } from "@/context/AuthContext";
import React, { useEffect, useState } from "react";

export interface ClassFormData {
  categoryId?: number | null;
  teachingRoleId?: number | null;
  name: string;
  description: string;
  classType: "single-session" | "multi-session" | "series" | "multi-step" | "open-studio";
  durationWeeks: number | null;
  durationHours: number | null;
  isRecurring: boolean;
  requiresSequence: boolean;
  maxStudents: number;
  price: string;
  skillLevel: string;
  imageUrl: string;
  isActive: boolean;
  steps?: ClassStep[];
  resourceRequirements?: ResourceRequirement[];
}

interface ResourceRequirement {
  resourceId: number;
  quantityPerStudent: number;
}

interface StudioResource {
  id: number;
  name: string;
  description: string | null;
  quantity: number;
  isActive: boolean;
}

interface ClassStep {
  stepNumber: number;
  name: string;
  description: string;
  durationHours: number;
  learningObjectives: string;
}

interface ClassFormProps {
  initialData?: Partial<ClassFormData>;
  onSubmit: (data: ClassFormData) => void;
  onCancel: () => void;
  categories: Array<{
    id: number;
    name: string;
    featureModule?: string | null;
  }>;
  teachingRoles: Array<{
    id: number;
    name: string;
    description?: string | null;
  }>;
}

export default function ClassForm({
  initialData,
  onSubmit,
  onCancel,
  categories,
  teachingRoles,
}: ClassFormProps) {
  const { user } = useAuth();
  const [resources, setResources] = useState<StudioResource[]>([]);
  const [selectedResources, setSelectedResources] = useState<
    Map<number, number>
  >(
    new Map(
      initialData?.resourceRequirements?.map((r) => [
        r.resourceId,
        r.quantityPerStudent,
      ]) || []
    )
  );

  const [formData, setFormData] = useState<ClassFormData>({
    categoryId: null,
    teachingRoleId: null,
    name: "",
    description: "",
    classType: "multi-session",
    durationWeeks: 8,
    durationHours: null,
    isRecurring: false,
    requiresSequence: false,
    maxStudents: 12,
    price: "0.00",
    skillLevel: "All Levels",
    imageUrl: "",
    isActive: true,
    steps: [],
    ...initialData,
  });

  const [steps, setSteps] = useState<ClassStep[]>(initialData?.steps || []);

  // Fetch resources
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const response = await fetch("/api/admin/resources", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setResources(data.filter((r: StudioResource) => r.isActive));
        }
      } catch (error) {
        console.error("Failed to fetch resources:", error);
      }
    };
    fetchResources();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleClassTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classType = e.target.value as ClassFormData["classType"];

    setFormData((prev) => ({
      ...prev,
      classType,
      durationWeeks: classType === "multi-session" ? 8 : null,
      durationHours: classType === "single-session" ? 2 : null,
      isRecurring: classType === "series" || classType === "open-studio",
      requiresSequence: classType === "multi-step",
    }));
  };

  const addStep = () => {
    setSteps([
      ...steps,
      {
        stepNumber: steps.length + 1,
        name: "",
        description: "",
        durationHours: 2,
        learningObjectives: "",
      },
    ]);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(
      newSteps.map((step, i) => ({
        ...step,
        stepNumber: i + 1,
      }))
    );
  };

  const updateStep = (index: number, field: keyof ClassStep, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const resourceRequirements = Array.from(selectedResources.entries()).map(
      ([resourceId, quantityPerStudent]) => ({
        resourceId,
        quantityPerStudent,
      })
    );

    onSubmit({
      ...formData,
      steps: formData.classType === "multi-step" ? steps : undefined,
      resourceRequirements,
    });
  };

  // Categories are already filtered by the admin page to include
  // the main Classes category and its subcategories
  const classCategories = categories;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white rounded-lg shadow-sm p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {initialData ? "Edit Class" : "Create New Class"}
      </h3>

      {/* Class Name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Class Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="e.g., Beginner Wheel Throwing"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          placeholder="Describe what students will learn..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      {/* Class Type */}
      <div>
        <label
          htmlFor="classType"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Class Type *
        </label>
        <select
          id="classType"
          name="classType"
          value={formData.classType}
          onChange={handleClassTypeChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="single-session">
            Single Session (e.g., Date Night)
          </option>
          <option value="multi-session">Multi-Session (Fixed weeks)</option>
          <option value="series">Series (Recurring weekly)</option>
          <option value="multi-step">Multi-Step (Sequential parts)</option>
          <option value="open-studio">Open Studio (Member booking)</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          {formData.classType === "single-session" &&
            "One-time workshop or event"}
          {formData.classType === "multi-session" &&
            "Fixed duration course (e.g., 8-week class)"}
          {formData.classType === "series" &&
            "Ongoing class that renews weekly (e.g., Tuesday wheel throwing)"}
          {formData.classType === "multi-step" &&
            "Sequential lessons students must complete in order"}
          {formData.classType === "open-studio" &&
            "Drop-in studio time for members to book resources"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Duration */}
        {formData.classType === "multi-session" && (
          <div>
            <label
              htmlFor="durationWeeks"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Duration (Weeks) *
            </label>
            <input
              type="number"
              id="durationWeeks"
              name="durationWeeks"
              value={formData.durationWeeks || ""}
              onChange={handleChange}
              min="1"
              max="52"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        )}

        {formData.classType === "single-session" && (
          <div>
            <label
              htmlFor="durationHours"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Duration (Hours) *
            </label>
            <input
              type="number"
              id="durationHours"
              name="durationHours"
              value={formData.durationHours || ""}
              onChange={handleChange}
              min="0.5"
              max="24"
              step="0.5"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        )}

        {/* Teaching Role */}
        <div>
          <label
            htmlFor="teachingRoleId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Teaching Role
          </label>
          <select
            id="teachingRoleId"
            name="teachingRoleId"
            value={formData.teachingRoleId || ""}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">Select one</option>
            {teachingRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Assign a teaching role (any qualified staff can teach)
          </p>
        </div>

        {/* Skill Level */}
        <div>
          <label
            htmlFor="skillLevel"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Skill Level
          </label>
          <select
            id="skillLevel"
            name="skillLevel"
            value={formData.skillLevel}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="All Levels">All Levels</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>

        {/* Max Students */}
        <div>
          <label
            htmlFor="maxStudents"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Max Students *
          </label>
          <input
            type="number"
            id="maxStudents"
            name="maxStudents"
            value={formData.maxStudents}
            onChange={handleChange}
            min="1"
            max="100"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Price */}
        <div>
          <label
            htmlFor="price"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Price ($) *
          </label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleChange}
            min="0"
            step="0.01"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      {/* Category Selection */}
      <div>
        <label
          htmlFor="categoryId"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Category
        </label>
        <select
          id="categoryId"
          name="categoryId"
          value={formData.categoryId || ""}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
          required
          disabled={classCategories.length === 0}
        >
          <option value="">
            {classCategories.length === 0
              ? "No categories available - Contact administrator"
              : "Select a category"}
          </option>
          {classCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          {classCategories.length === 0 ? (
            <span className="text-orange-600 font-medium">
              ⚠️ The "Classes" category needs to be created by an administrator
            </span>
          ) : (
            "Select the category for this class (you can use the main Classes category or create subcategories in the Categories tab)"
          )}
        </p>
      </div>

      {/* Image URL */}
      <div>
        <label
          htmlFor="imageUrl"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Image URL
        </label>
        <input
          type="text"
          id="imageUrl"
          name="imageUrl"
          value={formData.imageUrl}
          onChange={handleChange}
          placeholder="https://example.com/class-image.jpg"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      {/* Active Status */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isActive"
          name="isActive"
          checked={formData.isActive}
          onChange={handleChange}
          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
        />
        <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
          Active (visible to customers)
        </label>
      </div>

      {/* Resource Requirements */}
      {resources.length > 0 && (
        <div className="mt-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-base font-semibold text-gray-900 mb-3">
            Resource Requirements
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            Select which studio resources are needed per student. This helps
            track equipment capacity during booking.
          </p>
          <div className="space-y-3">
            {resources.map((resource) => {
              const isSelected = selectedResources.has(resource.id);
              const quantity = selectedResources.get(resource.id) || 1;

              return (
                <div
                  key={resource.id}
                  className="flex items-center gap-4 p-3 bg-white rounded-lg border border-gray-200"
                >
                  <input
                    type="checkbox"
                    id={`resource-${resource.id}`}
                    checked={isSelected}
                    onChange={(e) => {
                      const newSelected = new Map(selectedResources);
                      if (e.target.checked) {
                        newSelected.set(resource.id, 1);
                      } else {
                        newSelected.delete(resource.id);
                      }
                      setSelectedResources(newSelected);
                    }}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label htmlFor={`resource-${resource.id}`} className="flex-1">
                    <div className="font-medium text-gray-900">
                      {resource.name}
                    </div>
                    {resource.description && (
                      <div className="text-xs text-gray-500">
                        {resource.description}
                      </div>
                    )}
                    <div className="text-xs text-gray-400">
                      Available: {resource.quantity}
                    </div>
                  </label>
                  {isSelected && (
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`quantity-${resource.id}`}
                        className="text-sm text-gray-600"
                      >
                        Per student:
                      </label>
                      <input
                        type="number"
                        id={`quantity-${resource.id}`}
                        value={quantity}
                        onChange={(e) => {
                          const newSelected = new Map(selectedResources);
                          newSelected.set(
                            resource.id,
                            parseInt(e.target.value) || 1
                          );
                          setSelectedResources(newSelected);
                        }}
                        min="1"
                        max={resource.quantity}
                        className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Multi-Step Builder */}
      {formData.classType === "multi-step" && (
        <div className="mt-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-base font-semibold text-gray-900">
              Class Steps
            </h4>
            <button
              type="button"
              onClick={addStep}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              + Add Step
            </button>
          </div>

          {steps.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              No steps added yet. Click &quot;Add Step&quot; to create
              sequential lessons.
            </p>
          ) : (
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="p-4 bg-white rounded-lg border border-gray-200"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold text-gray-700">
                      Step {step.stepNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      className="px-3 py-1 text-sm bg-error text-white rounded-md hover:bg-red-600 transition-colors"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label
                        htmlFor={`step-name-${index}`}
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Step Name *
                      </label>
                      <input
                        type="text"
                        id={`step-name-${index}`}
                        value={step.name}
                        onChange={(e) =>
                          updateStep(index, "name", e.target.value)
                        }
                        placeholder="e.g., Introduction to Wheel Centering"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`step-description-${index}`}
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Description
                      </label>
                      <textarea
                        id={`step-description-${index}`}
                        value={step.description}
                        onChange={(e) =>
                          updateStep(index, "description", e.target.value)
                        }
                        rows={2}
                        placeholder="Describe what students will learn in this step..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor={`step-duration-${index}`}
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Duration (Hours) *
                        </label>
                        <input
                          type="number"
                          id={`step-duration-${index}`}
                          value={step.durationHours}
                          onChange={(e) =>
                            updateStep(
                              index,
                              "durationHours",
                              parseFloat(e.target.value)
                            )
                          }
                          min="0.5"
                          step="0.5"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`step-objectives-${index}`}
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Learning Objectives
                        </label>
                        <input
                          type="text"
                          id={`step-objectives-${index}`}
                          value={step.learningObjectives}
                          onChange={(e) =>
                            updateStep(
                              index,
                              "learningObjectives",
                              e.target.value
                            )
                          }
                          placeholder="e.g., Master centering technique"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Form Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="px-6 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-dark transition-colors"
        >
          {initialData ? "Update Class" : "Create Class"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
