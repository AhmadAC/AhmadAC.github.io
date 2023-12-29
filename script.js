let counter = 1;
let hasReset = false;
let users = [];
let config = {};
let report = {
    updatedAt: null
};

let maxId = 0;
let clearBtn = document.querySelector("#clearBtn");
let errorMessage = document.querySelector("#errorMessage");
let successMessage = document.querySelector("#successMessage");
let infoMessage = document.querySelector("#infoMessage");
let attendancePercentage = document.querySelector("#attendancePercentage");
let totalData = document.querySelector("#totalData");

let inputText = document.querySelector("#inputText");

let submitBtn = document.querySelector("#submitBtn");
let resultList = document.querySelector("#resultList");
let exportBtn = document.querySelector("#exportBtn");

setupTable();
setupConfig();

async function submit() {
    if (window.screen.width >= 767.98) {
        inputText = document.querySelector("#inputText2");
    }
    if (users.length > 0) {
        maxId = getHighestId(users);
    }
    let names = processInput(inputText.value);
    inputText.value = "";

    if (names.length < 1) {
        showError(createError(422, 'Input is empty'));
        return 0;
    }

    for (let name of names) {
        try {
            let user = await createItem(maxId + 1, name);
            saveItem(user);
        } catch (error) {
            showError(error);
        }
        maxId++;
    }
    setupTable();
}

function processInput(inputText) {
    return inputText.split(/[\n,]/).filter(Boolean);
}


function getHighestId(objectArray) {
    max = objectArray.reduce((a, b) => a.id > b.id ? a : b).id;;
    return max;
}

function createItem(id, name) {
    return new Promise(function (resolve, reject) {
        if (name === "") {
            error = createError(422, 'Input is empty');
            reject(error);
        }

        let data = {
            id: id,
            name: name,
            check: false,
            late: false
        };

        resolve(data);
    });
}

function removeItem(id) {
    if (!id) {
        showError(createError(500, 'Item id was not recognized'));
        return 0;
    }
    if (!confirm(`Are you sure want to delete this user ?`)) {
        showInfo('Cancelled');
        return 0;
    }
    deleteItem(id);
    setupTable();
    showSuccess('Data Removed');
}

function deleteItem(id) {
    users = users.filter(item => item.id !== id);
    updateAllItem();
}

function saveItem(user) {
    users.push(user);
    localStorage.setItem("users", JSON.stringify(users));
    showSuccess('Data Saved');
}

function updateAllItem() {
    localStorage.setItem("users", JSON.stringify(users));
}

function getItem() {
    return new Promise(function (resolve, reject) {
        let users = localStorage.getItem("users");
        if (users) {
            resolve(JSON.parse(users));
        } else {
            reject(createError(500, 'No User saved'));
        }
    });
}

async function setupTable() {
    counter = 1;
    resultList.innerHTML = "";
    try {
        let data = await getItem();
        users = data;
        for (let user of users) {
            addRow(user)
        }
    } catch (error) {
        if (!hasReset) {
            showError(error)
        }
    }

    totalData.innerHTML = `<i class="me-1 fa-solid fa-user-group"></i> ${users.length} `;
    setAttendancePercentage(calculateAttendancePercentage(users));
}

function addRow(user) {
    let tr = document.createElement("tr");

    tr.innerHTML = `
            <th scope="row" class="w-80">
                <button
                    type="button"
                    onclick="removeItem(${user.id})"
                    class="remove-btn me-2 btn btn-sm btn-outline-danger"
                >
                    <i class="fa-solid fa-square-minus"></i>
                </button>
                ${counter}
            </th>
            <td>${user.name}</td>
            <td class='text-center w-64'>
                <input class="form-check-input late-checkbox" type="checkbox" onclick="checkLate(${user.id})" ${user.late ? 'checked' : ''} >
            </td>
            <td class='text-center w-96'>
                <input class="form-check-input" type="checkbox" onclick="check(${user.id})" ${user.check ? 'checked' : ''} >
            </td>
        `;

    resultList.appendChild(tr);
    counter++;
}

function generateArrivalDateTime(late = false) {
    var currentDate = new Date();
    try {
        if (config.clockInDateType === 'custom') {
            var dateConfig = config.clockInDate;
            var [year, month, day] = dateConfig.split('-');
            currentDate.setFullYear(year);
            currentDate.setMonth(month - 1); // Note: month is 0-indexed
            currentDate.setDate(day);
        }

        if (!isNaN(currentDate.getTime())) {
            if (config.clockInTimeType === 'current') {
                return currentDate;
            }

            var timeConfig = config.clockInTime;
            var [hours, minutes] = timeConfig.split(':');
            if (late && config.lateType === 'custom') {
                minutes = parseInt(minutes);
                minutes += parseInt(config.lateOffset);
            }

            currentDate.setHours(hours);
            currentDate.setMinutes(minutes);
            currentDate.setSeconds(0);

            if (isNaN(currentDate.getTime())) {
                currentDate = new Date();
            }

            if (late && config.lateType === 'current') {
                currentDate = new Date();
            }

            return currentDate;
        } else {
            return new Date();
        }
    } catch (error) {
        console.log(error);
        return new Date();
    }
}


function check(id) {
    var foundIndex = users.findIndex(u => u.id == id);
    users[foundIndex].check = !users[foundIndex].check;
    if (users[foundIndex].check) {
        users[foundIndex].Arrival = generateArrivalDateTime();
    } else {
        users[foundIndex].Arrival = null;

        if (users[foundIndex].late) {
            users[foundIndex].late = false;

            updateAllItem();
            setupTable();
            setAttendancePercentage(calculateAttendancePercentage(users));
        }
    }

    updateAllItem();
    setAttendancePercentage(calculateAttendancePercentage(users));
}

function checkLate(id) {
    var foundIndex = users.findIndex(u => u.id == id);

    if (users[foundIndex].check) {
        users[foundIndex].late = !users[foundIndex].late;

        // If the student is marked late, set the Arrival property to the current date and time
        if (users[foundIndex].late) {
            users[foundIndex].Arrival = generateArrivalDateTime(true);
        } else {
            if (config.clockInTimeType === 'custom' || config.clockInDateType === 'custom') {
                users[foundIndex].Arrival = generateArrivalDateTime(false);
            }
        }

        updateAllItem();
        setupTable();
    } else {
        check(id);
        checkLate(id);
    }
}

function calculateAttendancePercentage(array) {
    let attendanceCount = 0;
    for (let i = 0; i < array.length; i++) {
        if (array[i].check) {
            attendanceCount++;
        }
    }
    let divider = array.length == 0 ? 1 : array.length;
    return (attendanceCount / divider) * 100;
}

function setAttendancePercentage(value) {
    attendancePercentage.innerHTML = `${value.toFixed(2)}%`;

    if (value == 100) {
        attendancePercentage.className = "mb-1 fw-bold text-success-emphasis";
    } else if (value > 70) {
        attendancePercentage.className = "mb-1 fw-bold text-info";
    } else if (value >= 50 && value <= 70) {
        attendancePercentage.className = "mb-1 fw-bold text-warning";
    } else {
        attendancePercentage.className = "mb-1 fw-bold text-danger";
    }
}

function reset() {
    hasReset = true;
    if (users.length == 0) {
        showError(createError(432, 'No Data Available'));
        return 0;
    }
    if (confirm(`Are you sure want to delete all the names?`)) {
        users = [];
        localStorage.removeItem('users');
        setupTable();
        showSuccess('Data Cleared');
    } else {
        showInfo('Cancelled');
    }
}

function resetCheck() {
    if (users.length == 0) {
        showError(createError(432, 'No Data Available'));
        return 0;
    }
    if (confirm(`Are you sure want to reset attendance?`)) {
        for (let i = 0; i < users.length; i++) {
            users[i].check = false;
            users[i].late = false;
            users[i].Arrival = null;
        }

        updateAllItem();
        setupTable();
        showSuccess('Attendance Reset');
    } else {
        showInfo('Cancelled');
    }
}

function checkAll() {
    if (users.length == 0) {
        showError(createError(432, 'No Data Available'));
        return 0;
    }

    if (confirm(`Are you sure want to check all attendance?`)) {
        for (let i = 0; i < users.length; i++) {
            if (!users[i].check) {
                check(users[i].id);
            }
        }

        setupTable();
        showSuccess('Checked All');
    } else {
        showInfo('Cancelled');
    }
}

function formatDateTime(unformattedDateTime) {
    unformattedDateTime = new Date(unformattedDateTime);
    let date = unformattedDateTime.getDate();
    let day = unformattedDateTime.getDay();
    let month = unformattedDateTime.getMonth();
    let hour = unformattedDateTime.getHours();
    let minute = unformattedDateTime.getMinutes();
    let second = unformattedDateTime.getSeconds();

    let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    let suffix = "th";
    if (date % 10 === 1 && date % 100 !== 11) {
        suffix = "st";
    } else if (date % 10 === 2 && date % 100 !== 12) {
        suffix = "nd";
    } else if (date % 10 === 3 && date % 100 !== 13) {
        suffix = "rd";
    }

    let formattedDateTime = `${days[day]} ${date}${suffix} ${months[month]}, ${("0" + hour).slice(-2)}:${("0" + minute).slice(-2)}:${("0" + second).slice(-2)}`;
    return formattedDateTime;
}

function prepareExportData() {
    let objects = [];
    for (let i = 0; i < users.length; i++) {
        let Arrival = users[i].Arrival ? formatDateTime(users[i].Arrival) : ' n/a ';
        let obj = {
            Number: i + 1,
            Arrival: Arrival,
            Name: users[i].name,
            Status: users[i].check ? 'Present' : 'Absent',
            Late: users[i].late ? 'Late' : '-'
        }

        objects.push(obj);
    }

    return objects;
}

function exportData() {
    let exportData = prepareExportData();
    if (exportData.length < 1) {
        showError(createError(432, 'No export Data'));
        return 0;
    }

    let nowDate = new Date();
    let dateString = nowDate.getFullYear() + '-' + (nowDate.getMonth() + 1) + '-' + nowDate.getDate();
    let filename = dateString + '_Attendance.xlsx';
    var ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = Array.from({ length: 4 }, (_, i) => ({ wch: 20 }));
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Names");
    XLSX.writeFile(wb, filename);
}

let objects; // Declare objects globally

function generateReport() {
    objects = prepareExportData(); // Assign data to objects
    report.updatedAt = new Date().toLocaleString();
    generateHTMLTable(objects);
}

function generateHTMLTable(objects) {
    document.getElementById('generateButtonText').innerHTML = 'Update Report';
    document.getElementById('reportUpdatedAt').innerHTML = report.updatedAt ?? '';
    let html = '<table id="summary-table" border="1" class="table table-light table-hover w-100 mt-0 mb-0">';

    html += '<tr class="bg-light">';
    for (let key in objects[0]) {
        html += `<th onclick="sortTable('${key}')">${key}</th>`;
    }
    html += '</tr>';

    // Add table body rows with alternating colors
    for (let i = 0; i < objects.length; i++) {
        html += '<tr>';
        for (let key in objects[i]) {
            let color = config && config.oddRowReportColor ? config.oddRowReportColor : '#ffffff';
            let textColor = config && config.textRowReportColor ? config.textRowReportColor : '#000000'
            if ((i + 1) % 2 == 0) color = config && config.evenRowReportColor ? config.evenRowReportColor : '#f2f2f2';
            html += `<td style="white-space: nowrap; background-color:${color}; color:${textColor};" ondblclick="editCell(this)">${objects[i][key]}</td>`;
        }

        html += '</tr>';
    }

    html += '</table>';
    document.getElementById('summary-container').innerHTML = html;
    showInfo('Report updated!');
}

function editCell(cell) {
    let originalContent = cell.textContent;
    cell.textContent = '';
    let input = document.createElement('input');
    input.type = 'text';
    input.value = originalContent;
    input.onblur = function () {
        cell.textContent = this.value;
    };
    cell.appendChild(input);
    input.focus();
}


function sortTable(column) {
    // Sort objects based on the specified column
    objects.sort((a, b) => {
        let A = a[column];
        let B = b[column];

        if (!isNaN(A) && !isNaN(B)) {
            return A - B;
        } else {
            return A.localeCompare(B);
        }
    });

    // Regenerate the table with sorted objects
    generateHTMLTable(objects);
}


// function downloadDivAsImage(divId, fileName) {
//     // Get the HTML element to capture
//     const element = document.getElementById(divId);

//     // Use dom-to-image to capture the content as an image
//     domtoimage.toBlob(element)
//         .then(blob => {
//             // Create a link element and set its attributes
//             const link = document.createElement('a');
//             link.href = URL.createObjectURL(blob);
//             link.download = fileName || 'download.png';

//             // Trigger a click on the link to start the download
//             link.click();
//         })
//         .catch(error => {
//             console.error('Error capturing div as image:', error);
//         });
// }

function downloadFullDivAsImage(divId, fileName) {
    const element = document.getElementById(divId);

    // Adjust the zoom level to fit the content
    function adjustZoomToAvoidOverflow(element) {
        let zoomLevel = 1;

        function isOverflowing(element) {
            return element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
        }

        while (isOverflowing(element) && zoomLevel > 0.1) {
            zoomLevel -= 0.1;
            element.style.zoom = zoomLevel;
        }
    }

    adjustZoomToAvoidOverflow(element);

    // Use html2canvas to capture the content as an image
    html2canvas(element, {
        scrollY: -window.scrollY,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        allowTaint: true,
        useCORS: true,
    })
        .then(canvas => {
            // Reset the zoom level after capturing the image
            element.style.zoom = 1;

            // Create a link element and set its attributes
            const link = document.createElement('a');
            link.href = canvas.toDataURL();
            link.download = fileName || 'full_div_image.png';

            // Trigger a click on the link to start the download
            link.click();
        })
        .catch(error => {
            console.error('Error capturing full div as image:', error);
        });
}

function downloadSummaryTable() {
    // Check if the summary table exists
    if (!document.getElementById('summary-table')) {
        generateReport();
    }

    let nowDate = new Date();
    let dateString = nowDate.getFullYear() + '-' + (nowDate.getMonth() + 1) + '-' + nowDate.getDate();
    let filename = dateString + '_Attendance.png';

    // downloadDivAsImage('summary-container', filename);
    downloadFullDivAsImage('summary-container', filename);
}

function disableDependencyInput(elId, targetElId, value) {
    var selectElement = document.getElementById(elId);
    var inputElement = document.getElementById(targetElId);

    // Check the selected option value
    if (selectElement.value === value) {
        // Disable the input field
        inputElement.disabled = true;
        inputElement.style.opacity = 0.25;
    } else {
        // Enable the input field
        inputElement.disabled = false;
        inputElement.style.opacity = 1;
    }
}

function saveConfig() {
    let clockInDateType = document.getElementById("clockInDateConfigSelect").value ?? 'current';
    let clockInDate = document.getElementById("clockInDateInput").value ?? null;
    let clockInTimeType = document.getElementById("clockInTimeConfigSelect").value ?? 'current';
    let clockInTime = document.getElementById("clockInTimeInput").value ?? null;
    let lateType = document.getElementById("lateConfigSelect").value ?? 'current';
    let lateOffset = document.getElementById("lateOffsetInput").value ?? null;
    let evenRowReportColor = document.getElementById("evenReportRowColorInput").value ?? '#f2f2f2';
    let oddRowReportColor = document.getElementById("oddReportRowColorInput").value ?? '#ffffff';
    let textRowReportColor = document.getElementById("textReportRowColorInput").value ?? '#000000';

    config = {
        clockInDateType: clockInDateType,
        clockInDate: clockInDate,
        clockInTimeType: clockInTimeType,
        clockInTime: clockInTime,
        lateType: lateType,
        lateOffset: lateOffset,
        oddRowReportColor: oddRowReportColor,
        evenRowReportColor: evenRowReportColor,
        textRowReportColor: textRowReportColor
    }

    localStorage.setItem("attendanceConfig", JSON.stringify(config));
    showSuccess('Config Saved');
}

function getConfig() {
    return new Promise(function (resolve, reject) {
        let config = localStorage.getItem("attendanceConfig");
        if (config) {
            resolve(JSON.parse(config));
        } else {
            reject(createError(500, 'No Config saved'));
        }
    });
}

async function setupConfig() {
    try {
        config = await getConfig();

        document.getElementById("clockInDateConfigSelect").value = config.clockInDateType ?? 'current';
        document.getElementById("clockInDateInput").value = config.clockInDate;
        document.getElementById("clockInTimeConfigSelect").value = config.clockInTimeType ?? 'current';
        document.getElementById("clockInTimeInput").value = config.clockInTime;
        document.getElementById("lateConfigSelect").value = config.lateType ?? 'current';
        document.getElementById("lateOffsetInput").value = config.lateOffset;
        document.getElementById("evenReportRowColorInput").value = config.evenRowReportColor ?? '#f2f2f2';
        document.getElementById("oddReportRowColorInput").value = config.oddRowReportColor ?? '#ffffff';
        document.getElementById("textReportRowColorInput").value = config.textRowReportColor ?? '#000000';
    } catch (error) {
        config = {};
        console.log(error);
    }

    disableDependencyInput('clockInDateConfigSelect', 'clockInDateInput', 'current');
    disableDependencyInput('clockInTimeConfigSelect', 'clockInTimeInput', 'current');
    disableDependencyInput('lateConfigSelect', 'lateOffsetInput', 'current');
}

function createError(statusCode, message) {
    let error = {
        'status': statusCode,
        'message': message
    }
    return error
}

function showError(error) {
    errorMessage.classList.remove("d-none");
    errorMessage.innerHTML = error.message;
    setTimeout(function () {
        errorMessage.classList.add("d-none");
    }, 3000);
}

function showSuccess(message) {
    successMessage.classList.remove("d-none");
    successMessage.innerHTML = message;
    setTimeout(function () {
        successMessage.classList.add("d-none");
    }, 3000);
}

function showInfo(message) {
    infoMessage.classList.remove("d-none");
    infoMessage.innerHTML = message;
    setTimeout(function () {
        infoMessage.classList.add("d-none");
    }, 3000);
}
