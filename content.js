// Check if the attendance calculator is enabled in settings before running any code.
chrome.storage.local.get('settings', (data) => {
    if (data && data.settings && data.settings.attendanceCalculatorEnabled) {
        main();
    }
});

/**
 * Main function to initialize all attendance calculation features.
 */
function main() {
    console.log("Attendance Enhancer: Calculator script loaded!");

    /**
     * Finds the main attendance tables on the page and processes them.
     */
    function processOriginalTables() {
        const tables = document.querySelectorAll('table');
        if (tables.length >= 3) {
            addBunkRequiredColumns(tables[1]); // Theory table
            addBunkRequiredColumns(tables[2]); // Practical table
        }
    }

    /**
     * Adds "Required for 75%" and "Bunks available" columns to a given table
     * AND corrects the formatting of the percentage column.
     * @param {HTMLTableElement} table - The table element to modify.
     */
    function addBunkRequiredColumns(table) {
        if (!table) return;
        const headerRow = table.querySelector('tr');

        if (headerRow && headerRow.querySelectorAll('th').length === 4) {
            headerRow.innerHTML += '<th>Required for 75%</th><th>Bunks available till 75%</th>';
        }

        const rows = table.querySelectorAll('tr');
        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');

            if (cells.length === 4 && !cells[0].querySelector('b')) {
                const totalLectures = parseInt(cells[1].textContent.trim());
                const attendedLectures = parseInt(cells[2].textContent.trim());

                if (!isNaN(totalLectures) && !isNaN(attendedLectures)) {
                    // **FIX**: Recalculate percentage and re-format the cell to ensure consistency.
                    const percentage = totalLectures > 0 ? (attendedLectures / totalLectures) * 100 : 0;
                    const percentageCell = cells[3];
                    
                    let percentageHtml = percentage.toFixed(2);
                    if (percentage < 75) {
                        percentageHtml = `<font color="Red"><u><b>${percentage.toFixed(2)}</b></u></font>`;
                    }
                    percentageCell.innerHTML = percentageHtml;
                    // **FIX END**

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
     * Calculates required lectures and available bunks to maintain 75% attendance.
     */
    function calculateBunkAndRequired(total, attended) {
        let required = Math.ceil((0.75 * total - attended) / 0.25);
        if (required < 0) required = 0;

        let bunks = Math.floor((attended - 0.75 * total) / 0.75);
        if (bunks < 0) bunks = 0;

        return { required, bunks };
    }

    /**
     * Creates new HTML tables for the custom date calculation feature, matching the original style.
     */
    function createTableFromData(title, data, type) {
        if (Object.keys(data).length === 0) return '';

        let tableHtml = `<br><label style='text-align: center; display: block;'>${title}</label><table style="margin: auto;"><tbody>`;
        tableHtml += '<tr><th>Subject</th>';
        tableHtml += type === "Theory" ? '<th>Total Lectures Conducted</th><th>Lectures Attended</th>' : '<th>Total Practical\'s Conducted</th><th>Practical\'s Attended</th>';
        tableHtml += '<th>(%)</th><th>Required for 75%</th><th>Bunks available till 75%</th></tr>';
        
        let overallTotal = 0, overallAttended = 0;

        for (const subject in data) {
            const subjectInfo = data[subject];
            const percentage = subjectInfo.total > 0 ? ((subjectInfo.attended / subjectInfo.total) * 100) : 0;
            
            let percentageHtml = percentage.toFixed(2);
            if (percentage < 75) {
                percentageHtml = `<font color="Red"><u><b>${percentage.toFixed(2)}</b></u></font>`;
            }

            overallTotal += subjectInfo.total;
            overallAttended += subjectInfo.attended;
            const { required, bunks } = calculateBunkAndRequired(subjectInfo.total, subjectInfo.attended);
            tableHtml += `<tr>
                <td>${subject}</td>
                <td style="text-align: center;">${subjectInfo.total}</td>
                <td style="text-align: center;">${subjectInfo.attended}</td>
                <td style="text-align: center;">${percentageHtml}</td>
                <td style="text-align: center;">${required}</td>
                <td style="text-align: center;">${bunks}</td>
            </tr>`;
        }

        tableHtml += `<tr><td style="text-align: right;"><b>Total</b></td><td style="text-align: center;"><b>${overallTotal}</b></td><td style="text-align: center;"><b>${overallAttended}</b></td><td colspan="3"></td></tr></tbody></table>`;
        
        const overallPercentage = overallTotal > 0 ? ((overallAttended / overallTotal) * 100).toFixed(2) : "0.00";
        tableHtml += `<label style='text-align: center;'>Overall ${type} Attendance: ${overallPercentage}%</label>`;

        return tableHtml;
    }

    /**
     * Fetches the detailed itinerary report to generate the custom date tables.
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
            container.innerHTML = '<p>An error occurred while calculating custom date attendance.</p>';
            console.error("Attendance Enhancer Error:", error);
        }
    }
    
    // --- Main execution ---
    $(document).ready(function() {
        processOriginalTables();
        chrome.storage.local.get(['startDate'], function(result) {
            if (result && result.startDate) {
                generateCustomDateTable(result.startDate);
            }
        });
    });
}

