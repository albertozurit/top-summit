# Herramientas del pipeline (todo menos Planetiler, que se usa con su imagen oficial).
# Versiones fijadas para builds reproducibles (existencia comprobada el 2026-09-30); actualizar a propósito.
ARG GDAL_IMAGE=ghcr.io/osgeo/gdal:ubuntu-small-3.12.4

FROM ${GDAL_IMAGE} AS tippecanoe
ARG TIPPECANOE_VERSION=2.79.0
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential ca-certificates curl libsqlite3-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL "https://github.com/felt/tippecanoe/archive/refs/tags/${TIPPECANOE_VERSION}.tar.gz" | tar xz \
    && make -C "tippecanoe-${TIPPECANOE_VERSION}" -j"$(nproc)" \
    && make -C "tippecanoe-${TIPPECANOE_VERSION}" install PREFIX=/opt/tippecanoe

FROM ${GDAL_IMAGE}
ARG PMTILES_VERSION=1.28.0
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl make osmium-tool python3-yaml libsqlite3-0 \
    && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL "https://github.com/protomaps/go-pmtiles/releases/download/v${PMTILES_VERSION}/go-pmtiles_${PMTILES_VERSION}_Linux_x86_64.tar.gz" \
      | tar xz -C /usr/local/bin pmtiles
COPY --from=tippecanoe /opt/tippecanoe/bin/ /usr/local/bin/
ENV OSM_CONFIG_FILE=/work/osmconf.ini
WORKDIR /work
