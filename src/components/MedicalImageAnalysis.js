import React, { useState, useContext, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';

const MedicalImageAnalysis = () => {
  const { user } = useContext(AuthContext);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [imageType, setImageType] = useState('xray');
  const fileInputRef = useRef(null);

  // โหลดประวัติการวิเคราะห์
  const loadAnalysisHistory = async () => {
    try {
      const response = await fetch('/api/medical-images/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAnalysisHistory(data);
      }
    } catch (error) {
      console.error('Error loading analysis history:', error);
    }
  };

  React.useEffect(() => {
    loadAnalysisHistory();
  }, []);

  // จัดการการเลือกภาพ
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // ตรวจสอบประเภทไฟล์
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/dicom'];
      if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.dcm')) {
        alert('กรุณาเลือกไฟล์ภาพ JPEG, PNG หรือ DICOM เท่านั้น');
        return;
      }

      // ตรวจสอบขนาดไฟล์ (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('ขนาดไฟล์ต้องไม่เกิน 10MB');
        return;
      }

      setSelectedImage(file);
      
      // สร้าง preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // วิเคราะห์ภาพด้วย AI
  const analyzeImage = async () => {
    if (!selectedImage) {
      alert('กรุณาเลือกภาพที่ต้องการวิเคราะห์');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('imageType', imageType);
      formData.append('userId', user.id);

      const response = await fetch('/api/medical-images/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setAnalysisResult(result);
        loadAnalysisHistory(); // โหลดประวัติใหม่
      } else {
        const error = await response.json();
        alert(`เกิดข้อผิดพลาด: ${error.message || 'ไม่สามารถวิเคราะห์ภาพได้'}`);
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      alert('เกิดข้อผิดพลาดในการวิเคราะห์ภาพ');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // รีเซ็ตการเลือกภาพ
  const resetImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setAnalysisResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // กำหนดสีตามระดับความเสี่ยง
  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'low': case 'ต่ำ': return 'text-green-600 bg-green-50';
      case 'medium': case 'ปานกลาง': return 'text-yellow-600 bg-yellow-50';
      case 'high': case 'สูง': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // แสดงผลการวิเคราะห์
  const renderAnalysisResult = () => {
    if (!analysisResult) return null;

    return (
      <div className="mt-6 p-6 bg-white rounded-lg shadow-lg border">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          🔬 ผลการวิเคราะห์ภาพทางการแพทย์
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ข้อมูลพื้นฐาน */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ประเภทภาพ
              </label>
              <p className="text-lg font-semibold text-blue-600">
                {analysisResult.imageType === 'xray' ? '📷 X-Ray' : '🧠 MRI'}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ระดับความมั่นใจ
              </label>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${analysisResult.confidence || 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {analysisResult.confidence || 0}%
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ระดับความเสี่ยง
              </label>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(analysisResult.riskLevel)}`}>
                {analysisResult.riskLevel || 'ไม่ระบุ'}
              </span>
            </div>
          </div>

          {/* ผลการค้นพบ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ผลการค้นพบ
            </label>
            <div className="space-y-2">
              {analysisResult.findings && analysisResult.findings.length > 0 ? (
                analysisResult.findings.map((finding, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-gray-800">{finding.name}</span>
                      <span className="text-sm text-gray-600">{finding.probability}%</span>
                    </div>
                    {finding.description && (
                      <p className="text-sm text-gray-600">{finding.description}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-600 italic">ไม่พบความผิดปกติที่เด่นชัด</p>
              )}
            </div>
          </div>
        </div>

        {/* คำแนะนำ */}
        {analysisResult.recommendations && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">💡 คำแนะนำ</h4>
            <ul className="space-y-1">
              {analysisResult.recommendations.map((rec, index) => (
                <li key={index} className="text-blue-700 text-sm flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* คำเตือน */}
        <div className="mt-4 p-4 bg-amber-50 border-l-4 border-amber-400">
          <div className="flex items-start">
            <span className="text-amber-400 text-xl mr-2">⚠️</span>
            <div>
              <h4 className="font-medium text-amber-800">คำเตือนสำคัญ</h4>
              <p className="text-amber-700 text-sm mt-1">
                ผลการวิเคราะห์นี้เป็นเพียงการวิเคราะห์เบื้องต้นด้วย AI เท่านั้น 
                ไม่สามารถใช้แทนการวินิจฉัยของแพทย์ผู้เชี่ยวชาญได้ 
                หากมีความกังวลหรือมีอาการผิดปกติ กรุณาปรึกษาแพทย์โดยเร็วที่สุด
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg mb-6">
        <h1 className="text-3xl font-bold mb-2">🔬 วิเคราะห์ภาพทางการแพทย์</h1>
        <p className="text-blue-100">
          วิเคราะห์ภาพ X-ray และ MRI ด้วย AI แบบเบื้องต้น เพื่อการคัดกรองเบื้องต้น
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ส่วนอัปโหลดและวิเคราะห์ */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📤 อัปโหลดภาพเพื่อวิเคราะห์</h2>
          
          {/* เลือกประเภทภาพ */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ประเภทภาพ
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="xray"
                  checked={imageType === 'xray'}
                  onChange={(e) => setImageType(e.target.value)}
                  className="mr-2"
                />
                📷 X-Ray
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="mri"
                  checked={imageType === 'mri'}
                  onChange={(e) => setImageType(e.target.value)}
                  className="mr-2"
                />
                🧠 MRI
              </label>
            </div>
          </div>

          {/* เลือกไฟล์ */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              เลือกไฟล์ภาพ
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.dcm,image/*"
              onChange={handleImageSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-xs text-gray-500 mt-1">
              รองรับไฟล์ JPEG, PNG, DICOM (ขนาดไม่เกิน 10MB)
            </p>
          </div>

          {/* แสดงภาพ preview */}
          {imagePreview && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ภาพที่เลือก
              </label>
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-h-64 object-contain bg-gray-100 rounded-lg"
                />
                <button
                  onClick={resetImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* ปุ่มวิเคราะห์ */}
          <div className="flex space-x-3">
            <button
              onClick={analyzeImage}
              disabled={!selectedImage || isAnalyzing}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                !selectedImage || isAnalyzing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {isAnalyzing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  กำลังวิเคราะห์...
                </div>
              ) : (
                '🔬 วิเคราะห์ภาพ'
              )}
            </button>
            
            {selectedImage && (
              <button
                onClick={resetImage}
                className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                🗑️ ลบ
              </button>
            )}
          </div>
        </div>

        {/* ประวัติการวิเคราะห์ */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📋 ประวัติการวิเคราะห์</h2>
          
          {analysisHistory.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {analysisHistory.map((item, index) => (
                <div key={index} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-gray-800">
                      {item.imageType === 'xray' ? '📷 X-Ray' : '🧠 MRI'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString('th-TH')}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getRiskColor(item.riskLevel)}`}>
                      {item.riskLevel || 'ไม่ระบุ'}
                    </span>
                    <span className="text-sm text-gray-600">
                      ความมั่นใจ: {item.confidence || 0}%
                    </span>
                  </div>
                  
                  {item.primaryFinding && (
                    <p className="text-sm text-gray-600 mt-1">
                      {item.primaryFinding}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📋</div>
              <p>ยังไม่มีประวัติการวิเคราะห์ภาพ</p>
              <p className="text-sm">เริ่มต้นด้วยการอัปโหลดภาพแรกของคุณ</p>
            </div>
          )}
        </div>
      </div>

      {/* แสดงผลการวิเคราะห์ */}
      {renderAnalysisResult()}

      {/* ข้อมูลเพิ่มเติม */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">📷 เกี่ยวกับการวิเคราะห์ X-Ray</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• ตรวจจับกระดูกหัก ข้อเสื่อม</li>
            <li>• วิเคราะห์ปอด และหัวใจ</li>
            <li>• ตรวจหาก้อนเนื้อหรือความผิดปกติ</li>
            <li>• ประเมินการอักเสบและการติดเชื้อ</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">🧠 เกี่ยวกับการวิเคราะห์ MRI</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• ตรวจสอบโครงสร้างสมอง</li>
            <li>• วิเคราะห์เนื้อเยื่ออ่อน</li>
            <li>• ตรวจหาเลือดออกในสมอง</li>
            <li>• ประเมินการบาดเจ็บกระดูกสันหลัง</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MedicalImageAnalysis;
