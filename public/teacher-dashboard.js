// Teacher Dashboard JavaScript
let currentUser = null;
let students = [];
let subjects = [];
let classes = [];
let sections = [];

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
    
    // Verify user is a teacher
    if (currentUser.role !== 'teacher') {
        alert('Access denied. Teacher login required.');
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
    // Set teacher name
    document.getElementById('teacherName').textContent = currentUser.name || currentUser.username;
    
    // Load initial data
    loadStudents();
    loadSubjects();
    loadClasses();
    
    // Setup form handlers
    setupFormHandlers();
}

function setupFormHandlers() {
    // Marks form handler
    document.getElementById('marksForm').addEventListener('submit', handleMarksSubmit);
    
    // Password form handler
    document.getElementById('passwordForm').addEventListener('submit', handlePasswordChange);
    
    // Exam type change handler
    document.getElementById('examType').addEventListener('change', function() {
        const marksInput = document.getElementById('marksInput');
        const examType = this.value;
        
        if (examType === 'formative') {
            marksInput.max = 20;
            marksInput.placeholder = 'Enter marks out of 20';
        } else if (examType === 'summative') {
            marksInput.max = 80;
            marksInput.placeholder = 'Enter marks out of 80';
        } else {
            marksInput.max = 100;
            marksInput.placeholder = 'Enter marks';
        }
    });
}

async function loadDashboardData() {
    try {
        const token = localStorage.getItem('token');
        
        // Load dashboard statistics
        const [studentsRes, subjectsRes, classesRes] = await Promise.all([
            fetch('/api/students', {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('/api/subjects', {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('/api/classes', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);
        
        if (studentsRes.ok && subjectsRes.ok && classesRes.ok) {
            const studentsData = await studentsRes.json();
            const subjectsData = await subjectsRes.json();
            const classesData = await classesRes.json();
            
            // Update statistics
            document.getElementById('totalStudents').textContent = studentsData.length;
            document.getElementById('totalSubjects').textContent = subjectsData.length;
            document.getElementById('totalClasses').textContent = classesData.length;
            document.getElementById('pendingMarks').textContent = '0'; // TODO: Calculate pending marks
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
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
            populateStudentSelects();
            displayStudents();
        } else {
            console.error('Failed to load students');
        }
    } catch (error) {
        console.error('Error loading students:', error);
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
            populateSubjectSelect();
        } else {
            console.error('Failed to load subjects');
        }
    } catch (error) {
        console.error('Error loading subjects:', error);
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
            populateClassFilter();
        } else {
            console.error('Failed to load classes');
        }
    } catch (error) {
        console.error('Error loading classes:', error);
    }
}

function populateStudentSelects() {
    const studentSelect = document.getElementById('studentSelect');
    const marksheetStudentSelect = document.getElementById('marksheetStudentSelect');
    
    // Clear existing options
    studentSelect.innerHTML = '<option value="">Select Student</option>';
    marksheetStudentSelect.innerHTML = '<option value="">Choose a student</option>';
    
    students.forEach(student => {
        const option1 = new Option(`${student.name} (Roll: ${student.roll_number})`, student.id);
        const option2 = new Option(`${student.name} (Roll: ${student.roll_number})`, student.id);
        
        studentSelect.appendChild(option1);
        marksheetStudentSelect.appendChild(option2);
    });
}

function populateSubjectSelect() {
    const subjectSelect = document.getElementById('subjectSelect');
    subjectSelect.innerHTML = '<option value="">Select Subject</option>';
    
    subjects.forEach(subject => {
        const option = new Option(subject.subject_name, subject.id);
        subjectSelect.appendChild(option);
    });
}

function populateClassFilter() {
    const classFilter = document.getElementById('classFilter');
    classFilter.innerHTML = '<option value="">All Classes</option>';
    
    classes.forEach(cls => {
        const option = new Option(cls.class_name, cls.id);
        classFilter.appendChild(option);
    });
}

function populateClassSelects() {
    const selects = ['teacherClassSelect'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Choose Class</option>';
            
            classes.forEach(cls => {
                const option = new Option(cls.class_name, cls.id);
                select.appendChild(option);
            });
            
            if (currentValue) select.value = currentValue;
        }
    });
}

function displayStudents(filteredStudents = null) {
    const studentsToShow = filteredStudents || students;
    const tbody = document.getElementById('studentsTable');
    
    if (studentsToShow.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No students found</td></tr>';
        return;
    }
    
    tbody.innerHTML = studentsToShow.map(student => `
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
                <button class="btn btn-sm btn-outline-primary" onclick="viewStudentDetails(${student.id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-success" onclick="generateStudentMarksheet(${student.id})">
                    <i class="fas fa-file-pdf"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function filterStudents() {
    const classFilter = document.getElementById('classFilter');
    const selectedClassId = classFilter.value;
    
    if (!selectedClassId) {
        displayStudents();
        return;
    }
    
    const filteredStudents = students.filter(student => 
        student.class_id == selectedClassId
    );
    
    displayStudents(filteredStudents);
}

async function handleMarksSubmit(e) {
    e.preventDefault();
    
    const studentId = document.getElementById('studentSelect').value;
    const subjectId = document.getElementById('subjectSelect').value;
    const examType = document.getElementById('examType').value;
    const marks = document.getElementById('marksInput').value;
    
    if (!studentId || !subjectId || !examType || !marks) {
        alert('Please fill all fields');
        return;
    }
    
    // Validate marks based on exam type
    const maxMarks = examType === 'formative' ? 20 : 80;
    if (parseInt(marks) > maxMarks) {
        alert(`Marks cannot exceed ${maxMarks} for ${examType} exam`);
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const marksData = {
            student_id: studentId,
            subject_id: subjectId,
            [examType === 'formative' ? 'formative_20' : 'summative_80']: marks
        };
        
        const response = await fetch('/api/marks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(marksData)
        });
        
        if (response.ok) {
            alert('Marks saved successfully!');
            document.getElementById('marksForm').reset();
            loadRecentMarks();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to save marks');
        }
    } catch (error) {
        console.error('Error saving marks:', error);
        alert('Error saving marks. Please try again.');
    }
}

async function loadRecentMarks() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/marks', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const marks = await response.json();
            const recentMarks = marks.slice(-5); // Get last 5 entries
            
            const recentMarksDiv = document.getElementById('recentMarks');
            if (recentMarks.length === 0) {
                recentMarksDiv.innerHTML = '<p class="text-muted">No marks entered yet.</p>';
                return;
            }
            
            recentMarksDiv.innerHTML = recentMarks.map(mark => `
                <div class="border-bottom pb-2 mb-2">
                    <strong>${mark.student_name}</strong> - ${mark.subject_name}<br>
                    <small class="text-muted">
                        ${mark.formative_20 ? `Formative: ${mark.formative_20}/20` : ''}
                        ${mark.summative_80 ? `Summative: ${mark.summative_80}/80` : ''}
                    </small>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading recent marks:', error);
    }
}

// Teacher-specific functions for marks entry
let teacherStudents = [];

function loadTeacherSections() {
    const classId = document.getElementById('teacherClassSelect').value;
    const sectionSelect = document.getElementById('teacherSectionSelect');
    const subjectSelect = document.getElementById('teacherSubjectSelect');
    
    sectionSelect.innerHTML = '<option value="">Choose Section</option>';
    subjectSelect.innerHTML = '<option value="">Choose Subject</option>';
    document.getElementById('marksEntryCard').style.display = 'none';
    
    if (!classId) return;
    
    sections.forEach(section => {
        const option = new Option(section.section_name, section.id);
        sectionSelect.appendChild(option);
    });
}

function loadTeacherStudents() {
    const classId = document.getElementById('teacherClassSelect').value;
    const sectionId = document.getElementById('teacherSectionSelect').value;
    const subjectSelect = document.getElementById('teacherSubjectSelect');
    
    subjectSelect.innerHTML = '<option value="">Choose Subject</option>';
    document.getElementById('marksEntryCard').style.display = 'none';
    
    if (!classId || !sectionId) return;
    
    // Load teacher's subjects only (restrict to assigned subjects)
    const teacherAssignedSubjects = subjects.filter(subject => {
        // For now, show all subjects. In real implementation, 
        // this would filter based on teacher's assigned subjects
        return !subject.class_id || subject.class_id == classId;
    });
    
    teacherAssignedSubjects.forEach(subject => {
        const option = new Option(subject.subject_name, subject.id);
        subjectSelect.appendChild(option);
    });
}

async function showMarksEntryForm() {
    const classId = document.getElementById('teacherClassSelect').value;
    const sectionId = document.getElementById('teacherSectionSelect').value;
    const subjectId = document.getElementById('teacherSubjectSelect').value;
    
    if (!classId || !sectionId || !subjectId) {
        document.getElementById('marksEntryCard').style.display = 'none';
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
            teacherStudents = allStudents.filter(student => 
                student.class_id == classId && student.section_id == sectionId
            );
            
            // Get existing marks for this class/section/subject
            const marksResponse = await fetch('/api/marks', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            let existingMarks = [];
            if (marksResponse.ok) {
                const allMarks = await marksResponse.json();
                existingMarks = allMarks.filter(mark => 
                    mark.subject_id == subjectId
                );
            }
            
            generateTeacherMarksTable(existingMarks);
        }
    } catch (error) {
        console.error('Error loading teacher marks data:', error);
        alert('Error loading data. Please try again.');
    }
}

function generateTeacherMarksTable(existingMarks) {
    const className = classes.find(c => c.id == document.getElementById('teacherClassSelect').value)?.class_name;
    const sectionName = sections.find(s => s.id == document.getElementById('teacherSectionSelect').value)?.section_name;
    const subjectName = subjects.find(s => s.id == document.getElementById('teacherSubjectSelect').value)?.subject_name;
    
    document.getElementById('selectedClassSectionSubject').textContent = `${className} - ${sectionName} - ${subjectName}`;
    
    // Generate student rows
    const tbody = document.getElementById('teacherMarksTableBody');
    tbody.innerHTML = teacherStudents.map(student => {
        // Find existing marks for this student
        const existingMark = existingMarks.find(mark => mark.student_id == student.id);
        const formativeMarks = existingMark ? existingMark.formative_20 : '';
        const summativeMarks = existingMark ? existingMark.summative_80 : '';
        const totalMarks = (formativeMarks && summativeMarks) ? (parseInt(formativeMarks) + parseInt(summativeMarks)) : '';
        
        return `
            <tr>
                <td class="text-center">${student.roll_number}</td>
                <td>${student.name}</td>
                <td>
                    <input type="number" class="form-control form-control-sm text-center" 
                           id="formative_${student.id}" 
                           min="0" max="20" placeholder="0" value="${formativeMarks}"
                           onchange="calculateTotal(${student.id})">
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm text-center" 
                           id="summative_${student.id}" 
                           min="0" max="80" placeholder="0" value="${summativeMarks}"
                           onchange="calculateTotal(${student.id})">
                </td>
                <td class="text-center">
                    <strong id="total_${student.id}">${totalMarks}</strong>
                </td>
            </tr>
        `;
    }).join('');
    
    // Show the table
    document.getElementById('marksEntryCard').style.display = 'block';
    
    // Scroll to table
    document.getElementById('marksEntryCard').scrollIntoView({ behavior: 'smooth' });
}

function calculateTotal(studentId) {
    const formative = parseInt(document.getElementById(`formative_${studentId}`).value) || 0;
    const summative = parseInt(document.getElementById(`summative_${studentId}`).value) || 0;
    const total = formative + summative;
    
    document.getElementById(`total_${studentId}`).textContent = total;
}

async function saveAllTeacherMarks() {
    const token = localStorage.getItem('token');
    const subjectId = document.getElementById('teacherSubjectSelect').value;
    const marksData = [];
    
    // Collect all marks from the table
    for (const student of teacherStudents) {
        const formativeInput = document.getElementById(`formative_${student.id}`);
        const summativeInput = document.getElementById(`summative_${student.id}`);
        
        const formative = parseInt(formativeInput.value) || 0;
        const summative = parseInt(summativeInput.value) || 0;
        
        if (formative > 0 || summative > 0) {
            marksData.push({
                student_id: student.id,
                subject_id: subjectId,
                formative_20: formative,
                summative_80: summative
            });
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
        
        // Reload recent marks
        loadRecentMarks();
        
    } catch (error) {
        console.error('Error saving teacher marks:', error);
        alert('Error saving marks. Please try again.');
    }
}

async function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        if (response.ok) {
            alert('Password changed successfully!');
            document.getElementById('passwordForm').reset();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to change password');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        alert('Error changing password. Please try again.');
    }
}

function viewStudentDetails(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    alert(`Student Details:\n\nName: ${student.name}\nRoll: ${student.roll_number}\nFather: ${student.father_name || 'N/A'}\nMother: ${student.mother_name || 'N/A'}\nPhone: ${student.phone || 'N/A'}\nAddress: ${student.address || 'N/A'}`);
}

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
    if (sectionId === 'students') {
        loadStudents();
    } else if (sectionId === 'marks') {
        loadMarksData();
    } else if (sectionId === 'profile') {
        loadProfile();
    }
}

async function loadMarksData() {
    // Load all required data for teacher marks entry
    await loadClasses();
    await loadSections();
    await loadSubjects();
    populateTeacherClassSelects();
    loadRecentMarks();
}

async function loadSections() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/sections', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            sections = await response.json();
        } else {
            console.error('Failed to load sections');
        }
    } catch (error) {
        console.error('Error loading sections:', error);
    }
}

function populateTeacherClassSelects() {
    const select = document.getElementById('teacherClassSelect');
    if (select) {
        select.innerHTML = '<option value="">Choose Class</option>';
        
        classes.forEach(cls => {
            const option = new Option(cls.class_name, cls.id);
            select.appendChild(option);
        });
    }
}

function loadProfile() {
    document.getElementById('profileName').value = currentUser.name || '';
    document.getElementById('profileUsername').value = currentUser.username || '';
    document.getElementById('profileEmail').value = currentUser.email || '';
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}
