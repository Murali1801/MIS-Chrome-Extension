$(document).ready(function() {
    // Find the form and listen for its submission.
    $('#sbt_butt').closest('form').on('submit', function() {
        // First, check if the "save credentials" feature is enabled in the extension's settings.
        chrome.storage.local.get('settings', (data) => {
            if (data && data.settings && data.settings.saveCredentialsEnabled) {
                const username = $('input[name="username"]').val();
                const password = $('input[name="password"]').val();

                if (username && password) {
                    // If credentials are found, send them to the background script.
                    // The background script will store them in temporary session storage
                    // until the login is confirmed to be successful.
                    chrome.runtime.sendMessage({
                        action: "setTempCredentials",
                        credentials: { studentid: username, studentpwd: password }
                    });
                }
            }
        });
    });
});

