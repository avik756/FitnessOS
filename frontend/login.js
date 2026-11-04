const authForm = document.querySelector("#auth-form");
const authTitle = document.querySelector("#auth-title");
const authIntro = document.querySelector("#auth-intro");
const authButton = document.querySelector("#auth-button");
const authStatus = document.querySelector("#auth-status");
const passwordField = document.querySelector("#auth-password");
let setupRequired = false;

async function showAuthForm() {
  try {
    const response = await fetch("/api/auth/status", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not check the local account.");
    const status = await response.json();
    if (status.authenticated) {
      window.location.replace("/");
      return;
    }
    setupRequired = status.setup_required;
    authTitle.textContent = setupRequired ? "Create your local account" : "Sign in";
    authIntro.textContent = setupRequired
      ? "Choose a name and password to protect access to this app on this computer."
      : "Welcome back. Your records are ready when you are.";
    authButton.textContent = setupRequired ? "Create account" : "Sign in";
    passwordField.autocomplete = setupRequired ? "new-password" : "current-password";
    passwordField.minLength = setupRequired ? 8 : 1;
    authForm.hidden = false;
  } catch (error) {
    authTitle.textContent = "Could not open your space";
    authIntro.textContent = `${error.message} Reload the page after restarting the local server.`;
  }
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authButton.disabled = true;
  authStatus.textContent = setupRequired ? "Creating account…" : "Signing in…";
  const fields = new FormData(authForm);
  try {
    const response = await fetch(setupRequired ? "/api/auth/setup" : "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fields.get("name"),
        password: fields.get("password"),
        remember: fields.has("remember"),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not sign in.");
    window.location.replace("/");
  } catch (error) {
    authStatus.textContent = error.message;
  } finally {
    authButton.disabled = false;
  }
});

showAuthForm();
