const UI = (() => {
  // Application state for current filters, sorting, and pagination
  const state = {
    currentPage: 1,
    pageSize: 8,
    sortBy: "id",
    sortDir: "asc",
  };
  // Initialize application and bind event listeners
  function init() {
    document.addEventListener("DOMContentLoaded", async () => {
      await Storage.initEmployees();

      if (document.getElementById("statTotalEmployees")) {
        Auth.requireAuth(["admin", "employee"]);
        bindDashboard();
      }

      if (document.getElementById("employeesTableBody")) {
        Auth.requireAuth(["admin", "employee"]);
        bindEmployeesTable();
      }

      if (document.getElementById("employeeForm")) {
        Auth.requireAuth(["admin"]);
        bindEmployeeForm();
      }
    });
  }
  // Bind dashboard stats and recent employees list
  function bindDashboard() {
    const stats = Employee.getStats();
    setText("statTotalEmployees", String(stats.totalEmployees));
    setText("statActiveEmployees", String(stats.activeEmployees));
    setText("statDepartments", String(stats.departments));
    setText("statRecentJoins", String(stats.recentJoins));

    const tbody = document.getElementById("recentEmployeesBody");
    if (!tbody) return;

    const rows = Employee.getRecentEmployees(5)
      .map(
        (employee) => `
          <tr>
            <td>${escapeHtml(employee.fullName || "-")}</td>
            <td>${escapeHtml(employee.department || "-")}</td>
            <td>${escapeHtml(employee.role || "-")}</td>
            <td>${formatDate(employee.joiningDate)}</td>
            <td><span class="status-pill ${employee.status === "Active" ? "is-active" : "is-inactive"}">${escapeHtml(employee.status)}</span></td>
          </tr>
        `,
      )
      .join("");

    tbody.innerHTML =
      rows ||
      `<tr><td colspan="5" class="empty-state">No employees found. Add your first employee.</td></tr>`;
  }
  // Bind employee list filters, sorting, pagination, and actions
  function bindEmployeesTable() {
    const searchInput = document.getElementById("searchInput");
    const departmentFilter = document.getElementById("departmentFilter");
    const roleFilter = document.getElementById("roleFilter");
    const statusFilter = document.getElementById("statusFilter");
    const prevBtn = document.getElementById("prevPageBtn");
    const nextBtn = document.getElementById("nextPageBtn");
    const headerSortEls = Array.from(
      document.querySelectorAll("th[data-sort]"),
    );

    const syncFilters = () => {
      populateSelect(
        departmentFilter,
        uniqueValues(Employee.getAll(), "department"),
      );
      populateSelect(roleFilter, uniqueValues(Employee.getAll(), "role"));
    };
    // Rerender employee table based on current filters, sorting, and pagination
    const rerender = () => {
      const result = getEmployeesViewModel({
        search: searchInput?.value || "",
        department: departmentFilter?.value || "",
        role: roleFilter?.value || "",
        status: statusFilter?.value || "",
        sortBy: state.sortBy,
        sortDir: state.sortDir,
        page: state.currentPage,
        pageSize: state.pageSize,
      });

      renderEmployeeRows(result.pageItems);
      renderPagination(result.totalItems, result.totalPages, result.page);
    };

    syncFilters();
    rerender();

    [searchInput, departmentFilter, roleFilter, statusFilter].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", () => {
        state.currentPage = 1;
        rerender();
      });
      el.addEventListener("change", () => {
        state.currentPage = 1;
        rerender();
      });
    });

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        state.currentPage = Math.max(1, state.currentPage - 1);
        rerender();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        state.currentPage += 1;
        rerender();
      });
    }
    // Bind sorting on table headers
    headerSortEls.forEach((th) => {
      th.style.cursor = "pointer";
      th.addEventListener("click", () => {
        const key = th.getAttribute("data-sort");
        if (!key) return;
        if (state.sortBy === key) {
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        } else {
          state.sortBy = key;
          state.sortDir = "asc";
        }
        state.currentPage = 1;
        rerender();
      });
    });

    // Bind edit and delete actions on employee rows
    const tbody = document.getElementById("employeesTableBody");
    if (tbody) {
      tbody.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const actionEl = target.closest("[data-action]");
        if (!actionEl) return;

        const id = Number(actionEl.getAttribute("data-id"));
        const action = actionEl.getAttribute("data-action");

        if (action === "edit") {
          window.location.href = `add-employee.html?id=${id}`;
          return;
        }
        if (action === "delete") {
          const ok = window.confirm("Delete this employee?");
          if (!ok) return;
          Employee.remove(id);
          syncFilters();
          rerender();
        }
      });
    }
  }
  // Bind add/edit employee form submission with validation and saving
  function bindEmployeeForm() {
    const form = document.getElementById("employeeForm");
    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    const editId = Number(params.get("id"));
    const isEdit = Number.isFinite(editId) && editId > 0;

    if (isEdit) {
      const employee = Employee.getById(editId);
      if (employee) {
        setText("formTitle", "Edit Employee");
        setValue("employeeId", employee.id);
        setValue("fullName", employee.fullName);
        setValue("email", employee.email);
        setValue("phone", employee.phone);
        setValue("department", employee.department);
        setValue("role", employee.role);
        setValue("salary", employee.salary);
        setValue("joiningDate", employee.joiningDate);
        setValue("status", employee.status);
        setValue("profilePhoto", employee.profilePhoto);
      }
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      clearErrors(form);

      const payload = {
        id: Number(getValue("employeeId")) || null,
        fullName: getValue("fullName"),
        email: getValue("email"),
        phone: getValue("phone"),
        department: getValue("department"),
        role: getValue("role"),
        salary: Number(getValue("salary")),
        joiningDate: getValue("joiningDate"),
        status: getValue("status"),
        profilePhoto: getValue("profilePhoto"),
      };

      const result = Employee.save(payload);
      if (!result.ok) {
        showErrors(form, result.errors);
        return;
      }

      window.location.href = "employees.html";
    });
  }
  // Get filtered, sorted, and paginated employee list based on current UI state
  function getEmployeesViewModel(filters) {
    const searchTerm = filters.search.toLowerCase().trim();
    const filtered = Employee.getAll().filter((employee) => {
      const searchBlob =
        `${employee.fullName} ${employee.email} ${employee.phone}`.toLowerCase();
      const matchesSearch = !searchTerm || searchBlob.includes(searchTerm);
      const matchesDepartment =
        !filters.department || employee.department === filters.department;
      const matchesRole = !filters.role || employee.role === filters.role;
      const matchesStatus =
        !filters.status || employee.status === filters.status;
      return matchesSearch && matchesDepartment && matchesRole && matchesStatus;
    });

    const sorted = filtered.sort((a, b) =>
      compareBy(a, b, filters.sortBy, filters.sortDir),
    );
    const totalItems = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / filters.pageSize));
    const page = Math.min(filters.page, totalPages);
    state.currentPage = page;

    const start = (page - 1) * filters.pageSize;
    const end = start + filters.pageSize;
    const pageItems = sorted.slice(start, end);

    return { totalItems, totalPages, page, pageItems };
  }
  // Render employee rows in the table based on current page items
  function renderEmployeeRows(items) {
    const tbody = document.getElementById("employeesTableBody");
    if (!tbody) return;

    tbody.innerHTML =
      items
        .map(
          (employee) => `
            <tr>
              <td>${employee.id}</td>
              <td>${escapeHtml(employee.fullName || "-")}</td>
              <td>${escapeHtml(employee.department || "-")}</td>
              <td>${escapeHtml(employee.role || "-")}</td>
              <td>${formatDate(employee.joiningDate)}</td>
              <td><span class="status-pill ${employee.status === "Active" ? "is-active" : "is-inactive"}">${escapeHtml(employee.status)}</span></td>
              <td>
                <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${employee.id}">Edit</button>
                <button class="btn btn-danger btn-sm" data-action="delete" data-id="${employee.id}">Delete</button>
              </td>
            </tr>
          `,
        )
        .join("") ||
      `<tr><td colspan="7" class="empty-state">No employees match current filters.</td></tr>`;
  }

  // Render pagination info and enable/disable pagination buttons based on current page and total pages
  function renderPagination(totalItems, totalPages, page) {
    setText(
      "paginationLabel",
      `Showing ${totalItems ? (page - 1) * state.pageSize + 1 : 0}-${Math.min(page * state.pageSize, totalItems)} of ${totalItems}`,
    );
    setText("currentPageLabel", `Page ${page} / ${totalPages}`);

    const prevBtn = document.getElementById("prevPageBtn");
    const nextBtn = document.getElementById("nextPageBtn");
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= totalPages;
  }
  // Compare two employee objects based on a given key and direction for sorting
  function compareBy(a, b, key, dir) {
    const direction = dir === "desc" ? -1 : 1;
    const aVal = a[key];
    const bVal = b[key];

    if (key === "id" || key === "salary") {
      return ((Number(aVal) || 0) - (Number(bVal) || 0)) * direction;
    }
    if (key === "joiningDate") {
      return (new Date(aVal) - new Date(bVal)) * direction;
    }

    return (
      String(aVal || "").localeCompare(String(bVal || ""), undefined, {
        sensitivity: "base",
      }) * direction
    );
  }
  // Populate a select element with given values and preserve previous selection if possible
  function populateSelect(selectEl, values) {
    if (!selectEl) return;
    const previous = selectEl.value;
    const options = values
      .map(
        (value) =>
          `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`,
      )
      .join("");
    selectEl.innerHTML = `<option value="">All</option>${options}`;
    if (values.includes(previous)) {
      selectEl.value = previous;
    }
  }
  // Get unique values for a given key from a list of objects, sorted alphabetically
  function uniqueValues(list, key) {
    return Array.from(
      new Set(
        list
          .map((item) => String(item[key] || "").trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b)),
      ),
    );
  }
  // Display validation errors on the form based on the errors object returned from Employee.save()
  function showErrors(form, errors) {
    Object.entries(errors).forEach(([field, message]) => {
      const el = form.querySelector(`[data-error-for="${field}"]`);
      if (el) el.textContent = message;
    });
    if (errors.form) return;
    const formError = form.querySelector('[data-error-for="form"]');
    if (formError && Object.keys(errors).length) {
      formError.textContent = "Please correct the highlighted fields.";
    }
  }
  // Clear all error messages from the form
  function clearErrors(form) {
    const nodes = form.querySelectorAll("[data-error-for]");
    nodes.forEach((node) => {
      node.textContent = "";
    });
  }
  // Utility functions to set text content and input values, format dates, and escape HTML for safe rendering
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
  // Set the value of an input element by id, converting null/undefined to empty string
  function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value == null ? "" : String(value);
  }
  // Get the trimmed string value of an input element by id, returning empty string if element not found
  function getValue(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }
  // Format a date string into a more readable format, or return original value if invalid
  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  }
  // Escape special characters in a string to prevent HTML injection when rendering user-provided values
  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
  // Escape special characters in attribute values, including backticks, to prevent HTML injection in attributes
  function escapeAttr(value) {
    return escapeHtml(value).replaceAll("`", "&#96;");
  }

  return { init };
})();
// Start the application
UI.init();
