# Build Retype site
FROM node:22-alpine AS builder

WORKDIR /docs

RUN npm install -g retypeapp

COPY . .

RUN retype build

# Serve with nginx
FROM nginx:alpine

COPY --from=builder /docs/.retype /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]