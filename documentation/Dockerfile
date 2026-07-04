FROM node:22-slim AS builder

WORKDIR /docs

RUN npm install -g retypeapp

COPY . .

RUN retype build

FROM nginx:alpine

COPY --from=builder /docs/.retype /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]