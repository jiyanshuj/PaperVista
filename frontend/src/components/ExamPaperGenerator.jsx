import React, { useState } from 'react';
import { FileText, Download, Loader2, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

const PaperVista = () => {
  const [formData, setFormData] = useState({
    courseCode: '',
    courseName: '',
    department: '',
    semester: '',
    examPeriod: '',
    examType: 'End-Sem',
    topicHeadings: ''
  });

  const [questions, setQuestions] = useState([]);
  const [examInfo, setExamInfo] = useState({ duration: '3 Hours', numQuestions: 5 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [backendStatus, setBackendStatus] = useState('unchecked');

  const BACKEND_URL = 'http://localhost:8000';

  React.useEffect(() => {
    checkBackendHealth();
  }, []);

  const checkBackendHealth = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      if (response.ok) {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }
    } catch (err) {
      setBackendStatus('offline');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateQuestionsFromBackend = async () => {
    if (!formData.courseName || !formData.topicHeadings) {
      setError('Please fill in Course Name and Topic Headings');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/generate-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseName: formData.courseName,
          examType: formData.examType,
          topicHeadings: formData.topicHeadings
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Backend Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.questions) {
        setQuestions(data.questions);
        setExamInfo(data.examInfo || examInfo);
        setBackendStatus('online');
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (err) {
      setError(`Failed to generate questions: ${err.message}`);
      setBackendStatus('offline');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMaxMarks = () => {
    if (formData.examType === 'MST-1' || formData.examType === 'MST-2') {
      return '20';
    }
    return '70';
  };

  const getMinMarks = () => {
    if (formData.examType === 'MST-1' || formData.examType === 'MST-2') {
      return '8';
    }
    return '28';
  };

  const generatePDF = () => {
    if (questions.length === 0) {
      setError('Please generate questions first before downloading PDF');
      return;
    }

    const printWindow = window.open('', '_blank');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${formData.courseCode} Examination Paper</title>
  <style>
    @page { 
      size: A4; 
      margin: 15mm 20mm;
    }
    body { 
      font-family: 'Times New Roman', serif; 
      font-size: 12pt; 
      line-height: 1.4;
      margin: 0;
      padding: 10px 15px;
    }
    .header {
      text-align: center;
      margin-bottom: 12px;
    }
    .top-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 10pt;
    }
    .course-code {
      font-size: 14pt;
      font-weight: bold;
      margin: 4px 0;
    }
    .course-details {
      margin: 2px 0;
      font-size: 10pt;
    }
    .course-name {
      font-size: 14pt;
      font-weight: bold;
      margin: 4px 0;
    }
    .time-marks {
      display: flex;
      justify-content: space-between;
      margin: 8px 0;
      font-weight: bold;
      font-size: 11pt;
    }
    .instructions {
      margin: 12px 0;
      padding: 6px 8px;
      background: #f9f9f9;
      border-left: 2px solid #333;
    }
    .instructions p {
      margin: 2px 0;
      font-size: 9pt;
      line-height: 1.3;
    }
    .question {
      margin: 12px 0;
      page-break-inside: avoid;
      font-size: 12pt;
    }
    .question-part {
      margin: 6px 0 6px 15px;
      font-size: 12pt;
    }
    .marks {
      float: right;
      font-weight: bold;
      font-size: 11pt;
    }
    .or-divider {
      text-align: center;
      font-weight: bold;
      margin: 6px 0;
      font-size: 11pt;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="top-info">
      <div>Total No. of Questions: ${questions.length}</div>
      <div>Total No. of Printed Pages: 02</div>
    </div>
    <div style="text-align: right; margin-bottom: 6px; font-size: 10pt;">
      Roll No. __________________
    </div>
    
    <div class="course-code">${formData.courseCode}</div>
    <div class="course-details">
      ${formData.department}
    </div>
    <div class="course-details">
      ${formData.semester} Semester Examination, ${formData.examPeriod}
    </div>
    <div class="course-name">${formData.courseName}</div>
    <div class="course-details">Choice Based Credit System (CBCS)</div>
    
    <div class="time-marks">
      <div>Time: ${examInfo.duration}</div>
      <div style="text-align: right;">
        <div>Maximum Marks: ${getMaxMarks()}</div>
        <div>Minimum Pass Marks: ${getMinMarks()}</div>
      </div>
    </div>
  </div>

  <div class="instructions">
    <strong>Note:</strong>
    <p>(1) Sub-parts a and b are compulsory; attempt either c or d.</p>
    <p>(2) Draw neat diagrams wherever necessary.</p>
  </div>

  ${questions.map(q => `
    <div class="question">
      <strong>Q.${q.questionNumber}.</strong>
      ${q.parts.map((part, idx) => `
        <div class="question-part">
          <strong>${part.label})</strong> ${part.text}
          <span class="marks">${part.marks < 10 ? '0' : ''}${part.marks}</span>
          ${part.hasOR && idx === q.parts.length - 1 ? `
            <div class="or-divider">OR</div>
            <div style="margin-left: 0px;">
              <strong>d)</strong> ${part.orText}
              <span class="marks">${part.marks < 10 ? '0' : ''}${part.marks}</span>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `).join('')}

  <div style="text-align: center; margin-top: 40px;">
    <em>***End***</em>
  </div>

  <div class="no-print" style="text-align: center; margin-top: 30px; padding: 20px;">
    <button onclick="window.print()" style="padding: 10px 30px; font-size: 14pt; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 5px;">
      Print / Save as PDF
    </button>
    <button onclick="window.close()" style="padding: 10px 30px; font-size: 14pt; cursor: pointer; background: #f44336; color: white; border: none; border-radius: 5px; margin-left: 10px;">
      Close
    </button>
  </div>
</body>
</html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-indigo-100 p-6 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl shadow-lg">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  PaperVista
                </h1>
                <p className="text-sm text-gray-600">AI-Powered Question Generation</p>
              </div>
            </div>

            {/* Backend Status Indicator */}
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border border-gray-100">
              {backendStatus === 'online' && (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-green-600 font-medium">Online</span>
                </>
              )}
              {backendStatus === 'offline' && (
                <>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-red-600 font-medium">Offline</span>
                </>
              )}
              {backendStatus === 'unchecked' && (
                <>
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  <span className="text-sm text-gray-600 font-medium">Checking...</span>
                </>
              )}
            </div>
          </div>

          {/* Backend Status Alert */}
          {backendStatus === 'offline' && (
            <div className="mb-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm flex-1">
                  <p className="font-semibold text-yellow-800">Backend Server Not Running</p>
                  <p className="text-yellow-700 mt-1">
                    Start: <code className="bg-yellow-100 px-2 py-1 rounded text-xs">python backend.py</code>
                  </p>
                  <button
                    onClick={checkBackendHealth}
                    className="mt-2 text-yellow-800 underline hover:text-yellow-900 text-xs font-medium"
                  >
                    Check Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Course Code</label>
                <input
                  type="text"
                  name="courseCode"
                  value={formData.courseCode}
                  onChange={handleInputChange}
                  placeholder="e.g., BTCS602"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Course Name</label>
                <input
                  type="text"
                  name="courseName"
                  value={formData.courseName}
                  onChange={handleInputChange}
                  placeholder="e.g., Internet of Things"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                placeholder="e.g., B.Tech. (CSE, IT, AI&ML)"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Semester</label>
                <input
                  type="text"
                  name="semester"
                  value={formData.semester}
                  onChange={handleInputChange}
                  placeholder="e.g., VI"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Examination Period</label>
                <input
                  type="text"
                  name="examPeriod"
                  value={formData.examPeriod}
                  onChange={handleInputChange}
                  placeholder="e.g., Dec 2024"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Exam Type</label>
              <select
                name="examType"
                value={formData.examType}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors bg-white cursor-pointer"
              >
                <option value="MST-1">MST-1 (Mid Semester Test 1)</option>
                <option value="MST-2">MST-2 (Mid Semester Test 2)</option>
                <option value="End-Sem">End Semester</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Topic Headings (comma-separated)</label>
              <textarea
                name="topicHeadings"
                value={formData.topicHeadings}
                onChange={handleInputChange}
                placeholder="e.g., M2M Communication, Cloud Computing in IoT, IoT Architecture, Data Management, Security in IoT"
                rows="3"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors bg-white resize-none"
              />
            </div>

            {error && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3 shadow-sm">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              onClick={generateQuestionsFromBackend}
              disabled={loading || backendStatus === 'offline'}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3.5 px-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Questions with AI
                </>
              )}
            </button>

            {questions.length > 0 && (
              <div className="mt-6 p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    Generated Questions
                  </h2>
                  <span className="text-sm text-gray-700 bg-white px-3 py-1 rounded-full font-semibold shadow-sm">
                    {questions.length} questions
                  </span>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {questions.map(q => (
                    <div key={q.questionNumber} className="text-sm bg-white p-4 rounded-lg border border-green-100 shadow-sm hover:shadow-md transition-shadow">
                      <strong className="text-indigo-700 text-base">Q.{q.questionNumber}.</strong>
                      {q.parts.map((part, idx) => (
                        <div key={idx} className="ml-4 mt-2">
                          <div className="flex items-start gap-2">
                            <strong className="text-gray-700">{part.label})</strong>
                            <span className="flex-1 text-gray-600">{part.text.substring(0, 70)}...</span>
                            <span className="text-xs font-semibold text-indigo-600">[{part.marks}m]</span>
                          </div>
                          {part.hasOR && (
                            <div className="ml-0 mt-2 text-center">
                              <span className="inline-block bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">
                                OR (choose c or d)
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <button
                  onClick={generatePDF}
                  className="mt-5 w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3.5 px-4 rounded-xl hover:from-green-700 hover:to-emerald-700 flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                >
                  <Download className="w-5 h-5" />
                  Download Exam Paper (PDF)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Backend Info Card */}
        <div className="mt-5 bg-white/60 backdrop-blur-sm rounded-xl shadow-md p-4 text-sm text-gray-600 border border-white/40">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">Backend Connection</h3>
              <p className="text-xs">
                <code className="bg-gray-100 px-2 py-1 rounded text-indigo-600">{BACKEND_URL}</code>
              </p>
            </div>
            <Sparkles className="w-8 h-8 text-indigo-400 opacity-50" />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default PaperVista;
