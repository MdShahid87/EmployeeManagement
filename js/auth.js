const Auth = (() => {
  // Key used to store the current user information in sessionStorage
  const SESSION_KEY = "ems_current_user";

  // Retrieve the current authenticated user from sessionStorage, returning null if not found or on parse error
  function getCurrentUser() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  // Store the provided user information in sessionStorage under the defined key
  function setCurrentUser(user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }
  // Remove the current user information from sessionStorage
  function clearCurrentUser() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  // Simulate a login process by accepting email, password, and role, validating them, and storing the user information in sessionStorage. In a real application, this would involve server-side authentication.
  function login({ email, password, role }) {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      throw new Error("Email and password are required");
    }

    const nameFromEmail = trimmedEmail.split("@")[0] || "User";
    const displayName =
      role === "admin"
        ? "Admin"
        : nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);

    const user = { email: trimmedEmail, role, name: displayName };
    setCurrentUser(user);
    return user;
  }
  // Log out the current user and redirect to the login page
  function logout() {
    clearCurrentUser();
    window.location.href = "index.html";
  }

  // Check if a user is currently authenticated and optionally verify their role against allowed roles. If not authenticated, redirect to login page. If role is not allowed, redirect to dashboard.
  function requireAuth(allowedRoles = []) {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "index.html";
      return null;
    }
    if (allowedRoles.length && !allowedRoles.includes(user.role)) {
      // Simple: redirect non-admin back to dashboard
      window.location.href = "dashboard.html";
      return null;
    }
    const label = document.getElementById("currentUserLabel");
    if (label) {
      label.textContent = `${user.name} · ${user.role}`;
    }
    const logoutBtn = document.querySelector(".js-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        logout();
      });
    }
    return user;
  }

  // Attach event listener to the login form, if it exists on the page, to handle user authentication
  function attachLoginForm() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    const emailInput = form.querySelector("#email");
    const passwordInput = form.querySelector("#password");
    const roleSelect = form.querySelector("#role");

    const setError = (field, message) => {
      const el = form.querySelector(`[data-error-for="${field}"]`);
      if (el) el.textContent = message || "";
    };

    // Handle form submission, validate inputs, attempt login, and handle success or error states accordingly
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      setError("email", "");
      setError("password", "");
      setError("form", "");

      const email = emailInput.value;
      const password = passwordInput.value;
      const role = roleSelect.value;

      if (!email || !password) {
        setError("form", "Email and password are required.");
        return;
      }

      try {
        login({ email, password, role });
        window.location.href = "dashboard.html";
      } catch (err) {
        setError("form", "Invalid email, password or role.");
      }
    });
  }

  return {
    getCurrentUser,
    requireAuth,
    attachLoginForm,
    logout,
  };
})();

// Expose the Auth module to the global scope for use in other parts of the application
window.Auth = Auth;

// Auto-attach on login page
document.addEventListener("DOMContentLoaded", () => {
  Auth.attachLoginForm();
});
