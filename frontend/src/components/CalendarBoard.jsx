import React, { useState, useEffect, useRef } from 'react';
import { Paper, Box, Typography, CircularProgress, Divider, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import dayjs from 'dayjs';

// 차트 라이브러리
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine 
} from 'recharts';

import { getMonthlyStats } from '../api/cdcApi';

// -------------------------------------------------------------------------
// [커스텀] ServerDay: 더블 클릭 이벤트
// -------------------------------------------------------------------------
function ServerDay(props) {
  const { highlightedDays = [], day, outsideCurrentMonth, onDayDoubleClick, ...other } = props;
  const isSelected = !props.outsideCurrentMonth && highlightedDays.indexOf(props.day.format('YYYY-MM-DD')) >= 0;

  return (
    <Box 
      sx={{ position: 'relative' }}
      onDoubleClick={(e) => {
        if (!outsideCurrentMonth) onDayDoubleClick(e, day);
      }}
    >
      <PickersDay {...other} outsideCurrentMonth={outsideCurrentMonth} day={day} 
        sx={{
          ...(isSelected && {
            bgcolor: 'primary.light',
            color: 'primary.contrastText',
            fontWeight: 'bold',
            '&:hover': { bgcolor: 'primary.main' },
          }),
        }}
      />
    </Box>
  );
}

// -------------------------------------------------------------------------
// 메인 컴포넌트
// -------------------------------------------------------------------------
export default function CalendarBoard({ filesMap, onUpload, onDelete, onSelectDate, selectedDateStr }) {
  const [currentDate, setCurrentDate] = useState(dayjs(selectedDateStr));
  const [chartData, setChartData] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);
  
  // 메뉴 상태 관리
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedMenuDate, setSelectedMenuDate] = useState(null);
  const fileInputRef = useRef(null);

  const highlightedDays = Object.keys(filesMap);

  useEffect(() => {
    if (selectedDateStr) {
      setCurrentDate(dayjs(selectedDateStr));
    }
  }, [selectedDateStr]);

  // 차트 데이터 로드 (월 전체)
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingChart(true);
      try {
        const year = currentDate.format('YYYY');
        const month = currentDate.format('MM');
        const daysInMonth = currentDate.daysInMonth(); 
        
        const apiData = await getMonthlyStats(year, month);
        
        const dataMap = {};
        apiData.forEach(item => {
          dataMap[item.date] = item;
        });

        const fullMonthData = [];
        for (let i = 1; i <= daysInMonth; i++) {
          const dayStr = String(i).padStart(2, '0');
          const dateKey = `${year}-${month}-${dayStr}`;
          const stats = dataMap[dateKey];
          
          fullMonthData.push({
            day: dayStr,
            fullDate: dateKey,
            impact: stats ? stats.impact : 0,
            fillColor: stats 
              ? (stats.impact >= 0 ? '#3b82f6' : '#ef4444') 
              : '#e2e8f0' 
          });
        }
        setChartData(fullMonthData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingChart(false);
      }
    };
    fetchStats();
  }, [currentDate.format('YYYY-MM'), filesMap]);

  // -------------------------------------------------------------------------
  // 핸들러 모음
  // -------------------------------------------------------------------------

  // 1. 더블 클릭 -> 메뉴 오픈
  const handleDayDoubleClick = (event, day) => {
    setMenuAnchor(event.currentTarget);
    setSelectedMenuDate(day);
  };

  // 2. 메뉴 닫기 (일반적인 닫기 - 날짜 정보 지움)
  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedMenuDate(null);
  };

  // 3. 🔥 [수정됨] 메뉴 -> 파일 선택창 열기
  const handleMenuUpload = () => {
    // ⚠️ 중요: 여기서 setSelectedMenuDate(null)을 호출하면 안 됩니다!
    // 파일 선택이 완료될 때까지 날짜 정보를 유지해야 합니다.
    setMenuAnchor(null); // 메뉴(UI)만 닫음
    
    if (fileInputRef.current) {
      fileInputRef.current.click(); 
    }
  };

  // 4. 메뉴 -> 삭제
  const handleMenuDelete = () => {
    const dateToDelete = selectedMenuDate; // 삭제할 날짜 임시 저장
    handleMenuClose(); // 메뉴 닫기
    
    if (dateToDelete) {
      const dateStr = dateToDelete.format('YYYY-MM-DD');
      if (window.confirm(`${dateStr} 데이터를 정말 삭제하시겠습니까?`)) {
        onDelete(dateStr);
      }
    }
  };

  // 5. 🔥 [수정됨] 실제 파일 선택 시 처리
  const handleFileChange = (e) => {
    // 메뉴에서 선택된 날짜가 살아있는지 확인
    if (e.target.files?.[0] && selectedMenuDate) {
      onUpload(selectedMenuDate.format('YYYY-MM-DD'), e.target.files[0]);
    }
    
    // 업로드 시도 후 초기화
    e.target.value = ''; 
    setSelectedMenuDate(null); // 이제 날짜 정보 지워도 됨
  };

  // 6. 차트 막대 클릭
  const handleBarClick = (data) => {
    if (data && data.fullDate) {
      const targetDate = dayjs(data.fullDate);
      setCurrentDate(targetDate);
      onSelectDate(targetDate);
    }
  };

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* 숨겨진 파일 Input */}
      <input 
        type="file" 
        ref={fileInputRef}
        style={{ display: 'none' }} 
        accept=".xlsx, .xls, .csv"
        onChange={handleFileChange}
      />

      {/* 1. 상단 캘린더 */}
      <Box sx={{ p: 2, pb: 0, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, px: 1 }}>
          <Typography variant="h6" fontWeight={700}>📅 Daily History</Typography>
        </Box>
        
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DateCalendar 
            value={currentDate}
            onChange={(newValue) => {
              setCurrentDate(newValue);
              onSelectDate(newValue);
            }}
            onMonthChange={(newMonth) => setCurrentDate(newMonth)}
            slots={{ day: ServerDay }}
            slotProps={{ 
              day: { 
                highlightedDays,
                onDayDoubleClick: handleDayDoubleClick 
              } 
            }}
            sx={{ 
              width: '100%', 
              margin: 0,
              maxHeight: '280px', 
              minHeight: '250px',
              '& .MuiPickersCalendarHeader-root': { marginTop: 0, paddingLeft: 0, marginBottom: 1 },
              '& .MuiDayCalendar-header': { marginTop: 0 },
            }}
          />
        </LocalizationProvider>
      </Box>
      
      {/* 더블 클릭 컨텍스트 메뉴 */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
        transformOrigin={{ vertical: 'center', horizontal: 'center' }}
      >
        <MenuItem onClick={handleMenuUpload}>
          <ListItemIcon><UploadFileIcon fontSize="small" color="primary" /></ListItemIcon>
          <ListItemText>파일 업로드/교체</ListItemText>
        </MenuItem>
        
        {selectedMenuDate && highlightedDays.includes(selectedMenuDate.format('YYYY-MM-DD')) && (
          <MenuItem onClick={handleMenuDelete}>
            <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText sx={{ color: 'error.main' }}>데이터 삭제</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <Divider sx={{ my: 1 }} />

      {/* 2. 하단 차트 */}
      <Box sx={{ 
        flex: 1, 
        p: 2, pt: 0, 
        display: 'flex', flexDirection: 'column', 
        minHeight: '200px', bgcolor: '#f8fafc'
      }}>
        <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1, fontSize: '0.85rem', fontWeight: 600 }}>
          📊 {currentDate.format('M월')} 전체 매출 변동
        </Typography>

        <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
          {loadingChart ? (
            <Box sx={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <CircularProgress size={20} />
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="day" tick={{ fontSize: 9 }} interval={0} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(val) => [new Intl.NumberFormat('ko-KR').format(val) + '원', '변동액']}
                  labelFormatter={(label) => `${currentDate.format('M')}월 ${label}일`}
                  contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                />
                <ReferenceLine y={0} stroke="#ccc" />
                <Bar 
                  dataKey="impact" 
                  radius={[2, 2, 0, 0]} 
                  onClick={handleBarClick}
                  style={{ cursor: 'pointer' }}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.fillColor} 
                      fillOpacity={entry.impact === 0 ? 0 : 1} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Box>
      </Box>
    </Paper>
  );
}