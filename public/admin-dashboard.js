// Admin Dashboard JavaScript
let currentUser = null;
let teachers = [];
let classes = [];
let sections = [];
let subjects = [];
let students = [];
let marks = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        window.location.href = '/index.html';
        return;
    }
    
    currentUser = JSON.parse(user);
    
    // Verify user is an admin
    if (currentUser.role !== 'admin') {
        alert('Access denied. Admin login required.');
        logout();
        return;
    }
    
    // Initialize dashboard
    initializeDashboard();
    loadDashboardData();
    
    // Set current date
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString();
});

function initializeDashboard() {
    // Set admin name
    document.getElementById('adminName').textContent = currentUser.name || currentUser.username;
    
    // Load all data
    loadTeachers();
    loadClasses();
    loadSections();
    loadSubjects();
    loadStudents();
    loadMarks();
}

async function loadDashboardData() {
    try {
        const token = localStorage.getItem('token');
        
        // Load dashboard statistics
        const [studentsRes, teachersRes, classesRes, subjectsRes] = await Promise.all([
            fetch('/api/students', {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('/api/teachers', {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('/api/classes', {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('/api/subjects', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);
        
        if (studentsRes.ok && teachersRes.ok && classesRes.ok && subjectsRes.ok) {
            const studentsData = await studentsRes.json();
            const teachersData = await teachersRes.json();
            const classesData = await classesRes.json();
            const subjectsData = await subjectsRes.json();
            
            // Update statistics
            document.getElementById('totalStudents').textContent = studentsData.length;
            document.getElementById('totalTeachers').textContent = teachersData.length;
            document.getElementById('totalClasses').textContent = classesData.length;
            document.getElementById('totalSubjects').textContent = subjectsData.length;
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

async function loadTeachers() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/teachers', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            teachers = await response.json();
            displayTeachers();
        } else {
            console.error('Failed to load teachers');
        }
    } catch (error) {
        console.error('Error loading teachers:', error);
    }
}

async function loadClasses() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/classes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            classes = await response.json();
            displayClasses();
            populateClassSelects();
        } else {
            console.error('Failed to load classes');
        }
    } catch (error) {
        console.error('Error loading classes:', error);
    }
}

async function loadSections() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/sections', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            sections = await response.json();
            displaySections();
            populateSectionSelects();
        } else {
            console.error('Failed to load sections');
        }
    } catch (error) {
        console.error('Error loading sections:', error);
    }
}

async function loadSubjects() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/subjects', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            subjects = await response.json();
            displaySubjects();
        } else {
            console.error('Failed to load subjects');
        }
    } catch (error) {
        console.error('Error loading subjects:', error);
    }
}

async function loadStudents() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/students', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            students = await response.json();
            displayStudents();
            populateStudentSelects();
        } else {
            console.error('Failed to load students');
        }
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

async function loadMarks() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/marks', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            marks = await response.json();
            displayMarks();
        } else {
            console.error('Failed to load marks');
        }
    } catch (error) {
        console.error('Error loading marks:', error);
    }
}

function displayTeachers() {
    const tbody = document.getElementById('teachersTable');
    
    if (teachers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No teachers found</td></tr>';
        return;
    }
    
    tbody.innerHTML = teachers.map(teacher => `
        <tr>
            <td>${teacher.name}</td>
            <td>${teacher.username}</td>
            <td>${teacher.email}</td>
            <td><span class="badge bg-success">${teacher.role}</span></td>
            <td>${new Date(teacher.created_at).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editTeacher(${teacher.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteTeacher(${teacher.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function displayClasses() {
    const div = document.getElementById('classesList');
    
    if (classes.length === 0) {
        div.innerHTML = '<p class="text-muted">No classes found</p>';
        return;
    }
    
    div.innerHTML = classes.map(cls => `
        <div class="d-flex justify-content-between align-items-center border-bottom py-2">
            <span>${cls.class_name}</span>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteClass(${cls.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function displaySections() {
    const div = document.getElementById('sectionsList');
    
    if (sections.length === 0) {
        div.innerHTML = '<p class="text-muted">No sections found</p>';
        return;
    }
    
    div.innerHTML = sections.map(section => `
        <div class="d-flex justify-content-between align-items-center border-bottom py-2">
            <span>${section.section_name}</span>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteSection(${section.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function displaySubjects() {
    const tbody = document.getElementById('subjectsTable');
    
    if (subjects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No subjects found</td></tr>';
        return;
    }
    
    tbody.innerHTML = subjects.map(subject => `
        <tr>
            <td>${subject.subject_name}</td>
            <td>${subject.subject_code || 'N/A'}</td>
            <td>${subject.class_name || 'All Classes'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editSubject(${subject.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteSubject(${subject.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function displayStudents() {
    const tbody = document.getElementById('studentsTable');
    
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No students found</td></tr>';
        return;
    }
    
    tbody.innerHTML = students.map(student => `
        <tr>
            <td>
                ${student.photo ? 
                    `<img src="/uploads/${student.photo}" alt="${student.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` :
                    '<i class="fas fa-user-circle fa-2x text-muted"></i>'
                }
            </td>
            <td>${student.name}</td>
            <td>${student.roll_number}</td>
            <td>${student.class_name || 'N/A'}</td>
            <td>${student.section_name || 'N/A'}</td>
            <td>${student.father_name || 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editStudent(${student.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-success" onclick="generateStudentMarksheet(${student.id})">
                    <i class="fas fa-file-pdf"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteStudent(${student.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function displayMarks() {
    const tbody = document.getElementById('marksTable');
    
    if (marks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No marks found</td></tr>';
        return;
    }
    
    tbody.innerHTML = marks.map(mark => {
        const grade = getGrade(mark.marks_obtained);
        return `
        <tr>
            <td>${mark.student_name}</td>
            <td>${mark.roll_number}</td>
            <td>${mark.subject_name}</td>
            <td>${mark.formative_20 || 0}</td>
            <td>${mark.summative_80 || 0}</td>
            <td>${mark.marks_obtained}</td>
            <td><span class="badge bg-${getGradeColor(grade)}">${grade}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editMarks(${mark.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteMarks(${mark.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
        `;
    }).join('');
}

function getGrade(marks) {
    if (marks >= 90) return 'A+';
    if (marks >= 80) return 'A';
    if (marks >= 70) return 'B+';
    if (marks >= 60) return 'B';
    if (marks >= 50) return 'C';
    return 'F';
}

function getGradeColor(grade) {
    switch(grade) {
        case 'A+': case 'A': return 'success';
        case 'B+': case 'B': return 'primary';
        case 'C': return 'warning';
        case 'F': return 'danger';
        default: return 'secondary';
    }
}

function populateClassSelects() {
    const selects = ['subjectClass', 'studentClass', 'reportClassSelect', 'bulkClassSelect'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            const currentValue = select.value;
            select.innerHTML = select.innerHTML.split('<option')[0] + '<option' + select.innerHTML.split('<option')[1];
            
            classes.forEach(cls => {
                const option = new Option(cls.class_name, cls.id);
                select.appendChild(option);
            });
            
            if (currentValue) select.value = currentValue;
        }
    });
}

function populateSectionSelects() {
    const select = document.getElementById('studentSection');
    if (select) {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select Section</option>';
        
        sections.forEach(section => {
            const option = new Option(section.section_name, section.id);
            select.appendChild(option);
        });
        
        if (currentValue) select.value = currentValue;
    }
}

function populateStudentSelects() {
    const selects = ['reportStudentSelect', 'marksStudentSelect'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Choose a student</option>';
            
            students.forEach(student => {
                const option = new Option(`${student.name} (${student.roll_number})`, student.id);
                select.appendChild(option);
            });
            
            if (currentValue) select.value = currentValue;
        }
    });
}

function populateSubjectSelects() {
    const select = document.getElementById('marksSubjectSelect');
    if (select) {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select Subject</option>';
        
        subjects.forEach(subject => {
            const option = new Option(subject.subject_name, subject.id);
            select.appendChild(option);
        });
        
        if (currentValue) select.value = currentValue;
    }
}

// Add functions
async function addTeacher() {
    const name = document.getElementById('teacherName').value;
    const username = document.getElementById('teacherUsername').value;
    const email = document.getElementById('teacherEmail').value;
    const password = document.getElementById('teacherPassword').value;
    
    if (!name || !username || !email || !password) {
        alert('Please fill all fields');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/teachers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, username, email, password })
        });
        
        if (response.ok) {
            alert('Teacher added successfully!');
            document.getElementById('addTeacherForm').reset();
            bootstrap.Modal.getInstance(document.getElementById('addTeacherModal')).hide();
            loadTeachers();
            loadDashboardData();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to add teacher');
        }
    } catch (error) {
        console.error('Error adding teacher:', error);
        alert('Error adding teacher. Please try again.');
    }
}

async function addClass() {
    const className = document.getElementById('className').value;
    
    if (!className) {
        alert('Please enter class name');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/classes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ class_name: className })
        });
        
        if (response.ok) {
            alert('Class added successfully!');
            document.getElementById('addClassForm').reset();
            bootstrap.Modal.getInstance(document.getElementById('addClassModal')).hide();
            loadClasses();
            loadDashboardData();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to add class');
        }
    } catch (error) {
        console.error('Error adding class:', error);
        alert('Error adding class. Please try again.');
    }
}

async function addSection() {
    const sectionName = document.getElementById('sectionName').value;
    
    if (!sectionName) {
        alert('Please enter section name');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/sections', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ section_name: sectionName })
        });
        
        if (response.ok) {
            alert('Section added successfully!');
            document.getElementById('addSectionForm').reset();
            bootstrap.Modal.getInstance(document.getElementById('addSectionModal')).hide();
            loadSections();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to add section');
        }
    } catch (error) {
        console.error('Error adding section:', error);
        alert('Error adding section. Please try again.');
    }
}

async function addSubject() {
    const subjectName = document.getElementById('subjectName').value;
    const subjectCode = document.getElementById('subjectCode').value;
    const classId = document.getElementById('subjectClass').value;
    
    if (!subjectName) {
        alert('Please enter subject name');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/subjects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                subject_name: subjectName, 
                subject_code: subjectCode,
                class_id: classId || null
            })
        });
        
        if (response.ok) {
            alert('Subject added successfully!');
            document.getElementById('addSubjectForm').reset();
            bootstrap.Modal.getInstance(document.getElementById('addSubjectModal')).hide();
            loadSubjects();
            loadDashboardData();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to add subject');
        }
    } catch (error) {
        console.error('Error adding subject:', error);
        alert('Error adding subject. Please try again.');
    }
}

async function addStudent() {
    const formData = new FormData();
    
    // Get all form values
    const fields = [
        'studentName', 'studentRoll', 'studentClass', 'studentSection',
        'studentFather', 'studentMother', 'studentDob', 'studentGender',
        'studentPhone', 'studentBloodGroup', 'studentAddress'
    ];
    
    const values = {};
    fields.forEach(field => {
        const element = document.getElementById(field);
        values[field] = element ? element.value : '';
    });
    
    // Validate required fields
    if (!values.studentName || !values.studentRoll || !values.studentClass || !values.studentSection) {
        alert('Please fill all required fields (Name, Roll, Class, Section)');
        return;
    }
    
    // Append form data
    formData.append('name', values.studentName);
    formData.append('roll_number', values.studentRoll);
    formData.append('class_id', values.studentClass);
    formData.append('section_id', values.studentSection);
    formData.append('father_name', values.studentFather);
    formData.append('mother_name', values.studentMother);
    formData.append('dob', values.studentDob);
    formData.append('gender', values.studentGender);
    formData.append('phone', values.studentPhone);
    formData.append('blood_group', values.studentBloodGroup);
    formData.append('address', values.studentAddress);
    
    // Add photo if selected
    const photoFile = document.getElementById('studentPhoto').files[0];
    if (photoFile) {
        if (photoFile.size > 1024 * 1024) {
            alert('Photo size must be less than 1MB');
            return;
        }
        formData.append('photo', photoFile);
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/students', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (response.ok) {
            alert('Student added successfully!');
            document.getElementById('addStudentForm').reset();
            bootstrap.Modal.getInstance(document.getElementById('addStudentModal')).hide();
            loadStudents();
            loadDashboardData();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to add student');
        }
    } catch (error) {
        console.error('Error adding student:', error);
        alert('Error adding student. Please try again.');
    }
}

// Generate marksheet functions
async function generateIndividualMarksheet() {
    const studentId = document.getElementById('reportStudentSelect').value;
    
    if (!studentId) {
        alert('Please select a student');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/marksheet/student/${studentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `marksheet_student_${studentId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to generate marksheet');
        }
    } catch (error) {
        console.error('Error generating marksheet:', error);
        alert('Error generating marksheet. Please try again.');
    }
}

function generateStudentMarksheet(studentId) {
    document.getElementById('reportStudentSelect').value = studentId;
    showSection('reports');
    generateIndividualMarksheet();
}

// Add marks functionality
function setupMarksForm() {
    const form = document.getElementById('individualMarksForm');
    if (form) {
        form.addEventListener('submit', handleMarksSubmit);
    }
}

async function handleMarksSubmit(e) {
    e.preventDefault();
    
    const studentId = document.getElementById('marksStudentSelect').value;
    const subjectId = document.getElementById('marksSubjectSelect').value;
    const formative = document.getElementById('formativeMarks').value;
    const summative = document.getElementById('summativeMarks').value;
    
    if (!studentId || !subjectId || !formative || !summative) {
        alert('Please fill all fields');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/marks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                student_id: studentId,
                subject_id: subjectId,
                formative_20: formative,
                summative_80: summative
            })
        });
        
        if (response.ok) {
            alert('Marks saved successfully!');
            document.getElementById('individualMarksForm').reset();
            loadMarks();
            loadDashboardData();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to save marks');
        }
    } catch (error) {
        console.error('Error saving marks:', error);
        alert('Error saving marks. Please try again.');
    }
}

async function generateClassMarksheet() {
    const classId = document.getElementById('reportClassSelect').value;
    
    if (!classId) {
        alert('Please select a class');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/marksheet/class/${classId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `class_marksheet_${classId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to generate class marksheet');
        }
    } catch (error) {
        console.error('Error generating class marksheet:', error);
        alert('Error generating class marksheet. Please try again.');
    }
}

// Bulk marks functionality
let bulkStudents = [];
let bulkSubjects = [];

function loadBulkSections() {
    const classId = document.getElementById('bulkClassSelect').value;
    const sectionSelect = document.getElementById('bulkSectionSelect');
    const showBtn = document.getElementById('showBulkTableBtn');
    
    sectionSelect.innerHTML = '<option value="">Choose Section</option>';
    showBtn.disabled = true;
    
    if (!classId) return;
    
    sections.forEach(section => {
        const option = new Option(section.section_name, section.id);
        sectionSelect.appendChild(option);
    });
}

function loadBulkStudents() {
    const classId = document.getElementById('bulkClassSelect').value;
    const sectionId = document.getElementById('bulkSectionSelect').value;
    const showBtn = document.getElementById('showBulkTableBtn');
    
    if (classId && sectionId) {
        showBtn.disabled = false;
    } else {
        showBtn.disabled = true;
    }
}

async function showBulkMarksTable() {
    const classId = document.getElementById('bulkClassSelect').value;
    const sectionId = document.getElementById('bulkSectionSelect').value;
    
    if (!classId || !sectionId) {
        alert('Please select both class and section');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        // Get students for selected class and section
        const studentsResponse = await fetch('/api/students', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (studentsResponse.ok) {
            const allStudents = await studentsResponse.json();
            bulkStudents = allStudents.filter(student => 
                student.class_id == classId && student.section_id == sectionId
            );
            
            // Get subjects for the class
            const subjectsResponse = await fetch('/api/subjects', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (subjectsResponse.ok) {
                const allSubjects = await subjectsResponse.json();
                bulkSubjects = allSubjects.filter(subject => 
                    !subject.class_id || subject.class_id == classId
                );
                
                generateBulkMarksTable();
            }
        }
    } catch (error) {
        console.error('Error loading bulk marks data:', error);
        alert('Error loading data. Please try again.');
    }
}

function generateBulkMarksTable() {
    const className = classes.find(c => c.id == document.getElementById('bulkClassSelect').value)?.class_name;
    const sectionName = sections.find(s => s.id == document.getElementById('bulkSectionSelect').value)?.section_name;
    
    document.getElementById('selectedClassSection').textContent = `${className} - ${sectionName}`;
    
    // Update subjects header colspan
    document.getElementById('subjectsHeader').setAttribute('colspan', bulkSubjects.length);
    
    // Generate subject columns
    const subjectColumns = document.getElementById('subjectColumns');
    subjectColumns.innerHTML = bulkSubjects.map(subject => 
        `<th class="text-center">${subject.subject_name}<br><small>(Max: 100)</small></th>`
    ).join('');
    
    // Generate student rows
    const tbody = document.getElementById('bulkMarksTableBody');
    tbody.innerHTML = bulkStudents.map(student => {
        const subjectInputs = bulkSubjects.map(subject => 
            `<td><input type="number" class="form-control form-control-sm text-center" 
                       id="marks_${student.id}_${subject.id}" 
                       min="0" max="100" placeholder="0"></td>`
        ).join('');
        
        return `
            <tr>
                <td class="text-center">${student.roll_number}</td>
                <td>${student.name}</td>
                ${subjectInputs}
            </tr>
        `;
    }).join('');
    
    // Show the table
    document.getElementById('bulkMarksTableCard').style.display = 'block';
    
    // Scroll to table
    document.getElementById('bulkMarksTableCard').scrollIntoView({ behavior: 'smooth' });
}

async function saveBulkMarks() {
    const token = localStorage.getItem('token');
    const marksData = [];
    
    // Collect all marks from the table
    for (const student of bulkStudents) {
        for (const subject of bulkSubjects) {
            const input = document.getElementById(`marks_${student.id}_${subject.id}`);
            const totalMarks = parseInt(input.value) || 0;
            
            if (totalMarks > 0) {
                // Split marks: 20% formative, 80% summative
                const formative = Math.round(totalMarks * 0.2);
                const summative = totalMarks - formative;
                
                marksData.push({
                    student_id: student.id,
                    subject_id: subject.id,
                    formative_20: formative,
                    summative_80: summative
                });
            }
        }
    }
    
    if (marksData.length === 0) {
        alert('Please enter at least some marks');
        return;
    }
    
    try {
        // Save marks one by one
        let savedCount = 0;
        for (const mark of marksData) {
            const response = await fetch('/api/marks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(mark)
            });
            
            if (response.ok) {
                savedCount++;
            }
        }
        
        alert(`Successfully saved ${savedCount} marks entries!`);
        
        // Hide the bulk table and reload marks
        document.getElementById('bulkMarksTableCard').style.display = 'none';
        loadMarks();
        loadDashboardData();
        
    } catch (error) {
        console.error('Error saving bulk marks:', error);
        alert('Error saving marks. Please try again.');
    }
}

function editMarks(id) {
    alert('Edit marks feature will be implemented soon!');
}

function deleteMarks(id) {
    if (confirm('Are you sure you want to delete these marks?')) {
        alert('Delete marks feature will be implemented soon!');
    }
}

// Navigation function
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Add active class to clicked nav link
    event.target.classList.add('active');
    
    // Load section-specific data
    if (sectionId === 'teachers') {
        loadTeachers();
    } else if (sectionId === 'classes') {
        loadClasses();
        loadSections();
    } else if (sectionId === 'subjects') {
        loadSubjects();
    } else if (sectionId === 'students') {
        loadStudents();
    } else if (sectionId === 'marks') {
        loadMarks();
        populateStudentSelects();
        populateSubjectSelects();
        setupMarksForm();
    } else if (sectionId === 'reports') {
        loadStudents();
        loadClasses();
    }
}

// Placeholder functions for edit/delete operations
function editTeacher(id) {
    alert('Edit teacher feature will be implemented soon!');
}

function deleteTeacher(id) {
    if (confirm('Are you sure you want to delete this teacher?')) {
        alert('Delete teacher feature will be implemented soon!');
    }
}

function editStudent(id) {
    alert('Edit student feature will be implemented soon!');
}

function deleteStudent(id) {
    if (confirm('Are you sure you want to delete this student?')) {
        alert('Delete student feature will be implemented soon!');
    }
}

function editSubject(id) {
    alert('Edit subject feature will be implemented soon!');
}

function deleteSubject(id) {
    if (confirm('Are you sure you want to delete this subject?')) {
        alert('Delete subject feature will be implemented soon!');
    }
}

function deleteClass(id) {
    if (confirm('Are you sure you want to delete this class?')) {
        alert('Delete class feature will be implemented soon!');
    }
}

function deleteSection(id) {
    if (confirm('Are you sure you want to delete this section?')) {
        alert('Delete section feature will be implemented soon!');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}
