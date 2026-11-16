# MinIO (AGPL-3.0) built unmodified from its official tagged source, using upstream's Makefile flags.
# Upstream stopped publishing community images (Docker Hub/Quay) and binaries (dl.min.io),
# so a fresh deployment server cannot pull the release pinned in compose.dev.yml.
# .github/workflows/deploy.yml builds this per release tag and pushes it to the project's Docker Hub.
FROM golang:1.24-alpine AS build
ARG MINIO_RELEASE=RELEASE.2025-04-22T22-12-26Z
RUN apk add --no-cache git
RUN git clone --depth 1 --branch "${MINIO_RELEASE}" https://github.com/minio/minio.git /src
WORKDIR /src
RUN CGO_ENABLED=0 go build -tags kqueue -trimpath -ldflags "$(go run buildscripts/gen-ldflags.go)" -o /out/minio . \
 && cp LICENSE CREDITS /out/

FROM alpine:3.21
ARG MINIO_RELEASE=RELEASE.2025-04-22T22-12-26Z
LABEL org.opencontainers.image.title="MinIO" \
      org.opencontainers.image.version="${MINIO_RELEASE}" \
      org.opencontainers.image.source="https://github.com/minio/minio" \
      org.opencontainers.image.licenses="AGPL-3.0-only"
RUN apk add --no-cache ca-certificates curl
COPY --from=build /out/minio /usr/bin/minio
COPY --from=build /out/LICENSE /out/CREDITS /licenses/
EXPOSE 9000
VOLUME ["/data"]
ENTRYPOINT ["/usr/bin/minio"]
CMD ["server", "/data"]
