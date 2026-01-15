import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, Button, Typography, Paper, Avatar, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import { askLLM } from '../api/cdcApi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * AI Chat Panel Component
 * 마크다운 테이블 + 리스트 + 레이아웃 깨짐 방지 완벽 적용
 */
export default function AIChatPanel({ contextData }) {
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { 
      role: 'ai', 
      text: '안녕하세요! \n\n 현재 페이지의 리포트 데이터 기반으로 답변해 드립니다.\n\n 궁금한 내용을 물어보세요.' 
    }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, loading]);

  const handleAsk = async () => {
    if (!question.trim()) return;
    
    const newChat = { role: 'user', text: question };
    setChatHistory(prev => [...prev, newChat]);
    setQuestion(""); 
    setLoading(true);

    try {
      const result = await askLLM(newChat.text, contextData);
      setChatHistory(prev => [...prev, { role: 'ai', text: result.answer }]);
    } catch (e) {
      console.error(e);
      setChatHistory(prev => [...prev, { role: 'ai', text: "❌ 분석 서버와 연결할 수 없거나 오류가 발생했습니다." }]);
    } finally { 
      setLoading(false); 
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#f8fafc' }}>
      
      {/* 채팅 내역 영역 */}
      <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {chatHistory.map((msg, i) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: 1 }}>
            
            {msg.role === 'ai' && (
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', mt: 0.5, flexShrink: 0 }}>
                <SmartToyIcon fontSize="small" />
              </Avatar>
            )}
            
            <Paper elevation={0} sx={{ 
              p: 2, 
              borderRadius: 2, 
              maxWidth: '88%', // 테이블이 넓을 수 있으므로 약간 더 넓게
              
              // 텍스트 줄바꿈 처리
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              
              bgcolor: msg.role === 'user' ? '#1e40af' : '#ffffff', 
              color: msg.role === 'user' ? '#fff' : '#1e293b',
              boxShadow: msg.role === 'ai' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              borderTopLeftRadius: msg.role === 'ai' ? 0 : 8,
              borderTopRightRadius: msg.role === 'user' ? 0 : 8,

              // ============================================
              // 🔥 [스타일] 마크다운 요소별 CSS (테이블 추가됨)
              // ============================================
              
              // 1. 기본 텍스트
              '& p': { m: 0, mb: 1, lineHeight: 1.6, fontSize: '0.9rem' },
              '& p:last-child': { mb: 0 },

              // 2. 리스트
              '& ul, & ol': { pl: 2.5, my: 1 },
              '& li': { mb: 0.5 },
              '& ol > li > ul': { my: 0.5, pl: 2, listStyleType: 'disc' },

              // 3. 헤더
              '& h1, & h2, & h3': { 
                fontSize: '1rem', fontWeight: 800, mt: 2, mb: 1, 
                color: msg.role === 'user' ? '#fff' : '#1e40af',
                borderBottom: msg.role === 'user' ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e2e8f0',
                pb: 0.5
              },

              // 4. 🔥 테이블 스타일 (엑셀처럼 보이게)
              '& table': {
                width: '100%',
                borderCollapse: 'collapse',
                my: 1.5,
                fontSize: '0.8rem', // 테이블 글씨는 조금 작게
                bgcolor: msg.role === 'user' ? 'transparent' : '#fff', // 유저 말풍선일 땐 투명
              },
              '& th': {
                border: msg.role === 'user' ? '1px solid rgba(255,255,255,0.3)' : '1px solid #e2e8f0',
                padding: '8px',
                backgroundColor: msg.role === 'user' ? 'rgba(255,255,255,0.1)' : '#f8fafc',
                fontWeight: 700,
                textAlign: 'left'
              },
              '& td': {
                border: msg.role === 'user' ? '1px solid rgba(255,255,255,0.3)' : '1px solid #e2e8f0',
                padding: '8px',
                verticalAlign: 'top'
              },
              '& tr:nth-of-type(even)': {
                // 짝수 행 배경색 (AI 메시지일 때만)
                backgroundColor: msg.role === 'ai' ? '#f9f9f9' : 'transparent'
              },

              // 5. 기타
              '& strong': { fontWeight: 700 },
              '& a': { color: msg.role === 'user' ? '#fff' : '#2563eb', textDecoration: 'underline' }
            }}>
              {/* remarkGfm 플러그인이 있어야 테이블을 인식함 */}
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {msg.text}
              </ReactMarkdown>
            </Paper>

            {msg.role === 'user' && (
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#94a3b8', mt: 0.5, flexShrink: 0 }}>
                <PersonIcon fontSize="small" />
              </Avatar>
            )}
          </Box>
        ))}
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#e2e8f0', px: 2, py: 0.5, borderRadius: 10 }}>
              <CircularProgress size={14} />
              <Typography variant="caption" color="textSecondary">분석 중...</Typography>
            </Box>
          </Box>
        )}
      </Box>
      
      {/* 입력창 영역 */}
      <Box sx={{ p: 2, bgcolor: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 1 }}>
        <TextField 
          fullWidth size="small" 
          value={question} 
          onChange={(e) => setQuestion(e.target.value)} 
          placeholder="질문을 입력하세요..." 
          disabled={loading}
          onKeyPress={handleKeyPress}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: '#f8fafc' } }}
        />
        <Button 
          variant="contained" 
          onClick={handleAsk} 
          disabled={loading || !question.trim()} 
          sx={{ minWidth: 48, width: 48, height: 40, borderRadius: 3, p: 0 }}
        >
          <SendIcon fontSize="small" />
        </Button>
      </Box>
    </Box>
  );
}