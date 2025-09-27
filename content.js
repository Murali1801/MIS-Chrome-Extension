// Check if the attendance calculator feature is enabled in settings before running the script.
chrome.storage.local.get('settings', (data) => {
    if (data && data.settings && data.settings.attendanceCalculatorEnabled) {
        main();
    }
});

function main() {
    console.log("Attendance Enhancer: Calculator script running!");

    /**
     * Finds the main attendance tables on the page and initiates the process to add columns.
     */
    function processOriginalTables() {
        const tables = document.querySelectorAll('table');
        // The attendance tables are typically the 2nd and 3rd tables on the page.
        if (tables.length >= 3) {
            addBunkRequiredColumns(tables[1]); // Theory table
            addBunkRequiredColumns(tables[2]); // Practical table
        }
    }

    /**
     * Adds the "Required" and "Bunks" columns and data to a given attendance table.
     * @param {HTMLTableElement} table - The table to modify.
     */
    function addBunkRequiredColumns(table) {
        if (!table) return;
        const headerRow = table.querySelector('tr');

        // Add headers only if they haven't been added already.
        if (headerRow && headerRow.querySelectorAll('th').length === 4) {
            const th1 = document.createElement('th');
            th1.textContent = 'Required for 75%';
            headerRow.appendChild(th1);

            const th2 = document.createElement('th');
            th2.textContent = 'Bunks available till 75%';
            headerRow.appendChild(th2);
        }

        const rows = table.querySelectorAll('tr');
        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');

            // The condition is now more specific: it processes a row if it has exactly 4 cells
            // AND the first cell does NOT contain a <b> tag (which specifically identifies the "Total" row).
            if (cells.length === 4 && !cells[0].querySelector('b')) {
                const totalText = cells[1].textContent.trim();
                const attendedText = cells[2].textContent.trim();

                const totalLectures = parseInt(totalText);
                const attendedLectures = parseInt(attendedText);

                if (!isNaN(totalLectures) && !isNaN(attendedLectures)) {
                    const { required, bunks } = calculateBunkAndRequired(totalLectures, attendedLectures);

                    const requiredCell = document.createElement('td');
                    requiredCell.textContent = required;
                    requiredCell.style.textAlign = 'center';
                    rows[i].appendChild(requiredCell);

                    const bunksCell = document.createElement('td');
                    bunksCell.textContent = bunks;
                    bunksCell.style.textAlign = 'center';
                    rows[i].appendChild(bunksCell);
                }
            }
        }
    }

    /**
     * Calculates the number of lectures required to meet 75% and the number of bunks available.
     */
    function calculateBunkAndRequired(total, attended) {
        let required = Math.ceil((0.75 * total - attended) / 0.25);
        if (required < 0) required = 0;

        let bunks = Math.floor((attended - 0.75 * total) / 0.75);
        if (bunks < 0) bunks = 0;

        return { required, bunks };
    }

    /**
     * Creates new tables to show attendance calculated from a specific date.
     */
    async function generateCustomDateTable(startDate) {
        const mainContent = document.querySelector('.col-sm-9.text-left');
        if (!mainContent) return;

        let container = document.getElementById('custom-date-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'custom-date-container';
            mainContent.appendChild(container);
        }

        try {
            const response = await fetch('itinenary_attendance_report.php');
            const htmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            const itineraryTable = doc.querySelector('table:last-of-type');
            if (!itineraryTable) {
                container.innerHTML = '<p>Error: Could not find the itinerary table.</p>';
                return;
            }
            const theoryData = {}, practicalData = {};
            const userStartDate = new Date(startDate.replace(/-/g, '/'));
            const reportTitle = doc.querySelector('th[colspan="4"]').textContent;
            const yearMatch = reportTitle.match(/\d{4}/g);
            if (!yearMatch) return;
            const reportYear = yearMatch[0];
            const rows = itineraryTable.querySelectorAll('tr');
            for (let i = 1; i < rows.length; i++) {
                const cells = rows[i].querySelectorAll('td');
                if (cells.length > 1 && cells[0].textContent.trim() !== '') {
                    const dateStr = cells[0].textContent.trim().split(' ')[0] + '-' + reportYear;
                    const lectureDate = new Date(dateStr);
                    if (lectureDate >= userStartDate) {
                        for (let j = 1; j < cells.length; j++) {
                            const lecture = cells[j].textContent.trim();
                            if (lecture !== '::' && lecture !== '') {
                                const parts = lecture.split(':');
                                if (parts.length >= 3) {
                                    const subjectAbbr = parts[1].trim();
                                    const lectureType = parts[2].trim();
                                    const dataObject = lectureType.toUpperCase().startsWith('P') ? practicalData : theoryData;
                                    if (!dataObject[subjectAbbr]) {
                                        dataObject[subjectAbbr] = { total: 0, attended: 0 };
                                    }
                                    dataObject[subjectAbbr].total++;
                                    const isAbsent = (cells[j].getAttribute('style') || '').includes('#FFB2B2');
                                    if (!isAbsent) {
                                        dataObject[subjectAbbr].attended++;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            const theoryTableHtml = createTableFromData(`Theory Attendance from ${startDate}`, theoryData, "Theory");
            const practicalTableHtml = createTableFromData(`Practical Attendance from ${startDate}`, practicalData, "Practical");
            container.innerHTML = theoryTableHtml + practicalTableHtml;
        } catch (error) {
            container.innerHTML = '<p>An error occurred while calculating attendance.</p>';
            console.error(error);
        }
    }

    /**
     * Helper function to build the HTML for the custom date tables.
     */
    function createTableFromData(title, data, type) {
        if (Object.keys(data).length === 0) return '';

        let tableHtml = `<br><label style="text-align: center; display: block;">${title}</label><table style="margin: auto;">`;
        tableHtml += '<tbody><tr><th>Subject</th>';
        tableHtml += type === "Theory" ? '<th>Total Lectures Conducted</th><th>Lectures Attended</th>' : '<th>Total Practical\'s Conducted</th><th>Practical\'s Attended</th>';
        tableHtml += '<th>(%)</th><th>Required for 75%</th><th>Bunks available till 75%</th></tr>';
        
        let overallTotal = 0, overallAttended = 0;

        for (const subject in data) {
            const subjectInfo = data[subject];
            const percentage = subjectInfo.total > 0 ? ((subjectInfo.attended / subjectInfo.total) * 100) : 0;
            
            let percentageHtml = percentage.toFixed(2);
            if (percentage < 75.00) {
                percentageHtml = `<font color="Red"><u><b>${percentage.toFixed(2)}</b></u></font>`;
            }

            overallTotal += subjectInfo.total;
            overallAttended += subjectInfo.attended;
            const { required, bunks } = calculateBunkAndRequired(subjectInfo.total, subjectInfo.attended);
            tableHtml += `<tr><td>${subject}</td><td style="text-align: center;">${subjectInfo.total}</td><td style="text-align: center;">${subjectInfo.attended}</td><td style="text-align: center;">${percentageHtml}</td><td style="text-align: center;">${required}</td><td style="text-align: center;">${bunks}</td></tr>`;
        }

        tableHtml += `<tr><td style="text-align: right;"><b>Total</b></td><td style="text-align: center;"><b>${overallTotal}</b></td><td style="text-align: center;"><b>${overallAttended}</b></td><td colspan="4"></td></tr></tbody></table>`;
        
        const overallPercentage = overallTotal > 0 ? ((overallAttended / overallTotal) * 100).toFixed(2) : "0.00";
        tableHtml += `<label style='text-align: center;'>Overall ${type} Attendance: ${overallPercentage}%</label>`;

        return tableHtml;
    }

    // Main execution starts here
    $(document).ready(function() {
        processOriginalTables();
        
        chrome.storage.local.get(['startDate'], function(result) {
            if (result.startDate) {
                generateCustomDateTable(result.startDate);
            }
        });
    });
}

