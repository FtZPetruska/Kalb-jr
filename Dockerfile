FROM node:22-alpine

WORKDIR /app

COPY . .

RUN apk update
RUN apk add build-base python3
RUN yarn install --production
RUN yarn build

CMD ["yarn", "start"]
