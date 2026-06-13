FROM oven/bun:1.3.3

WORKDIR /app

RUN groupadd --system --gid 1001 appgroup && \
  useradd --system --uid 1001 --gid appgroup appuser

COPY dist/index.js /app/index.js

RUN chown -R appuser:appgroup /app

USER appuser

ARG GIT_COMMIT_SHA=development
ARG BUILD_TIME

ENV NODE_ENV=production
ENV PORT=3000
ENV GIT_COMMIT_SHA=$GIT_COMMIT_SHA
ENV BUILD_TIME=$BUILD_TIME

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun --eval "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["bun", "run", "/app/index.js"]
