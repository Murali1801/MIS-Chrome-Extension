$(document).ready(function() {
    // This script runs on the main page after a successful login.
    // It sends a message to the background script, telling it to finalize the credential saving process.
    console.log('Attendance Enhancer: Login successful, checking for credentials to save...');
    
    chrome.runtime.sendMessage({ action: "handleSuccessfulLogin" }, (response) => {
        // Check for a runtime error.
        if (chrome.runtime.lastError) {
            console.error('Attendance Enhancer: Runtime error:', chrome.runtime.lastError.message);
            return;
        }

        // Log the response for debugging
        if (response) {
            if (response.status === "saved") {
                console.log("✓ Attendance Enhancer: Credentials confirmed and saved successfully.");
            } else if (response.status === "no_creds") {
                console.log("Attendance Enhancer: No temporary credentials found (user may have logged in without the save feature enabled).");
            } else {
                console.log("Attendance Enhancer: Unexpected response:", response);
            }
        } else {
            console.warn('Attendance Enhancer: No response received from background script.');
        }
    });
});

