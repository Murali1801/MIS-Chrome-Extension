// capture-credentials.js
$(document).ready(function() {
    $('#sbt_butt').closest('form').on('submit', function() {
        chrome.storage.local.get('settings', (data) => {
            if (data && data.settings && data.settings.saveCredentialsEnabled) {
                const username = $('input[name="username"]').val();
                const password = $('input[name="password"]').val();

                if (username && password) {
                    // **FIX**: Send a message to the background script instead of accessing storage directly.
                    chrome.runtime.sendMessage({
                        action: "setTempCredentials",
                        credentials: { studentid: username, studentpwd: password }
                    });
                }
            }
        });
    });
});