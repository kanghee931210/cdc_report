# backend/Dockerfile

# 1. Python 3.9 슬림 이미지 사용
FROM python:3.9-slim

# 2. 작업 디렉토리 설정
WORKDIR /app

# 3. 의존성 파일 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. 소스 코드 복사
COPY . .

# 5. 데이터 저장을 위한 폴더 생성 (SQLite 파일용)
RUN mkdir -p /app/data

# 6. 서버 실행 (host 0.0.0.0 필수)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]