FROM node:22.17.1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 --home /home/nextjs nextjs

WORKDIR /home/nextjs
RUN apt-get update && apt-get install -y bash net-tools iputils-ping dnsutils

USER nextjs

ARG API_BASE_URL

COPY --chown=nextjs:nodejs src ./src
COPY --chown=nextjs:nodejs tsconfig.json ./
COPY --chown=nextjs:nodejs package.json ./
COPY --chown=nextjs:nodejs ecosystem.config.js ./
COPY --chown=nextjs:nodejs loadtest ./
COPY --chown=nextjs:nodejs test ./

RUN npm install
RUN npm run build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
ENV API_BASE_URL=$API_BASE_URL

ARG APP_PORT=2567
ENV APP_PORT=$APP_PORT
ENV NODE_DEBUG=http
EXPOSE $APP_PORT

CMD ["npm", "run", "launch:d"]
