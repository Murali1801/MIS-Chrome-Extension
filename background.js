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

        case "importStudents":
            chrome.storage.local.get("students", (data) => {
                const existingStudents = data.students || [];
                const importedStudents = request.students || [];
                const studentMap = new Map(existingStudents.map(s => [s.studentid, s]));
                importedStudents.forEach(importedStudent => {
                    studentMap.set(importedStudent.studentid, importedStudent);
                });
                const mergedStudents = Array.from(studentMap.values());
                chrome.storage.local.set({ students: mergedStudents }, () => sendResponse({ success: true }));
            });
            break;

        // **FIX START: Added the missing deletion logic**
        case "deleteMultipleStudents":
            chrome.storage.local.get("students", (data) => {
                let students = data.students || [];
                const idsToDelete = new Set(request.studentIds);
                students = students.filter(s => !idsToDelete.has(s.studentid));
                chrome.storage.local.set({ students }, () => sendResponse({ success: true }));
            });
            break;

        case "deleteAllStudents":
            chrome.storage.local.set({ students: [] }, () => sendResponse({ success: true }));
            break;
        // **FIX END**

    }
    return true; // Return true to indicate that the response will be sent asynchronously.
});

