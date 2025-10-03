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
    const credentialForm = document.getElementById('credential_form');
    const managerTitle = document.getElementById('manager_title');
    const studentIdInput = document.getElementById('student_id');
    const studentPwdInput = document.getElementById('student_pwd');
    const originalStudentIdInput = document.getElementById('original_student_id');
    const saveCredentialBtn = document.getElementById('save_credential_btn');
    const cancelEditBtn = document.getElementById('cancel_edit_btn');
    
    let allStudents = [];
    let settings = {};

    // --- Mode Management for Add/Edit Form ---
    function setFormMode(mode, student = {}) {
        if (mode === 'edit') {
            managerTitle.textContent = 'Edit User';
            originalStudentIdInput.value = student.studentid;
            studentIdInput.value = student.studentid;
            studentPwdInput.value = student.studentpwd;
            saveCredentialBtn.textContent = 'Update User';
            cancelEditBtn.style.display = 'block';
        } else { // 'add' mode
            managerTitle.textContent = 'Add / Edit User';
            credentialForm.reset();
            originalStudentIdInput.value = '';
            saveCredentialBtn.textContent = 'Add User';
            cancelEditBtn.style.display = 'none';
        }
    }

    // --- Theme & Settings ---
    function applyTheme(theme) {
        body.setAttribute('data-theme', theme);
        themeIcon.src = theme === 'dark' ? 'sun-icon.svg' : 'moon-icon.svg';
    }

    themeToggleBtn.addEventListener('click', () => {
        settings.theme = body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(settings.theme);
        chrome.runtime.sendMessage({ action: "setStore", data: { settings } });
    });

    autoLoginToggle.addEventListener('change', () => {
        settings.autoLoginEnabled = autoLoginToggle.checked;
        chrome.runtime.sendMessage({ action: "setStore", data: { settings } });
    });
    attendanceCalcToggle.addEventListener('change', () => {
        settings.attendanceCalculatorEnabled = attendanceCalcToggle.checked;
        chrome.runtime.sendMessage({ action: "setStore", data: { settings } });
    });
    saveCredentialsToggle.addEventListener('change', () => {
        settings.saveCredentialsEnabled = saveCredentialsToggle.checked;
        chrome.runtime.sendMessage({ action: "setStore", data: { settings } });
    });

    // --- Data & UI Rendering ---
    function renderStudentList(filter = '') {
        studentListDiv.innerHTML = '';
        const filteredStudents = allStudents.filter(s => s.studentid.toLowerCase().includes(filter.toLowerCase()));
        
        filteredStudents.forEach(student => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'student-item';
            itemDiv.innerHTML = `
                <input type="checkbox" data-studentid="${student.studentid}">
                <span class="student-name">${student.studentid}</span>
                <button class="edit-btn">Edit</button>
            `;
            // Add listener to the edit button for this specific student
            itemDiv.querySelector('.edit-btn').addEventListener('click', () => {
                setFormMode('edit', student);
            });
            studentListDiv.appendChild(itemDiv);
        });
        updateSelectAllState();
    }
    
    function updateSelectAllState() {
        const checkboxes = studentListDiv.querySelectorAll('input[type="checkbox"]');
        if (checkboxes.length === 0) { selectAllCheckbox.checked = false; selectAllCheckbox.indeterminate = false; return; }
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        selectAllCheckbox.checked = checkedCount === checkboxes.length;
        selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }
    
    // --- Event Listeners ---
    credentialForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const student = {
            studentid: studentIdInput.value.trim(),
            studentpwd: studentPwdInput.value.trim()
        };
        const originalId = originalStudentIdInput.value || student.studentid;
        
        if (!student.studentid || !student.studentpwd) return;

        chrome.runtime.sendMessage({ action: "addOrUpdateStudent", student, originalId }, () => {
            setFormMode('add');
            init(); // Refresh list
        });
    });
    
    cancelEditBtn.addEventListener('click', () => setFormMode('add'));

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
                        chrome.runtime.sendMessage({ action: "importStudents", students }, () => init());
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
            
            chrome.storage.local.get('startDate', (result) => {
                if (result.startDate) dateInput.value = result.startDate;
            });

            applyTheme(settings.theme || 'light');
            autoLoginToggle.checked = settings.autoLoginEnabled !== false;
            attendanceCalcToggle.checked = settings.attendanceCalculatorEnabled !== false;
            saveCredentialsToggle.checked = settings.saveCredentialsEnabled !== false;
            renderStudentList();
        });
    }

    init();
});

