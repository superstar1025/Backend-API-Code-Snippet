#node version: carbon
#app version: 1.0.0

FROM node:8.11.4

RUN apt-get update && apt-get -y install mysql-client
RUN npm install -g nodemon

WORKDIR /usr/blocktetris
COPY package*.json ./
COPY api/package*.json ./api/
COPY lib/package*.json ./lib/

RUN npm install
WORKDIR /usr/blocktetris/api
RUN npm install
WORKDIR /usr/blocktetris/lib
RUN npm install

WORKDIR /usr/blocktetris
COPY . .

WORKDIR /usr/blocktetris/api

EXPOSE 3001