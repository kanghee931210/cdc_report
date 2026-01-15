# 1. 빌드 단계 (Node 버전 업그레이드: 18 -> 22)
FROM node:22-alpine as build-stage
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# 2. 실행 단계 (Nginx)
FROM nginx:alpine as production-stage

# ⚠️ [수정됨] Vite는 결과물을 'dist' 폴더에 만듭니다.
# 기존: /app/build -> /app/dist 로 변경
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Nginx 설정 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]