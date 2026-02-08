let studioContext: number | null = null;

export function setStudioContext(studioId: number | null) {
  studioContext = studioId;
}

export function getStudioContext(): number | null {
  return studioContext;
}

export function clearStudioContext() {
  studioContext = null;
}

export function createTenantMiddleware() {
  return async (params: any, next: any) => {
    const tenantId = getStudioContext();

    // Skip middleware for Studio model and other non-tenant models
    const nonTenantModels = [
      "Studio",
      "Role",
      "CustomerRole",
      "ClassResourceRequirement",
      "ClassSessionInstructor",
      "ClassSessionAssistant",
      "StaffCalendarFeed",
      "StaffTeachingRole",
      "RegistrationSession",
      "ReservationHistory",
      "SessionResourceAllocation",
      "Account",
      "Session"
    ];
    if (nonTenantModels.includes(params.model)) {
      return next(params);
    }

    // Auto-inject studioId for create operations
    if (params.action === "create" && tenantId) {
      if (params.args.data) {
        if (!params.args.data.studioId) {
          params.args.data.studioId = tenantId;
        }
      }
    }

    // Auto-inject studioId for createMany operations
    if (params.action === "createMany" && tenantId) {
      if (params.args.data && Array.isArray(params.args.data)) {
        params.args.data = params.args.data.map((item: any) => ({
          ...item,
          studioId: item.studioId || tenantId,
        }));
      }
    }

    // Auto-filter by studioId for read operations
    const readActions = [
      "findUnique",
      "findFirst",
      "findMany",
      "count",
      "aggregate",
      "groupBy",
    ];
    if (readActions.includes(params.action) && tenantId) {
      if (!params.args) {
        params.args = {};
      }
      if (!params.args.where) {
        params.args.where = {};
      }
      if (!params.args.where.studioId) {
        params.args.where.studioId = tenantId;
      }
    }

    // Auto-filter by studioId for update/delete operations
    const writeActions = [
      "update",
      "updateMany",
      "delete",
      "deleteMany",
      "upsert",
    ];
    if (writeActions.includes(params.action) && tenantId) {
      if (!params.args) {
        params.args = {};
      }
      if (!params.args.where) {
        params.args.where = {};
      }
      if (!params.args.where.studioId) {
        params.args.where.studioId = tenantId;
      }
    }

    return next(params);
  };
}
