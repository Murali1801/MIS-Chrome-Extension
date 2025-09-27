// Set default settings and load initial data when the extension is installed.
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(["students", "settings"], (data) => {
        if (chrome.runtime.lastError) {
            console.error(`Error checking initial data: ${chrome.runtime.lastError.message}`);
            return;
        }

        // Initialize student data from the JSON file if it doesn't already exist.
        if (!data.students) {
            fetch(chrome.runtime.getURL('student_records.json'))
                .then(res => res.json())
                .then(initialData => {
                    chrome.storage.local.set({ students: initialData }, () => {
                        if (chrome.runtime.lastError) console.error(`Error setting initial students: ${chrome.runtime.lastError.message}`);
                    });
                })
                .catch(error => console.error('Failed to load initial student records:', error));
        }

        // Initialize settings with default values if they don't already exist.
        if (!data.settings) {
            chrome.storage.local.set({
                settings: {
                    autoLoginEnabled: true,
                    attendanceCalculatorEnabled: true,
                    saveCredentialsEnabled: true,
                    theme: 'light'
                }
            }, () => {
                if (chrome.runtime.lastError) console.error(`Error setting initial settings: ${chrome.runtime.lastError.message}`);
            });
        }
    });
});

// Main listener to handle all communication from the popup and content scripts.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        // Provides the popup with all necessary data to render its state.
        case "getStore":
            chrome.storage.local.get(null, (allData) => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);
                    sendResponse({ error: chrome.runtime.lastError.message });
                    return;
                }
                sendResponse(allData);
            });
            break;

        // Allows the popup to save any changes to the settings.
        case "setStore":
            chrome.storage.local.set(request.data, () => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    return;
                }
                sendResponse({ success: true });
            });
            break;

        // **FIX START: New case for merging imported data**
        case "importStudents":
            chrome.storage.local.get("students", (data) => {
                if (chrome.runtime.lastError) {
                    console.error(`Error getting students for import: ${chrome.runtime.lastError.message}`);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    return;
                }

                const existingStudents = data.students || [];
                const importedStudents = request.students || [];
                const studentMap = new Map(existingStudents.map(s => [s.studentid, s]));

                importedStudents.forEach(importedStudent => {
                    studentMap.set(importedStudent.studentid, importedStudent);
                });

                const mergedStudents = Array.from(studentMap.values());

                chrome.storage.local.set({ students: mergedStudents }, () => {
                    if (chrome.runtime.lastError) {
                        console.error(`Error setting merged students: ${chrome.runtime.lastError.message}`);
                        sendResponse({ success: false, error: chrome.runtime.lastError.message });
                        return;
                    }
                    sendResponse({ success: true });
                });
            });
            break;
        // **FIX END**

        // ... (All other cases like handleSuccessfulLogin, deleteMultipleStudents, etc. remain the same)
    }
    return true; // Return true to indicate that the response will be sent asynchronously.
});

// ... (The addOrUpdateStudent helper function remains the same)

