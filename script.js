let counter = 1;
let hasReset = false;
let users = [];
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
    let list = inputText.split("\n").filter(Boolean);
    return list;
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
            check: false
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
            <th scope="row">
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
            <td class='text-center'>
                <input class="form-check-input" type="checkbox" onclick="check(${user.id})" ${user.check ? 'checked' : ''} >
            </td>
        `;

    resultList.appendChild(tr);
    counter++;
}

function check(id) {
    var foundIndex = users.findIndex(u => u.id == id);

    users[foundIndex].check = !users[foundIndex].check;
    if( users[foundIndex].check ){
        users[foundIndex].checkTime = new Date();
    }else{
        users[foundIndex].checkTime = null;
    }

    updateAllItem();
    setAttendancePercentage(calculateAttendancePercentage(users));
}

function calculateAttendancePercentage(array) {
    let attendanceCount = 0;
    for (let i = 0; i < array.length; i++) {
      if (array[i].check) {
        attendanceCount ++;
      }
    }
    let divider = array.length == 0 ? 1 : array.length ;
    return (attendanceCount / divider) * 100;
}

function setAttendancePercentage(value){
    attendancePercentage.innerHTML = `${value.toFixed(2)}%`;

    if(value == 100){
        attendancePercentage.className = "mb-1 fw-bold text-success-emphasis border-success border rounded-pill px-2 text-center bg-success bg-opacity-25";
    } else if(value > 70){
        attendancePercentage.className = "mb-1 fw-bold text-info";
    } else if (value >= 50 && value <=70){
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

function resetCheck(){
    if (users.length == 0) {
        showError(createError(432, 'No Data Available'));
        return 0;
    }
    if (confirm(`Are you sure want to reset attendance?`)) {
        for (let i = 0; i < users.length; i++) {
            users[i].check = false;
            users[i].checkTime = null;
        }

        updateAllItem();
        setupTable();
        showSuccess('Attendance Reset');
    } else {
        showInfo('Cancelled');
    }
    
}

function formatDateTime(unformattedDateTime){
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

    let formattedDateTime = `${date}${suffix} ${days[day]} ${months[month]}, ${("0" + hour).slice(-2)}:${("0" + minute).slice(-2)}:${("0" + second).slice(-2)}`;
    return formattedDateTime;
}

function prepareExportData() {
    let objects = [];
    for (let i = 0; i < users.length; i++) {
        let checkTime = users[i].checkTime ? formatDateTime(users[i].checkTime) : ' n/a ';
        let obj = {
            Number: i + 1,
            CheckTime: checkTime,
            Name: users[i].name,
            Status: users[i].check ? 'Present' : 'Absent',
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
