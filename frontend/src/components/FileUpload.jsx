import React from 'react';
import { Button, Box, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

// 👇 [핵심] export default를 함수 정의와 동시에 합니다.
export default function FileUpload({ label, file, onFileSelect }) {
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <Box sx={{ border: '1px dashed #ccc', p: 2, borderRadius: 2, textAlign: 'center', width: '100%' }}>
      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
        {label}
      </Typography>
      
      <Button
        component="label"
        variant="outlined"
        startIcon={<CloudUploadIcon />}
        size="small"
      >
        파일 선택
        <input type="file" hidden accept=".csv" onChange={handleFileChange} />
      </Button>

      {file && (
        <Typography variant="body2" sx={{ mt: 1, color: 'primary.main', fontWeight: 'bold' }}>
          📄 {file.name}
        </Typography>
      )}
    </Box>
  );
}