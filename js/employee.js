const Employee = (() => {
  //Normalize employee data
  function normalizeEmployee(raw = {}) {
    return {
      id: Number(raw.id) || null,
      fullName: String(raw.fullName || "").trim(),
      email: String(raw.email || "").trim(),
      phone: String(raw.phone || "").trim(),
      department: String(raw.department || "").trim(),
      role: String(raw.role || "").trim(),
      salary: Number(raw.salary) || 0,
      joiningDate: String(raw.joiningDate || ""),
      status: raw.status === "Inactive" ? "Inactive" : "Active",
      profilePhoto: String(raw.profilePhoto || "").trim(),
    };
  }

  //Get all employees
  function getAll() {
    return Storage.getEmployees().map(normalizeEmployee);
  }

  //Get employee by id
  function getById(id) {
    const numericId = Number(id);
    return getAll().find((employee) => employee.id === numericId) || null;
  }

  //Validate employee
  function validate(employee) {
    const errors = {};

    if (!employee.fullName || employee.fullName.length < 2) {
      errors.fullName = "Full name must be at least 2 characters.";
    }
    if (!employee.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email)) {
      errors.email = "Please enter a valid email address.";
    }
    if (!employee.phone || employee.phone.replace(/\D/g, "").length < 10) {
      errors.phone = "Phone number must have at least 10 digits.";
    }
    if (!employee.department) {
      errors.department = "Department is required.";
    }
    if (!employee.role) {
      errors.role = "Role is required.";
    }
    if (!employee.salary || employee.salary < 0) {
      errors.salary = "Salary must be a positive number.";
    }
    if (!employee.joiningDate) {
      errors.joiningDate = "Joining date is required.";
    }
    if (employee.profilePhoto && !/^https?:\/\//i.test(employee.profilePhoto)) {
      errors.profilePhoto =
        "Profile photo URL must start with http:// or https://";
    }
    //Check for duplicate email
    const list = getAll();
    const duplicate = list.find(
      (e) =>
        e.email.toLowerCase() === employee.email.toLowerCase() &&
        e.id !== employee.id,
    );
    if (duplicate) {
      errors.email = "An employee with this email already exists.";
    }

    return errors;
  }
  //Save Employee with validation
  function save(rawEmployee) {
    const employee = normalizeEmployee(rawEmployee);
    const errors = validate(employee);

    if (Object.keys(errors).length) {
      return { ok: false, errors };
    }

    const saved = Storage.upsertEmployee(employee);
    return { ok: true, employee: normalizeEmployee(saved), errors: {} };
  }

  //Remove employee
  function remove(id) {
    Storage.deleteEmployee(Number(id));
  }
  //Get employee stats
  function getStats() {
    const employees = getAll();
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const departments = new Set(
      employees.map((employee) => employee.department).filter(Boolean),
    );
    const recentJoins = employees.filter((employee) => {
      const joined = new Date(employee.joiningDate);
      return !Number.isNaN(joined.getTime()) && joined >= thirtyDaysAgo;
    });

    return {
      totalEmployees: employees.length,
      activeEmployees: employees.filter(
        (employee) => employee.status === "Active",
      ).length,
      departments: departments.size,
      recentJoins: recentJoins.length,
    };
  }
  //Get recent employee
  function getRecentEmployees(limit = 5) {
    return getAll()
      .slice()
      .sort((a, b) => new Date(b.joiningDate) - new Date(a.joiningDate))
      .slice(0, limit);
  }

  //Return employee functions
  return {
    getAll,
    getById,
    save,
    remove,
    getStats,
    getRecentEmployees,
  };
})();
//Export employee functions to window object
window.Employee = Employee;
