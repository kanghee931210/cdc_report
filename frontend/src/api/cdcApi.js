import axios from 'axios';

// ✅ 접속하는 환경의 IP로 설정 (본인 PC IP)
const API_BASE = '/api'; 

export const getUploadedDates = async () => {
  const response = await axios.get(`${API_BASE}/dates`);
  return response.data;
};

export const uploadFile = async (dateStr, file) => {
  const formData = new FormData();
  // 👇 백엔드의 'date', 'file' 변수명과 일치
  formData.append('date', dateStr); 
  formData.append('file', file);

  const response = await axios.post(`${API_BASE}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const deleteDate = async (dateStr) => {
  const response = await axios.delete(`${API_BASE}/delete/${dateStr}`);
  return response.data;
};

export const analyzeDates = async (dateOld, dateNew) => {
  const response = await axios.post(`${API_BASE}/analyze`, {
    date_old: dateOld,
    date_new: dateNew
  });
  return response.data;
};

export const askLLM = async (question, contextData) => {
  try {
    // 🔥 [수정] http://localhost:7676 제거 -> API_BASE 사용
    // 실제 요청 URL: http://10.23.80.35:1577/api/ask-report
    const response = await axios.post(`${API_BASE}/ask-report`, {
      question: question,
      context_data: contextData
    });
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

export const getMonthlyStats = async (year, month) => {
  const response = await axios.get(`${API_BASE}/stats/monthly`, {
    params: { year, month }
  });
  return response.data;
};