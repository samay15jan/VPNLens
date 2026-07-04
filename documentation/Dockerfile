FROM node:22-slim AS builder

WORKDIR /docs

RUN apt-get update && \
    apt-get install -y --no-install-recommends libicu-dev && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g retypeapp

COPY . .

RUN retype build

FROM nginx:alpine

COPY --from=builder /docs/.retype /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]