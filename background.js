// Set default settings on installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(["students", "settings"], (data) => {
        // Initialize students from JSON if not already present
        if (!data.students) {
            fetch(chrome.runtime.getURL('student_records.json'))
                .then(res => res.json())
                .then(initialData => {
                    chrome.storage.local.set({ students: initialData });
                });
        }
        // Initialize settings if not already present
        if (!data.settings) {
            chrome.storage.local.set({
                settings: {
                    autoLoginEnabled: true,
                    attendanceCalculatorEnabled: true,
                    saveCredentialsEnabled: true,
                    theme: 'light'
                }
            });
        }
    });
});

// Listener for all messages from content scripts and the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        // Retrieves the entire extension's storage (settings and students)
        case "getStore":
            chrome.storage.local.get(null, (allData) => {
                sendResponse(allData);
            });
            break;

        // Sets data in storage, used by the popup for settings changes
        case "setStore":
            chrome.storage.local.set(request.data, () => {
                sendResponse({ success: true });
            });
            break;

        // Temporarily stores credentials in the session when a login is attempted
        case "setTempCredentials":
            if (request.credentials) {
                chrome.storage.session.set({ tempCredentials: request.credentials }, () => {
                    sendResponse({ success: true });
                });
            }
            break;

        // Confirms successful login, moves credentials from session to permanent storage
        case "handleSuccessfulLogin":
            chrome.storage.session.get('tempCredentials', (sessionData) => {
                if (sessionData && sessionData.tempCredentials) {
                    const newStudent = sessionData.tempCredentials;
                    addOrUpdateStudent(newStudent, () => {
                        // Clear the temporary credentials after saving
                        chrome.storage.session.remove('tempCredentials');
                        sendResponse({ status: "saved" });
                    });
                } else {
                    sendResponse({ status: "no_creds" });
                }
            });
            break;

        // Used by the popup to delete multiple users at once
        case "deleteMultipleStudents":
            chrome.storage.local.get("students", (data) => {
                let students = data.students || [];
                const idsToDelete = new Set(request.studentIds);
                students = students.filter(s => !idsToDelete.has(s.studentid));
                chrome.storage.local.set({ students }, () => sendResponse({ success: true }));
            });
            break;

        // Used by the popup to delete all users
        case "deleteAllStudents":
            chrome.storage.local.set({ students: [] }, () => sendResponse({ success: true }));
            break;
    }
    return true; // Indicates asynchronous response
});

/**
 * A helper function to add a new student or update an existing one's password.
 * @param {object} student - The student object with {studentid, studentpwd}.
 * @param {function} callback - A function to call after the operation is complete.
 */
function addOrUpdateStudent(student, callback) {
    chrome.storage.local.get("students", (data) => {
        let students = data.students || [];
        const index = students.findIndex(s => s.studentid === student.studentid);

        if (index > -1) {
            students[index].studentpwd = student.studentpwd; // Update
        } else {
            students.push(student); // Add
        }
        chrome.storage.local.set({ students }, () => {
            if (callback) callback();
        });
    });
}

