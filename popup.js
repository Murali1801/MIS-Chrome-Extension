document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Elements ---
    const body = document.body;
    const themeToggleBtn = document.getElementById('theme_toggle_btn');
    const themeIcon = document.getElementById('theme_icon');
    const autoLoginToggle = document.getElementById('autoLoginToggle');
    const attendanceCalcToggle = document.getElementById('attendanceCalcToggle');
    const saveCredentialsToggle = document.getElementById('saveCredentialsToggle');
    const studentListDiv = document.getElementById('student_list');
    const searchInput = document.getElementById('search_input');
    const selectAllCheckbox = document.getElementById('select_all_checkbox');
    const deleteSelectedBtn = document.getElementById('delete_selected_btn');
    const deleteAllBtn = document.getElementById('delete_all_btn');
    const importBtn = document.getElementById('import_btn');
    const exportBtn = document.getElementById('export_btn');
    const importFileInput = document.getElementById('import_file');
    const dateInput = document.getElementById('start_date');
    const saveDateBtn = document.getElementById('save_date_btn');
    const statusDiv = document.getElementById('status');
    
    let allStudents = [];
    let settings = {};

    // --- Theme Functions ---
    function applyTheme(theme) {
        body.setAttribute('data-theme', theme);
        themeIcon.src = theme === 'dark' ? 'sun-icon.svg' : 'moon-icon.svg';
    }

    themeToggleBtn.addEventListener('click', () => {
        settings.theme = body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(settings.theme);
        chrome.runtime.sendMessage({ action: "setStore", data: { settings: settings } });
    });

    // --- Feature Toggles ---
    autoLoginToggle.addEventListener('change', () => {
        settings.autoLoginEnabled = autoLoginToggle.checked;
        chrome.runtime.sendMessage({ action: "setStore", data: { settings: settings } });
    });
    attendanceCalcToggle.addEventListener('change', () => {
        settings.attendanceCalculatorEnabled = attendanceCalcToggle.checked;
        chrome.runtime.sendMessage({ action: "setStore", data: { settings: settings } });
    });
    saveCredentialsToggle.addEventListener('change', () => {
        settings.saveCredentialsEnabled = saveCredentialsToggle.checked;
        chrome.runtime.sendMessage({ action: "setStore", data: { settings: settings } });
    });

    // --- Data & UI Functions ---
    function renderStudentList(filter = '') {
        studentListDiv.innerHTML = '';
        const filteredStudents = allStudents.filter(s => s.studentid.toLowerCase().includes(filter.toLowerCase()));
        
        filteredStudents.forEach(student => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'student-item';
            itemDiv.innerHTML = `
                <input type="checkbox" data-studentid="${student.studentid}">
                <span class="student-name">${student.studentid}</span>
                <button class="edit-btn" data-studentid="${student.studentid}">Edit</button>
            `;
            studentListDiv.appendChild(itemDiv);
        });
        updateSelectAllState();
    }
    
    function updateSelectAllState() {
        const checkboxes = studentListDiv.querySelectorAll('input[type="checkbox"]');
        if (checkboxes.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
            return;
        }
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        selectAllCheckbox.checked = checkedCount === checkboxes.length;
        selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }
    
    // --- Event Listeners ---
    saveDateBtn.addEventListener('click', () => {
        chrome.storage.local.set({ startDate: dateInput.value }, () => {
            statusDiv.textContent = 'Date Saved!';
            setTimeout(() => { statusDiv.textContent = ''; }, 2000);
        });
    });

    searchInput.addEventListener('input', () => renderStudentList(searchInput.value));
    
    selectAllCheckbox.addEventListener('change', () => {
        studentListDiv.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = selectAllCheckbox.checked);
    });
    
    studentListDiv.addEventListener('click', (e) => {
        if (e.target.matches('input[type="checkbox"]')) updateSelectAllState();
        if (e.target.classList.contains('edit-btn')) alert("To edit a user, please delete and re-add them using the import/export feature for now.");
    });

    deleteSelectedBtn.addEventListener('click', () => {
        const selectedIds = Array.from(studentListDiv.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.dataset.studentid);
        if (selectedIds.length > 0 && confirm(`Delete ${selectedIds.length} user(s)?`)) {
            chrome.runtime.sendMessage({ action: "deleteMultipleStudents", studentIds: selectedIds }, () => init());
        }
    });

    deleteAllBtn.addEventListener('click', () => {
        if (confirm("DANGER: Delete ALL credentials? This cannot be undone.")) {
            chrome.runtime.sendMessage({ action: "deleteAllStudents" }, () => init());
        }
    });
    
    exportBtn.addEventListener('click', () => {
        chrome.downloads.download({
            url: "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allStudents, null, 2)),
            filename: 'student_records_backup.json',
            saveAs: true
        });
    });

    importBtn.addEventListener('click', () => importFileInput.click());

    importFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const students = JSON.parse(e.target.result);
                    if (Array.isArray(students)) {
                        chrome.runtime.sendMessage({ action: "setStore", data: { students: students } }, () => init());
                    }
                } catch (error) { console.error("Error parsing JSON"); }
            };
            reader.readAsText(file);
        }
    });

    // --- Initial Load ---
    function init() {
        chrome.runtime.sendMessage({ action: "getStore" }, (store) => {
            allStudents = store.students || [];
            settings = store.settings || {};
            
            // Set saved date
            chrome.storage.local.get('startDate', (result) => {
                if (result.startDate) dateInput.value = result.startDate;
            });

            // Apply settings
            applyTheme(settings.theme || 'light');
            autoLoginToggle.checked = settings.autoLoginEnabled !== false;
            attendanceCalcToggle.checked = settings.attendanceCalculatorEnabled !== false;
            saveCredentialsToggle.checked = settings.saveCredentialsEnabled !== false;
            renderStudentList();
        });
    }

    init();
});