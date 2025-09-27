// This script runs on the page after a successful login
$(document).ready(function() {
    // **FIX**: Send a message to the background script to handle the successful login logic.
    // The content script no longer accesses storage directly.
    chrome.runtime.sendMessage({ action: "handleSuccessfulLogin" }, (response) => {
        if (chrome.runtime.lastError) {
            // This error is normal if the popup isn't open and can be ignored.
            console.log(`Success-checker: Could not establish connection. This is expected. Error: ${chrome.runtime.lastError.message}`);
            return;
        }

        if (response && response.status === "saved") {
            console.log("Attendance Enhancer: Credentials confirmed and saved successfully.");
        } else if (response && response.status === "no_creds") {
            console.log("Attendance Enhancer: No temporary credentials were found to save.");
        }
    });
});

