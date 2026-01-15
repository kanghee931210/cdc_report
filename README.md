# CDC Report Dashboard

프로젝트 변동 데이터를 분석하고 시각화하는 엔터프라이즈 대시보드 시스템입니다. 일일 또는 기간별 프로젝트 데이터를 비교하여 신규 추가, 취소, 변동, 선매출, 이월 등의 변화를 자동으로 분석하고 AI 기반 인사이트를 제공합니다.

## 📋 주요 기능

- **데이터 업로드 및 관리**: 엑셀(.xlsx) 및 CSV 파일 업로드, 날짜별 데이터 관리
- **CDC 분석**: 전일 대비 또는 기간별 프로젝트 변동 자동 분석
  - 신규 추가 (New)
  - 취소/드랍 (Delete)
  - 기존 변동 (Update)
  - 선매출/증액 (Advance Sales)
  - 이월/감액 (Carry Over)
- **시각화 대시보드**
  - 경영진 요약 리포트
  - 수주 가능성 기반 필터링
  - 부문/부서별 차트
  - 일일 트렌드 차트
- **AI 인사이트**: LangChain 기반 AI 챗봇으로 데이터 분석 질의응답
- **캘린더 기반 UI**: 직관적인 날짜 선택 및 데이터 관리

## 🛠 기술 스택

### Backend
- **FastAPI** - Python 웹 프레임워크
- **SQLAlchemy** - ORM 및 데이터베이스 관리
- **SQLite** - 데이터 저장소
- **Pandas** - 데이터 처리 및 분석
- **LangChain** - AI 서비스 통합 (vLLM 지원)

### Frontend
- **React 19** - UI 프레임워크
- **Vite** - 빌드 도구
- **Material-UI (MUI)** - UI 컴포넌트 라이브러리
- **Recharts** - 데이터 시각화
- **Axios** - HTTP 클라이언트

### Infrastructure
- **Docker** & **Docker Compose** - 컨테이너화 및 배포
- **Nginx** - 프론트엔드 웹 서버 및 리버스 프록시

## 📦 설치 및 실행

### 사전 요구사항
- Docker 및 Docker Compose 설치
- (선택) Python 3.9+, Node.js 22+ (로컬 개발 시)

### Docker Compose를 사용한 실행 (권장)

1. **저장소 클론**
