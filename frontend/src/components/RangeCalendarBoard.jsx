import React, { useState, useRef } from 'react';
import { Paper, Box, Typography, Menu, MenuItem, ListItemIcon, ListItemText, Chip } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

// -------------------------------------------------------------------------
// [커스텀] RangeServerDay: 구간 선택 및 하이라이팅 처리
// -------------------------------------------------------------------------
function RangeServerDay(props) {
  const { 
    highlightedDays = [], day, outsideCurrentMonth, 
    startDate, endDate, 
    onDayDoubleClick, ...other 
  } = props;

  const isFileExists = !outsideCurrentMonth && highlightedDays.indexOf(day.format('YYYY-MM-DD')) >= 0;
  
  // 선택 상태 확인
  const isStart = startDate && day.isSame(startDate, 'day');
  const isEnd = endDate && day.isSame(endDate, 'day');
  const isInRange = startDate && endDate && day.isBetween(startDate, endDate, 'day', '[]');

  // 스타일 결정
  let bgStyle = {};
  if (isStart) bgStyle = { bgcolor: '#1e40af !important', color: '#fff !important', borderRadius: '50%' };
  else if (isEnd) bgStyle = { bgcolor: '#dc2626 !important', color: '#fff !important', borderRadius: '50%' };
  else if (isInRange) bgStyle = { bgcolor: '#dbeafe', borderRadius: 0 }; // 구간 사이 연한 파랑
  else if (isFileExists) bgStyle = { border: '1px solid #1e40af' }; // 파일만 있는 날은 테두리

  return (
    <Box sx={{ position: 'relative' }} onDoubleClick={(e) => !outsideCurrentMonth && onDayDoubleClick(e, day)}>
      <PickersDay 
        {...other} 
        outsideCurrentMonth={outsideCurrentMonth} 
        day={day} 
        sx={{ ...bgStyle, fontWeight: (isStart || isEnd) ? 'bold' : 'normal' }}
      />
    </Box>
  );
}

// -------------------------------------------------------------------------
// 메인 컴포넌트: RangeCalendarBoard
// -------------------------------------------------------------------------
export default function RangeCalendarBoard({ filesMap, onUpload, onDelete, onRangeSelect }) {
  // 달력 뷰 기준 날짜 (네비게이션용)
  const [currentViewDate, setCurrentViewDate] = useState(dayjs());
  
  // 선택된 두 날짜 (Start, End)
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // 메뉴 상태
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedMenuDate, setSelectedMenuDate] = useState(null);
  const fileInputRef = useRef(null);
  const highlightedDays = Object.keys(filesMap);

  // 날짜 선택 로직 (클릭 시 동작)
  const handleDateClick = (newDate) => {
    // 1. 아무것도 없거나, 이미 둘 다 선택되어 있으면 -> 시작일로 리셋
    if ((!startDate && !endDate) || (startDate && endDate)) {
      setStartDate(newDate);
      setEndDate(null);
      onRangeSelect(newDate, null);
    } 
    // 2. 시작일만 있고 종료일은 없을 때
    else if (startDate && !endDate) {
      if (newDate.isBefore(startDate)) {
        // 시작일보다 이전 날짜를 찍으면 순서 교체
        setEndDate(startDate);
        setStartDate(newDate);
        onRangeSelect(newDate, startDate);
      } else {
        setEndDate(newDate);
        onRangeSelect(startDate, newDate);
      }
    }
  };

  // 더블 클릭 메뉴 핸들러들
  const handleDayDoubleClick = (e, day) => { setMenuAnchor(e.currentTarget); setSelectedMenuDate(day); };
  const handleMenuClose = () => { setMenuAnchor(null); setSelectedMenuDate(null); };
  const handleMenuUpload = () => { setMenuAnchor(null); fileInputRef.current?.click(); };
  const handleMenuDelete = () => {
    const d = selectedMenuDate; handleMenuClose();
    if (d && window.confirm(`${d.format('YYYY-MM-DD')} 삭제하시겠습니까?`)) onDelete(d.format('YYYY-MM-DD'));
  };
  const handleFileChange = (e) => {
    if (e.target.files?.[0] && selectedMenuDate) onUpload(selectedMenuDate.format('YYYY-MM-DD'), e.target.files[0]);
    e.target.value = ''; setSelectedMenuDate(null);
  };

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

      {/* 상단 정보 및 캘린더 */}
      <Box sx={{ p: 2, flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, px: 1 }}>
          <Typography variant="h6" fontWeight={700}>📅 Period Select</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {startDate && <Chip label={`시작: ${startDate.format('MM-DD')}`} color="primary" size="small" />}
            {endDate && <Chip label={`종료: ${endDate.format('MM-DD')}`} color="error" size="small" />}
          </Box>
        </Box>
        
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DateCalendar 
            value={startDate || currentViewDate} // 캘린더 뷰 유지
            onChange={handleDateClick}
            onMonthChange={setCurrentViewDate} // 월 이동 시 뷰 업데이트
            slots={{ day: RangeServerDay }}
            slotProps={{ 
              day: { highlightedDays, startDate, endDate, onDayDoubleClick: handleDayDoubleClick } 
            }}
            sx={{ width: '100%', margin: 0, 
              '& .MuiPickersCalendarHeader-root': { marginTop: 0, paddingLeft: 0, marginBottom: 1 },
              '& .MuiDayCalendar-header': { marginTop: 0 },
            }}
          />
        </LocalizationProvider>
      </Box>

      {/* 메뉴 (업로드/삭제) */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem onClick={handleMenuUpload}><ListItemIcon><UploadFileIcon fontSize="small" /></ListItemIcon><ListItemText>업로드</ListItemText></MenuItem>
        <MenuItem onClick={handleMenuDelete}><ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon><ListItemText sx={{color:'error.main'}}>삭제</ListItemText></MenuItem>
      </Menu>

      {/* 🔥 하단 그래프 영역 완전히 삭제됨 */}
    </Paper>
  );
}