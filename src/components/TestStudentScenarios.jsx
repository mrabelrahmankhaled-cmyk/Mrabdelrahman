import React, { useState } from 'react';
import { FaUserPlus, FaSearch, FaCheck, FaTimes } from 'react-icons/fa';

/**
 * Test Component for Student Scenarios
 */
const TestStudentScenarios = () => {
  const [testData, setTestData] = useState({
    name: '',
    phone: '',
    parent_phone: ''
  });

  // Mock students data (simulating your database)
  const mockStudents = [
    {
      id: '1',
      name: 'أحمد محمد',
      phone: '01234567890',
      parent_phone: '01123456789',
      enrolled_courses: ['course-1'],
      unique_id: 'S-1001'
    },
    {
      id: '2', 
      name: 'سارة أحمد',
      phone: '01234567891',
      parent_phone: '01123456780',
      enrolled_courses: ['course-2'],
      unique_id: 'S-1002'
    },
    {
      id: '3',
      name: 'محمد علي',
      phone: '01234567892',
      parent_phone: '01123456781',
      enrolled_courses: [],
      unique_id: 'S-1003'
    }
  ];

  const mockActiveSession = {
    course_id: 'course-1',
    name: 'كورس الرياضيات'
  };

  // Test the three scenarios
  const testScenarios = () => {
    console.log('🧪 Testing Student Scenarios...');
    
    // Scenario 1: New student in center
    const newStudent = {
      name: 'خالد سعيد',
      phone: '01234567899',
      parent_phone: '01123456799'
    };
    
    const scenario1Result = checkStudentScenario(newStudent, mockStudents, mockActiveSession);
    console.log('🆕 Scenario 1 (New Student):', scenario1Result);
    
    // Scenario 2: Student exists in other course
    const existingInOtherCourse = {
      name: 'سارة أحمد',
      phone: '01234567891',
      parent_phone: '01123456780'
    };
    
    const scenario2Result = checkStudentScenario(existingInOtherCourse, mockStudents, mockActiveSession);
    console.log('🔄 Scenario 2 (Other Course):', scenario2Result);
    
    // Scenario 3: Student exists in same course
    const existingInSameCourse = {
      name: 'أحمد محمد',
      phone: '01234567890',
      parent_phone: '01123456789'
    };
    
    const scenario3Result = checkStudentScenario(existingInSameCourse, mockStudents, mockActiveSession);
    console.log('✅ Scenario 3 (Same Course):', scenario3Result);
    
    return {
      scenario1: scenario1Result,
      scenario2: scenario2Result,
      scenario3: scenario3Result
    };
  };

  // Check student scenario (same logic as your handleQuickAddStudent)
  const checkStudentScenario = (studentData, students, activeSession) => {
    // Check if student exists in center
    const existingStudentInCenter = students.find(s => {
      const nameMatch = s.name.toLowerCase().trim() === studentData.name.toLowerCase().trim();
      const phoneMatch = studentData.phone && s.phone === studentData.phone;
      const parentPhoneMatch = studentData.parent_phone && s.parent_phone === studentData.parent_phone;
      
      return nameMatch || phoneMatch || parentPhoneMatch;
    });
    
    if (existingStudentInCenter) {
      // Check if student exists in current course
      const existsInCurrentCourse = existingStudentInCenter.enrolled_courses?.includes(activeSession.course_id);
      
      if (existsInCurrentCourse) {
        return {
          scenario: 3,
          message: 'الطالب موجود بالفعل في هذا الكورس وتم تسجيل حضوره ✅',
          action: 'mark_attendance',
          student: existingStudentInCenter
        };
      } else {
        return {
          scenario: 2,
          message: `الطالب موجود بالفعل في السنتر:\n\nالاسم: ${existingStudentInCenter.name}\nالكود: ${existingStudentInCenter.unique_id}\nالكورسات الحالية: ${existingStudentInCenter.enrolled_courses?.join(', ') || 'لا يوجد'}\n\nهل تريد إضافته لكورس "${activeSession.name}"؟`,
          action: 'add_to_course',
          student: existingStudentInCenter
        };
      }
    }
    
    // Scenario 1: New student
    return {
      scenario: 1,
      message: 'طالب جديد في السنتر - سيتم إنشاؤه وإضافته للكورس',
      action: 'create_new',
      student: null
    };
  };

  const handleTest = () => {
    const result = checkStudentScenario(testData, mockStudents, mockActiveSession);
    alert(`Scenario ${result.scenario}:\n\n${result.message}\n\nAction: ${result.action}`);
  };

  const handleTestAllScenarios = () => {
    const results = testScenarios();
    alert(`Test Results:\n\nScenario 1: ${results.scenario1.action}\nScenario 2: ${results.scenario2.action}\nScenario 3: ${results.scenario3.action}`);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <FaUserPlus className="ml-2 text-blue-600" />
        Test Student Scenarios
      </h2>
      
      {/* Test Form */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Student Name</label>
          <input
            type="text"
            value={testData.name}
            onChange={(e) => setTestData({...testData, name: e.target.value})}
            className="w-full p-2 border rounded-lg"
            placeholder="Enter student name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input
            type="tel"
            value={testData.phone}
            onChange={(e) => setTestData({...testData, phone: e.target.value})}
            className="w-full p-2 border rounded-lg"
            placeholder="Enter phone number"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Parent Phone</label>
          <input
            type="tel"
            value={testData.parent_phone}
            onChange={(e) => setTestData({...testData, parent_phone: e.target.value})}
            className="w-full p-2 border rounded-lg"
            placeholder="Enter parent phone number"
          />
        </div>
      </div>
      
      {/* Test Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleTest}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <FaSearch />
          Test This Student
        </button>
        
        <button
          onClick={handleTestAllScenarios}
          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
        >
          <FaCheck />
          Test All Scenarios
        </button>
      </div>
      
      {/* Mock Data Display */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-3">Mock Students Data:</h3>
        <div className="space-y-2 text-sm">
          {mockStudents.map(student => (
            <div key={student.id} className="flex justify-between p-2 bg-white rounded border">
              <div>
                <strong>{student.name}</strong> ({student.unique_id})
              </div>
              <div className="text-gray-600">
                Courses: {student.enrolled_courses.length > 0 ? student.enrolled_courses.join(', ') : 'None'}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Test Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">How to Test:</h3>
        <div className="text-sm space-y-1">
          <p><strong>Scenario 1:</strong> Enter a new name (e.g., "خالد سعيد")</p>
          <p><strong>Scenario 2:</strong> Enter "سارة أحمد" (exists in course-2)</p>
          <p><strong>Scenario 3:</strong> Enter "أحمد محمد" (exists in course-1)</p>
        </div>
      </div>
    </div>
  );
};

export default TestStudentScenarios;
