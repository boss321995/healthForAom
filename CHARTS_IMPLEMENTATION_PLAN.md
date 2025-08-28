# 📈 Health Trends Chart System - Implementation Plan

## 🎯 **Goal**: สร้างระบบกราฟแสดงแนวโน้มสุขภาพแบบ Interactive

## 🔍 **Feature Analysis**

### **📊 Chart Types Needed**
1. **BMI Trend Line** - แสดงการเปลี่ยนแปลงน้ำหนักและ BMI
2. **Blood Pressure Chart** - Dual-line graph (Systolic/Diastolic)
3. **Blood Sugar Monitoring** - Area chart with risk zones
4. **Heart Rate Variability** - Line chart with normal ranges
5. **Overall Health Score** - Multi-metric dashboard

### **🎨 Design Requirements**
- **Responsive**: ใช้งานได้ดีบนมือถือ
- **Interactive**: Hover, zoom, filter ได้
- **Real-time**: อัปเดตเมื่อมีข้อมูลใหม่
- **Export**: บันทึกเป็นรูปภาพได้

---

## 🛠️ **Implementation Plan (7 Days)**

### **Day 1: Setup และ Library Selection**

#### ✅ **Library Comparison**
| Library | Pros | Cons | Score |
|---------|------|------|-------|
| **Recharts** ⭐ | React-native, ง่าย, responsive | ฟีเจอร์จำกัด | 9/10 |
| Chart.js | ฟีเจอร์เยอะ, community | ไม่ React-native | 7/10 |
| D3.js | ยืดหยุ่นสูงสุด | ซับซ้อน, เวลานาน | 6/10 |

#### ✅ **Installation**
```bash
npm install recharts date-fns
npm install --save-dev @types/recharts  # if using TypeScript
```

#### ✅ **Basic Setup**
```javascript
// utils/chartHelpers.js
export const formatChartData = (healthMetrics) => {
  return healthMetrics.map(metric => ({
    date: metric.measurement_date,
    bmi: calculateBMI(metric.height_cm, metric.weight_kg),
    systolic: metric.systolic_bp,
    diastolic: metric.diastolic_bp,
    bloodSugar: metric.blood_sugar_mg,
    heartRate: metric.heart_rate
  }));
};
```

### **Day 2-3: BMI Trend Chart**

#### ✅ **Component Structure**
```javascript
// components/charts/BMITrendChart.js
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const BMITrendChart = ({ data, timeRange = '6months' }) => {
  const filteredData = filterDataByTimeRange(data, timeRange);
  
  return (
    <div className="bg-white/95 p-6 rounded-lg border-2 border-emerald-300">
      <h3 className="text-lg font-bold text-emerald-800 mb-4">
        📈 แนวโน้ม BMI
      </h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={filteredData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            stroke="#6b7280"
          />
          <YAxis 
            domain={['dataMin - 1', 'dataMax + 1']}
            stroke="#6b7280"
          />
          <Tooltip 
            formatter={(value, name) => [value?.toFixed(1), 'BMI']}
            labelFormatter={formatTooltipDate}
          />
          
          {/* BMI Line */}
          <Line 
            type="monotone" 
            dataKey="bmi" 
            stroke="#10b981" 
            strokeWidth={3}
            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
          />
          
          {/* Reference Lines */}
          <ReferenceLine y={18.5} stroke="#3b82f6" strokeDasharray="5 5" />
          <ReferenceLine y={24.9} stroke="#f59e0b" strokeDasharray="5 5" />
          <ReferenceLine y={29.9} stroke="#ef4444" strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
      
      {/* BMI Categories Legend */}
      <BMILegend />
    </div>
  );
};
```

#### ✅ **BMI Categories Reference**
```javascript
const BMILegend = () => (
  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
    <div className="flex items-center">
      <div className="w-3 h-3 bg-blue-400 rounded mr-2"></div>
      <span>น้ำหนักน้อย (&lt;18.5)</span>
    </div>
    <div className="flex items-center">
      <div className="w-3 h-3 bg-green-400 rounded mr-2"></div>
      <span>ปกติ (18.5-24.9)</span>
    </div>
    <div className="flex items-center">
      <div className="w-3 h-3 bg-yellow-400 rounded mr-2"></div>
      <span>น้ำหนักเกิน (25-29.9)</span>
    </div>
    <div className="flex items-center">
      <div className="w-3 h-3 bg-red-400 rounded mr-2"></div>
      <span>อ้วน (&gt;30)</span>
    </div>
  </div>
);
```

### **Day 4: Blood Pressure Chart**

#### ✅ **Dual-Line Chart Implementation**
```javascript
// components/charts/BloodPressureChart.js
const BloodPressureChart = ({ data, timeRange }) => {
  return (
    <div className="bg-white/95 p-6 rounded-lg border-2 border-red-300">
      <h3 className="text-lg font-bold text-red-800 mb-4">
        💓 แนวโน้มความดันโลหิต
      </h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={formatDate} />
          <YAxis domain={[60, 180]} />
          <Tooltip 
            formatter={(value, name) => [
              value, 
              name === 'systolic' ? 'ตัวบน' : 'ตัวล่าง'
            ]}
          />
          
          {/* Systolic Line */}
          <Line 
            type="monotone" 
            dataKey="systolic" 
            stroke="#dc2626" 
            strokeWidth={3}
            name="systolic"
          />
          
          {/* Diastolic Line */}
          <Line 
            type="monotone" 
            dataKey="diastolic" 
            stroke="#7c2d12" 
            strokeWidth={3}
            name="diastolic"
          />
          
          {/* Risk Zone References */}
          <ReferenceLine y={120} stroke="#f59e0b" strokeDasharray="5 5" />
          <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="5 5" />
          <ReferenceLine y={140} stroke="#dc2626" strokeDasharray="5 5" />
          <ReferenceLine y={90} stroke="#dc2626" strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
      
      <BloodPressureZones />
    </div>
  );
};
```

### **Day 5: Blood Sugar Area Chart**

#### ✅ **Area Chart with Risk Zones**
```javascript
// components/charts/BloodSugarChart.js
const BloodSugarChart = ({ data, timeRange }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          {/* Gradient for normal range */}
          <linearGradient id="normalRange" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
          </linearGradient>
          
          {/* Gradient for high range */}
          <linearGradient id="highRange" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={formatDate} />
        <YAxis domain={[50, 200]} />
        <Tooltip />
        
        <Area 
          type="monotone" 
          dataKey="bloodSugar" 
          stroke="#10b981" 
          fillOpacity={1}
          fill="url(#normalRange)"
        />
        
        {/* Risk Zones */}
        <ReferenceLine y={99} stroke="#10b981" strokeDasharray="5 5" />
        <ReferenceLine y={125} stroke="#f59e0b" strokeDasharray="5 5" />
        <ReferenceLine y={126} stroke="#ef4444" strokeDasharray="5 5" />
      </AreaChart>
    </ResponsiveContainer>
  );
};
```

### **Day 6: Interactive Features**

#### ✅ **Time Range Selector**
```javascript
const TimeRangeSelector = ({ selectedRange, onRangeChange }) => {
  const ranges = [
    { key: '1week', label: '1 สัปดาห์' },
    { key: '1month', label: '1 เดือน' },
    { key: '3months', label: '3 เดือน' },
    { key: '6months', label: '6 เดือน' },
    { key: '1year', label: '1 ปี' },
    { key: 'all', label: 'ทั้งหมด' }
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {ranges.map(range => (
        <button
          key={range.key}
          onClick={() => onRangeChange(range.key)}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
            selectedRange === range.key
              ? 'bg-blue-600 text-white'
              : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
};
```

#### ✅ **Export Functionality**
```javascript
const ChartExport = ({ chartRef, filename }) => {
  const exportChart = async (format) => {
    if (format === 'png') {
      // ใช้ html2canvas
      const canvas = await html2canvas(chartRef.current);
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  return (
    <div className="flex gap-2">
      <button 
        onClick={() => exportChart('png')}
        className="px-3 py-1 bg-green-600 text-white rounded text-sm"
      >
        📥 ดาวน์โหลด PNG
      </button>
    </div>
  );
};
```

### **Day 7: Integration และ Testing**

#### ✅ **HealthAnalytics Integration**
```javascript
// อัปเดต HealthAnalytics.js
const renderTrendsTab = () => {
  const [timeRange, setTimeRange] = useState('6months');
  const chartData = useMemo(() => 
    formatChartData(recentMetrics), [recentMetrics]
  );

  return (
    <div className="space-y-6">
      <TimeRangeSelector 
        selectedRange={timeRange}
        onRangeChange={setTimeRange}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BMITrendChart data={chartData} timeRange={timeRange} />
        <BloodPressureChart data={chartData} timeRange={timeRange} />
        <BloodSugarChart data={chartData} timeRange={timeRange} />
        <HeartRateChart data={chartData} timeRange={timeRange} />
      </div>
    </div>
  );
};
```

---

## 📊 **Expected Results**

### **User Engagement Metrics**
- Time spent on analytics page: **+300%**
- Data comprehension rate: **+150%**
- Health insights discovery: **+200%**

### **Technical Performance**
- Chart rendering time: **<500ms**
- Mobile responsiveness: **100%**
- Data accuracy: **99.9%**

---

## 🚀 **Quick Start Commands**

```bash
# Install dependencies
npm install recharts date-fns html2canvas

# Create chart components
mkdir -p src/components/charts
mkdir -p src/utils/chart-helpers

# Start with BMI chart
touch src/components/charts/BMITrendChart.js
touch src/utils/chart-helpers.js
```

**🎯 พร้อมสร้างกราฟที่สวยงามและมีประโยชน์แล้วไหมครับ?**
