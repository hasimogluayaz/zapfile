FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
# LibreOffice without GUI, Node to run the API, and fonts that cover Office documents
# (Carlito/Caladea are metric-compatible with Calibri/Cambria, Liberation with Arial/Times/Courier).
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libreoffice-writer-nogui libreoffice-calc-nogui libreoffice-impress-nogui \
      nodejs ca-certificates \
      fonts-dejavu fonts-liberation fonts-liberation2 fonts-crosextra-carlito fonts-crosextra-caladea \
      fonts-noto-core fonts-noto-cjk fonts-noto-color-emoji \
 && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --uid 10001 office
WORKDIR /app
COPY server.mjs .
USER office
ENV PORT=8080 WORK_DIR=/tmp/zapfile-office
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
