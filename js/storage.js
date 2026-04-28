const Storage = (() => {
  //Employee key
  const EMPLOYEES_KEY = "ems_employees";
  //
  async function initEmployees() {
    const existing = localStorage.getItem(EMPLOYEES_KEY);
    if (existing) return JSON.parse(existing);

    try {
      const res = await fetch("data/mock-data.json");
      if (!res.ok) throw new Error("Failed to load mock data");
      const data = await res.json();
      const employees = data.employees || [];
      localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
      return employees;
    } catch (e) {
      console.error(e);
      const fallback = [];
      localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(fallback));
      return fallback;
    }
  }
  // Retrieve the list of employees from localStorage, returning an empty array if not found or on parse error
  function getEmployees() {
    const raw = localStorage.getItem(EMPLOYEES_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  // Save the provided list of employees to localStorage under the defined key
  function saveEmployees(list) {
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(list));
  }

  // Add a new employee or update an existing one based on the presence of an id. If adding, assign a new unique id.
  function upsertEmployee(employee) {
    const list = getEmployees();
    if (employee.id == null) {
      const maxId = list.reduce((max, e) => Math.max(max, e.id || 0), 0);
      employee.id = maxId + 1;
      list.push(employee);
    } else {
      const index = list.findIndex((e) => e.id === employee.id);
      if (index >= 0) {
        list[index] = employee;
      } else {
        list.push(employee);
      }
    }
    saveEmployees(list);
    return employee;
  }
  function deleteEmployee(id) {
    const list = getEmployees().filter((e) => e.id !== id);
    saveEmployees(list);
  }

  return {
    initEmployees,
    getEmployees,
    saveEmployees,
    upsertEmployee,
    deleteEmployee,
  };
})();
// Expose the Storage module to the global scope for use in other parts of the application
window.Storage = Storage;
