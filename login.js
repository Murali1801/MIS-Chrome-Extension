// Check if auto-login is enabled before running
chrome.storage.local.get('settings', (data) => {
    if (data.settings && data.settings.autoLoginEnabled) {
        main();
    }
});

function main() {
    $(document).ready(function() {
        // --- Inject CSS for the dropdown ---
        const styles = `
            .enhancer-dropdown-container {
                position: absolute;
                border: 1px solid #d1d5db;
                background-color: white;
                z-index: 1000;
                max-height: 200px;
                overflow-y: auto;
                border-radius: 6px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .enhancer-dropdown-item {
                padding: 10px;
                cursor: pointer;
                font-size: 14px;
            }
            .enhancer-dropdown-item:hover {
                background-color: #f3f4f6;
            }
            .enhancer-dropdown-item strong {
                color: #2563eb;
            }
        `;
        $('<style>').text(styles).appendTo('head');

        // --- Main script logic ---
        const $usernameInput = $('input[name="username"]');
        const $passwordInput = $('input[name="password"]');
        const $loginButton = $('#sbt_butt');
        let studentData = [];

        if ($usernameInput.length === 0) return;

        chrome.runtime.sendMessage({ action: "getStore" }, (store) => {
            if (store && store.students) {
                studentData = store.students;
            }
        });

        const $resultsDropdown = $('<div></div>')
            .addClass('enhancer-dropdown-container')
            .css({ width: $usernameInput.outerWidth() })
            .hide();
        
        $usernameInput.after($resultsDropdown);

        $usernameInput.on('input', function() {
            const query = $usernameInput.val().toLowerCase();
            $resultsDropdown.empty().hide();

            if (query.length > 0) {
                const filteredStudents = studentData.filter(student =>
                    student.studentid.toLowerCase().includes(query)
                );

                if (filteredStudents.length > 0) {
                    filteredStudents.forEach(student => {
                        const highlightedName = student.studentid.replace(new RegExp(query, 'gi'), (match) => `<strong>${match}</strong>`);
                        const $item = $('<div></div>')
                            .addClass('enhancer-dropdown-item')
                            .html(highlightedName)
                            .on('click', function() {
                                $usernameInput.val(student.studentid);
                                $passwordInput.val(student.studentpwd);
                                $resultsDropdown.hide();
                                $loginButton.click();
                            });
                        $resultsDropdown.append($item);
                    });
                    $resultsDropdown.show();
                }
            }
        });

        $(document).on('click', function(e) {
            if (!$(e.target).is($usernameInput)) {
                $resultsDropdown.hide();
            }
        });
    });
}