$(document).ready(function() {
    // This script runs on the main page after a successful login.
    // It sends a message to the background script, telling it to finalize the credential saving process.
    chrome.runtime.sendMessage({ action: "handleSuccessfulLogin" }, (response) => {
        // Check for a runtime error. This can happen if the popup is not open, which is normal.
        if (chrome.runtime.lastError) {
            // We can safely ignore this error.
            return;
        }

        // Log a success message to the console for debugging if the credentials were saved.
        if (response && response.status === "saved") {
            console.log("Attendance Enhancer: Credentials confirmed and saved successfully.");
        }
    });
});

