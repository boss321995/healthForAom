-- Add new laboratory test fields to health_metrics table
-- เพิ่มฟิลด์ใหม่สำหรับการตรวจเลือดครบถ้วน

ALTER TABLE health_metrics 
ADD uric_acid DECIMAL(5,2)
COMMENT 'กรดยูริกในเลือด (mg/dL)',
ADD alt DECIMAL
(6,2) COMMENT 'ALT - ตับ (U/L)',
ADD ast DECIMAL
(6,2) COMMENT 'AST - ตับ (U/L)',
ADD hemoglobin DECIMAL
(5,2) COMMENT 'ฮีโมโกลบิน (g/dL)',
ADD hematocrit DECIMAL
(5,2) COMMENT 'ฮีมาโตคริต (%)',
ADD iron DECIMAL
(6,2) COMMENT 'ธาตุเหล็ก (μg/dL)',
ADD tibc DECIMAL
(6,2) COMMENT 'TIBC - ความจุรวมของการจับธาตุเหล็ก (μg/dL)';

-- สร้าง index สำหรับการค้นหาที่เร็วขึ้น
CREATE INDEX idx_health_metrics_uric_acid ON health_metrics(uric_acid);
CREATE INDEX idx_health_metrics_liver ON health_metrics(alt, ast);
CREATE INDEX idx_health_metrics_blood ON health_metrics(hemoglobin, hematocrit);
CREATE INDEX idx_health_metrics_iron ON health_metrics(iron, tibc);
