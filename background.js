// Set default settings and load initial data when the extension is installed.
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(["students", "settings"], (data) => {
        if (!data.students) {
            fetch(chrome.runtime.getURL('student_records.json'))
                .then(res => res.json())
                .then(initialData => chrome.storage.local.set({ students: initialData }));
        }
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

// Main listener to handle all communication from other scripts.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case "getStore":
            chrome.storage.local.get(null, (allData) => sendResponse(allData));
            break;

        case "setStore":
            chrome.storage.local.set(request.data, () => sendResponse({ success: true }));
            break;

        case "addOrUpdateStudent":
            addOrUpdateStudent(request.student, request.originalId, () => sendResponse({ success: true }));
            break;

        case "setTempCredentials":
            if (request.credentials) {
                chrome.storage.session.set({ tempCredentials: request.credentials }, () => {
                    if (chrome.runtime.lastError) console.error(`Error setting temp credentials: ${chrome.runtime.lastError.message}`);
                    sendResponse({ success: true });
                });
            }
            break;

        case "handleSuccessfulLogin":
            chrome.storage.session.get('tempCredentials', (sessionData) => {
                if (sessionData && sessionData.tempCredentials) {
                    addOrUpdateStudent(sessionData.tempCredentials, null, () => {
                        chrome.storage.session.remove('tempCredentials', () => sendResponse({ status: "saved" }));
                    });
                } else {
                    sendResponse({ status: "no_creds" });
                }
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
    }
    return true; // Indicates asynchronous response.
});

/**
 * Helper function to add a new student or update an existing one.
 */
function addOrUpdateStudent(student, originalId, callback) {
    chrome.storage.local.get("students", (data) => {
        let students = data.students || [];
        const findId = originalId || student.studentid;
        const index = students.findIndex(s => s.studentid === findId);

        if (index > -1) {
            students[index] = student; // Update
        } else {
            students.push(student); // Add
        }

        chrome.storage.local.set({ students }, () => {
            if (callback) callback();
        });
    });
}

