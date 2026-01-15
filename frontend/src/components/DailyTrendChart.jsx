import React, { useState, useEffect } from 'react';
import { Paper, Box, Typography, IconButton, CircularProgress, Divider } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import dayjs from 'dayjs';

// 🔥 차트 라이브러리 (npm install recharts 필요)
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { getMonthlyStats } from '../api/cdcApi';

function ServerDay(props) {
  const { highlightedDays = [], day, outsideCurrentMonth, onDelete, ...other } = props;
  const isSelected = !props.outsideCurrentMonth && highlightedDays.indexOf(props.day.format('YYYY-MM-DD')) >= 0;

  return (
    <Box sx={{ position: 'relative' }}>
      <PickersDay {...other} outsideCurrentMonth={outsideCurrentMonth} day={day} 
        sx={{
          ...(isSelected && {
            bgcolor: 'primary.light',
            color: 'primary.contrastText',
            '&:hover': { bgcolor: 'primary.main' },
          }),
        }}
      />
      {isSelected && (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('삭제하시겠습니까?')) onDelete(day.format('YYYY-MM-DD'));
          }}
          sx={{ position: 'absolute', top: -4, right: -4, p: 0.5, bgcolor: 'white', border: '1px solid #eee' }}
        >
          <DeleteIcon sx={{ fontSize: 10, color: 'error.main' }} />
        </IconButton>
      )}
    </Box>
  );
}

export default function CalendarBoard({ filesMap, onUpload, onDelete, onSelectDate, selectedDateStr }) {
  const [currentDate, setCurrentDate] = useState(dayjs(selectedDateStr));
  const [chartData, setChartData] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);

  const highlightedDays = Object.keys(filesMap);

  const handleUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls, .csv';
    input.onchange = (e) => {
      if (e.target.files?.[0]) onUpload(dayjs(currentDate).format('YYYY-MM-DD'), e.target.files[0]);
    };
    input.click();
  };

  // 🔥 월이 바뀌거나 파일이 변경되면 '저장된 통계'만 가볍게 가져옴
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingChart(true);
      try {
        const year = currentDate.format('YYYY');
        const month = currentDate.format('MM');
        
        // 백엔드에서 DB Cache만 조회해서 가져옴
        const data = await getMonthlyStats(year, month);
        
        // 차트용 데이터 가공
        const formatted = data.map(item => ({
          ...item,
          day: dayjs(item.date).format('DD'), // X축: 날짜(일)만 표시
          fillColor: item.impact >= 0 ? '#3b82f6' : '#ef4444' // 파랑/빨강 색상 지정
        }));
        setChartData(formatted);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingChart(false);
      }
    };
    fetchStats();
  }, [currentDate.format('YYYY-MM'), filesMap]);

  return (
    <Paper sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      
      {/* 1. 캘린더 영역 */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, px: 1 }}>
          <Typography variant="h6" fontWeight={700}>Daily History</Typography>
          <IconButton color="primary" onClick={handleUploadClick}><CloudUploadIcon /></IconButton>
        </Box>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DateCalendar 
            value={currentDate}
            onChange={(newValue) => { setCurrentDate(newValue); onSelectDate(newValue); }}
            onMonthChange={(newMonth) => setCurrentDate(newMonth)}
            slots={{ day: ServerDay }}
            slotProps={{ day: { highlightedDays, onDelete } }}
            sx={{ width: '100%', maxHeight: 280, minHeight: 280 }} // 높이 고정
          />
        </LocalizationProvider>
      </Box>

      <Divider />

      {/* 2. 매출 변동 차트 영역 */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1, fontSize: '0.85rem' }}>
          📉 {currentDate.format('M월')} 매출 변동 추이 (Total Impact)
        </Typography>

        {loadingChart ? (
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CircularProgress size={20} />
          </Box>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={0} />
              <Tooltip 
                formatter={(val) => new Intl.NumberFormat('ko-KR').format(val) + '원'}
                labelFormatter={(label) => `${currentDate.format('M')}월 ${label}일`}
                contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
              />
              <ReferenceLine y={0} stroke="#ccc" />
              <Bar dataKey="impact" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fillColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: 0.5 }}>
            <Typography variant="caption">분석 데이터 없음</Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}