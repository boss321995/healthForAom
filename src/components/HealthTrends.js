import React, { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import 'chart.js/auto';

// สีสันที่สวยงามและมีชีวิตชีวา
const colors = {
  weight: {
    primary: '#10B981', // เขียวสดใส
    secondary: '#D1FAE5',
    gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)'
  },
  bp_systolic: {
    primary: '#EF4444', // แดงสดใส
    secondary: '#FEE2E2',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)'
  },
  bp_diastolic: {
    primary: '#F59E0B', // ส้มสดใส
    secondary: '#FEF3C7',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)'
  },
  heart_rate: {
    primary: '#EC4899', // ชมพูสดใส
    secondary: '#FCE7F3',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)'
  },
  blood_sugar: {
    primary: '#8B5CF6', // ม่วงสดใส
    secondary: '#EDE9FE',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)'
  }
};

const metricLabels = {
  weight_kg: { label: 'น้ำหนัก', unit: 'กก.', icon: '⚖️', color: 'weight' },
  systolic_bp: { label: 'ความดันตัวบน', unit: 'mmHg', icon: '💗', color: 'bp_systolic' },
  diastolic_bp: { label: 'ความดันตัวล่าง', unit: 'mmHg', icon: '❤️', color: 'bp_diastolic' },
  heart_rate: { label: 'อัตราการเต้นหัวใจ', unit: 'ครั้ง/นาที', icon: '💓', color: 'heart_rate' },
  blood_sugar_mg: { label: 'น้ำตาลในเลือด', unit: 'mg/dL', icon: '🍯', color: 'blood_sugar' }
};

export default function HealthTrends({ userId }) {
  const [metrics, setMetrics] = useState([]);
  const [selected, setSelected] = useState('weight_kg');
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('line'); // line หรือ bar

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);
      try {
        const token = localStorage.getItem('healthToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch('/api/health-metrics?limit=30', { headers });
        const data = await res.json();
        setMetrics(data.reverse()); // เรียงจากเก่าไปใหม่
      } catch (e) {
        setMetrics([]);
      }
      setLoading(false);
    }
    fetchMetrics();
  }, []);

  const selectedMetric = metricLabels[selected];
  const colorScheme = colors[selectedMetric.color];

  // กรองข้อมูลที่มีค่าที่ถูกต้อง (ยอมให้แสดงตั้งแต่ข้อมูลครั้งแรก)
  const validMetrics = metrics.filter(m => {
    const value = m[selected];
    if (value == null || value === undefined || value === '') return false;
    // สำหรับน้ำหนัก น้ำตาล ความดัน อัตราการเต้นหัวใจ - ไม่ควรเป็น 0 จริงๆ
    if (['weight_kg', 'systolic_bp', 'diastolic_bp', 'heart_rate', 'blood_sugar_mg'].includes(selected) && value === 0) return false;
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return !isNaN(num) && num >= 0; // เปลี่ยนจาก > 0 เป็น >= 0 เพื่อรองรับค่า 0 ในบางกรณี
  });

  // เตรียมข้อมูลกราฟแนวนอน
  const chartData = {
    labels: validMetrics.map(m => {
      const date = new Date(m.measurement_date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    }),
    datasets: [
      {
        label: `${selectedMetric.label} (${selectedMetric.unit})`,
        data: validMetrics.map(m => {
          const value = m[selected];
          const num = typeof value === 'string' ? parseFloat(value) : Number(value);
          return num;
        }),
        backgroundColor: chartType === 'bar' ? 
          validMetrics.map(() => colorScheme.primary + '80') : // ความโปร่งใส 50%
          colorScheme.secondary,
        borderColor: colorScheme.primary,
        borderWidth: 3,
        fill: chartType === 'line',
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: colorScheme.primary,
        pointBorderWidth: 3,
        pointHoverBackgroundColor: colorScheme.primary,
        pointHoverBorderColor: '#FFFFFF',
        pointHoverBorderWidth: 3,
      },
    ],
  };

  const chartOptions = {
    indexAxis: chartType === 'bar' ? 'y' : 'x', // แนวนอนสำหรับ bar chart
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          font: { size: 14, weight: 'bold' },
          color: '#1F2937',
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
        borderColor: colorScheme.primary,
        borderWidth: 2,
        cornerRadius: 12,
        displayColors: false,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        padding: 12,
        callbacks: {
          title: (context) => {
            const date = metrics[context[0].dataIndex]?.measurement_date;
            return date ? `📅 ${new Date(date).toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'long', 
              day: 'numeric'
            })}` : '';
          },
          label: (context) => {
            const value = chartType === 'bar' ? context.parsed.x : context.parsed.y;
            return `${selectedMetric.icon} ${selectedMetric.label}: ${value} ${selectedMetric.unit}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        position: chartType === 'bar' ? 'top' : 'bottom',
        ticks: { 
          color: '#374151', 
          font: { size: chartType === 'bar' ? 14 : 12, weight: '600' },
          maxTicksLimit: chartType === 'bar' ? 6 : 8,
          padding: chartType === 'bar' ? 8 : 4
        },
        grid: { 
          color: chartType === 'bar' ? '#D1D5DB' : '#E5E7EB',
          lineWidth: chartType === 'bar' ? 2 : 1,
          drawBorder: true,
          borderColor: '#9CA3AF',
          borderWidth: 2
        },
        title: {
          display: true,
          text: chartType === 'bar' ? `${selectedMetric.label} (${selectedMetric.unit})` : 'วันที่',
          color: '#1F2937',
          font: { size: 15, weight: 'bold' },
          padding: 16
        }
      },
      y: {
        display: true,
        position: chartType === 'bar' ? 'left' : 'left',
        ticks: { 
          color: '#374151', 
          font: { size: chartType === 'bar' ? 12 : 12, weight: '500' },
          padding: chartType === 'bar' ? 12 : 4,
          callback: function(value, index) {
            if (chartType === 'bar') {
              // แสดงวันที่แบบย่อสำหรับแกน Y ในกราฟแท่ง
              const date = metrics[index]?.measurement_date;
              if (date) {
                return new Date(date).toLocaleDateString('th-TH', {
                  month: 'short',
                  day: 'numeric'
                });
              }
              return value;
            }
            return value;
          }
        },
        grid: { 
          color: chartType === 'bar' ? '#E5E7EB' : '#E5E7EB',
          lineWidth: 1,
          drawBorder: true,
          borderColor: '#9CA3AF',
          borderWidth: 1
        },
        title: {
          display: chartType === 'line',
          text: `${selectedMetric.label} (${selectedMetric.unit})`,
          color: '#1F2937',
          font: { size: 15, weight: 'bold' },
          padding: 16
        }
      }
    },
    elements: {
      line: {
        borderCapStyle: 'round',
        borderJoinStyle: 'round',
        tension: 0.4, // เพิ่มความโค้งให้เส้น
        borderWidth: 3
      },
      point: {
        radius: chartType === 'line' ? 6 : 0,
        hoverRadius: chartType === 'line' ? 8 : 0,
        borderWidth: 2
      },
      bar: {
        borderRadius: chartType === 'bar' ? 8 : 0,
        borderSkipped: false,
        borderWidth: 2
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    // เพิ่มการตั้งค่าสำหรับกราฟแท่งแนวนอน
    layout: {
      padding: {
        top: chartType === 'bar' ? 20 : 10,
        right: 20,
        bottom: chartType === 'bar' ? 10 : 20,
        left: chartType === 'bar' ? 80 : 20
      }
    }
  };

  // คำนวณสถิติ (แสดงตั้งแต่มีข้อมูลครั้งแรก)
  const rawValues = metrics.map(m => m[selected]);
  const values = metrics
    .map(m => m[selected])
    .filter(v => v != null && v !== undefined && v !== '')
    .map(v => {
      const num = typeof v === 'string' ? parseFloat(v) : Number(v);
      // สำหรับค่าสำคัญ (น้ำหนัก ความดัน ชีพจร น้ำตาล) ไม่ควรเป็น 0
      if (['weight_kg', 'systolic_bp', 'diastolic_bp', 'heart_rate', 'blood_sugar_mg'].includes(selected) && num === 0) return null;
      return isNaN(num) || num < 0 ? null : num; // เปลี่ยนจาก <= 0 เป็น < 0
    })
    .filter(v => v !== null);

  // ตรวจสอบเพิ่มเติมสำหรับความดันโลหิต
  if ((selected === 'systolic_bp' || selected === 'diastolic_bp') && values.length === 0) {
    console.warn(`⚠️ ไม่พบข้อมูล ${selected} ที่ถูกต้อง. ข้อมูลดิบ:`, rawValues);
  }
    
  // เพิ่ม debug log
  console.log('🔍 Debug HealthTrends:', {
    selected,
    selectedMetric: metricLabels[selected],
    metricsCount: metrics.length,
    validValuesCount: values.length,
    rawValues: rawValues.slice(0, 3),
    processedValues: values.slice(0, 3),
    stats: stats,
    firstMetric: metrics[0],
    availableKeys: metrics.length > 0 ? Object.keys(metrics[0]) : []
  });
    
  const stats = values.length > 0 ? {
    latest: values[values.length - 1] || 0,
    highest: values.length > 0 ? Math.max(...values) : 0,
    lowest: values.length > 0 ? Math.min(...values) : 0,
    average: values.length > 0 ? parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : 0
  } : null;

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-2xl p-8 shadow-xl border border-blue-200 max-w-6xl mx-auto mt-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
          📊 แนวโน้มสุขภาพ
        </h2>
        <p className="text-gray-600 text-lg">
          ติดตามและวิเคราะห์ข้อมูลสุขภาพของคุณเพื่อสุขภาพที่ดีขึ้น (แสดงผลตั้งแต่ข้อมูลครั้งแรก)
        </p>
      </div>

      {/* เลือกประเภทข้อมูล */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">เลือกข้อมูลที่ต้องการดู:</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(metricLabels).map(([key, metric]) => {
            const colorScheme = colors[metric.color];
            return (
              <button
                key={key}
                className={`relative overflow-hidden p-4 rounded-xl font-medium border-2 transition-all duration-300 transform hover:scale-105 ${
                  selected === key 
                    ? 'border-transparent text-white shadow-lg' 
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 shadow-sm'
                }`}
                style={selected === key ? {
                  background: colorScheme.gradient,
                  boxShadow: `0 8px 25px ${colorScheme.primary}30`
                } : {}}
                onClick={() => setSelected(key)}
              >
                <div className="flex flex-col items-center">
                  <span className="text-2xl mb-1">{metric.icon}</span>
                  <span className="text-sm font-semibold">{metric.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* เลือกประเภทกราฟ */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">รูปแบบการแสดงผล:</h3>
        <div className="flex gap-3">
          <button
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              chartType === 'line' 
                ? 'bg-blue-500 text-white shadow-lg' 
                : 'bg-white text-blue-600 border-2 border-blue-200 hover:bg-blue-50'
            }`}
            onClick={() => setChartType('line')}
          >
            📈 กราฟเส้น
          </button>
          <button
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              chartType === 'bar' 
                ? 'bg-purple-500 text-white shadow-lg' 
                : 'bg-white text-purple-600 border-2 border-purple-200 hover:bg-purple-50'
            }`}
            onClick={() => setChartType('bar')}
          >
            📊 กราฟแท่งแนวนอน
          </button>
        </div>
      </div>

      {/* สถิติด่วน - แสดงตั้งแต่มีข้อมูลครั้งแรก */}
      {stats && validMetrics.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 text-center shadow-md border border-gray-100">
            <div className="text-2xl font-bold text-blue-600">
              {stats.latest !== undefined && stats.latest !== null && !isNaN(stats.latest) ? stats.latest : '--'}
            </div>
            <div className="text-sm text-gray-600">ล่าสุด</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-md border border-gray-100">
            <div className="text-2xl font-bold text-green-600">
              {stats.highest !== undefined && stats.highest !== null && !isNaN(stats.highest) && stats.highest > 0 ? stats.highest : '--'}
            </div>
            <div className="text-sm text-gray-600">สูงสุด</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-md border border-gray-100">
            <div className="text-2xl font-bold text-orange-600">
              {stats.lowest !== undefined && stats.lowest !== null && !isNaN(stats.lowest) && stats.lowest > 0 ? stats.lowest : '--'}
            </div>
            <div className="text-sm text-gray-600">ต่ำสุด</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-md border border-gray-100">
            <div className="text-2xl font-bold text-purple-600">
              {stats.average !== undefined && stats.average !== null && !isNaN(stats.average) && stats.average > 0 ? stats.average : '--'}
            </div>
            <div className="text-sm text-gray-600">เฉลี่ย</div>
          </div>
        </div>
      ) : validMetrics.length === 0 && metrics.length > 0 ? (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <span className="text-yellow-600 mr-2">💡</span>
            <div className="text-yellow-800">
              <strong>ข้อมูล {selectedMetric.label} พร้อมแสดงแนวโน้มแล้ว!</strong> 
              <div className="text-sm mt-1">
                พบข้อมูลทั้งหมด {metrics.length} รายการ มีข้อมูลที่ใช้ได้ {values.length} รายการ
              </div>
              {values.length === 0 && (
                <div className="text-sm mt-2">
                  กรุณาตรวจสอบว่าข้อมูลในฟิลด์ "{selected}" มีค่าที่ถูกต้อง (ไม่เป็น 0, null หรือข้อความว่าง)
                </div>
              )}
              <div className="text-xs mt-2 p-2 bg-white rounded border">
                <strong>Debug Info:</strong><br/>
                - ฟิลด์ที่ใช้: {selected}<br/>
                - ข้อมูลดิบ: {JSON.stringify(rawValues.slice(0, 5))}...<br/>
                - ฟิลด์ที่มีใน DB: {metrics.length > 0 ? Object.keys(metrics[0]).join(', ') : 'ไม่มี'}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* กราฟ */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 mb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-blue-600 font-medium">กำลังโหลดข้อมูล...</span>
          </div>
        ) : validMetrics.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📊</div>
            <div className="text-gray-500 text-lg">ไม่มีข้อมูล {selectedMetric.label} ที่ถูกต้องสำหรับแสดงกราฟ</div>
            <div className="text-gray-400 text-sm mt-2">
              {metrics.length > 0 
                ? `มีข้อมูลทั้งหมด ${metrics.length} รายการ แต่ค่าไม่ถูกต้อง (เป็น 0, null หรือไม่ใช่ตัวเลข)`
                : 'กรุณาเพิ่มข้อมูลสุขภาพเพื่อดูแนวโน้ม'}
            </div>
          </div>
        ) : (
          <div>
            {/* แสดงข้อมูลที่เลือก */}
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{selectedMetric.icon}</span>
                  <div>
                    <h4 className="text-lg font-bold text-gray-800">{selectedMetric.label}</h4>
                    <p className="text-sm text-gray-600">
                      {chartType === 'line' ? 'แนวโน้มการเปลี่ยนแปลงตามเวลา' : 'เปรียบเทียบข้อมูลแต่ละวัน'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">จำนวนข้อมูลที่ใช้ได้</div>
                  <div className="text-xl font-bold text-blue-600">{validMetrics.length} รายการ</div>
                  {validMetrics.length === 1 && (
                    <div className="text-xs text-green-600 mt-1">✨ เริ่มต้นแล้ว! เพิ่มข้อมูลเพื่อดูแนวโน้ม</div>
                  )}
                </div>
              </div>
            </div>
            
            {/* แสดงกราฟ แม้มีข้อมูลเพียงจุดเดียว */}
            <div style={{ height: chartType === 'bar' ? '600px' : '450px' }}>
              {chartType === 'line' ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <Bar data={chartData} options={chartOptions} />
              )}
            </div>
            
            {/* ข้อความสำหรับข้อมูลน้อย */}
            {validMetrics.length === 1 && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start">
                  <span className="text-green-600 mr-2">🎉</span>
                  <div className="text-sm text-green-700">
                    <strong>ยินดีด้วย!</strong> คุณได้เริ่มบันทึกข้อมูล {selectedMetric.label} แล้ว! 
                    เมื่อมีข้อมูลมากขึ้น คุณจะสามารถเห็นแนวโน้มการเปลี่ยนแปลงได้ชัดเจนขึ้น
                  </div>
                </div>
              </div>
            )}
            
            {validMetrics.length >= 2 && validMetrics.length < 5 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <span className="text-blue-600 mr-2">📈</span>
                  <div className="text-sm text-blue-700">
                    <strong>ดีมาก!</strong> มีข้อมูล {validMetrics.length} จุดแล้ว เริ่มเห็นแนวโน้มได้! 
                    เพิ่มข้อมูลอีกเพื่อวิเคราะห์ที่แม่นยำยิ่งขึ้น
                  </div>
                </div>
              </div>
            )}
            
            {/* คำอธิบายเพิ่มเติมสำหรับกราฟแท่ง */}
            {chartType === 'bar' && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start">
                  <span className="text-amber-600 mr-2">💡</span>
                  <div className="text-sm text-amber-700">
                    <strong>วิธีอ่านกราฟแท่งแนวนอน:</strong> แต่ละแท่งแสดงค่าในแต่ละวัน 
                    แท่งยาวหมายถึงค่าสูง แท่งสั้นหมายถึงค่าต่ำ สามารถเปรียบเทียบได้ง่าย
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* คำอธิบาย */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-400 p-6 rounded-xl">
        <div className="flex items-start">
          <div className="text-3xl mr-4">💡</div>
          <div>
            <h4 className="text-lg font-bold text-gray-800 mb-2">คำอธิบายการใช้งาน</h4>
            <ul className="text-gray-700 space-y-1">
              <li>• <strong>กราฟเส้น:</strong> แสดงแนวโน้มการเปลี่ยนแปลงตามเวลา</li>
              <li>• <strong>กราฟแท่งแนวนอน:</strong> เปรียบเทียบค่าในแต่ละวันได้ชัดเจน</li>
              <li>• <strong>สถิติด่วน:</strong> ดูค่าสำคัญได้ในพริบตา</li>
              <li>• <strong>การเฝ้าระวัง:</strong> หากพบแนวโน้มผิดปกติ ควรปรึกษาแพทย์</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
