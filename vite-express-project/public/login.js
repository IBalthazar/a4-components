async function login(event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const message = document.getElementById("message");

    message.textContent = "";

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            message.textContent = data.error || "Login failed.";
            return;
        }

        window.location.replace ("/");
    } catch (error) {
        message.textContent = "Could not log in. Check that the server is running.";
    }
}

document.getElementById("login-form").addEventListener("submit", login);

const params = new URLSearchParams(window.location.search);

if (params.has("error")) {
    document.getElementById("message").textContent = "GitHub sign-in failed or was cancelled. Please try again.";
}
