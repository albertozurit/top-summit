# Pipeline de zonas offline. Uso típico (desde pipeline/):
#   make tools                 # construye la imagen de herramientas (una vez)
#   make spain                 # descarga el extracto de España de Geofabrik (~1,3 GB, reanudable)
#   make zone ZONE=benasque    # osm → base → overlay → dem → contours → hillshade → vector → validate
#   make manifest              # out/manifest.json con bytes y md5
#   make serve                 # servidor http con Range para probar desde el iPhone en la LAN
#   make publish TAG=zones-2026-10-01   # sube a GitHub Releases (gh CLI)
SHELL := /bin/bash
.SHELLFLAGS := -euo pipefail -c

ZONE ?= benasque
ZONES_YAML := zones.yaml
IMAGE := top-summit-pipeline
PLANETILER_IMAGE ?= ghcr.io/onthegomap/planetiler:0.9.3
PLANETILER_MEM ?= 3g
SPAIN_URL := https://download.geofabrik.de/europe/spain-latest.osm.pbf

INPUT := input
WORK := work/$(ZONE)
OUT := output

DOCKER_RUN := docker run --rm -u $$(id -u):$$(id -g) -v "$(CURDIR)":/work -w /work
TOOLS := $(DOCKER_RUN) $(IMAGE)
PY := python3 scripts

zone_field = $(shell $(PY)/zones.py $(ZONES_YAML) $(ZONE) $(1))
BBOX = $(call zone_field,bbox)
BBOX_WS = $(call zone_field,bbox-ws)
MAXZOOM = $(call zone_field,max_zoom)
RASTER = $(call zone_field,raster)

.PHONY: tools spain osm base overlay dem contours hillshade mtn25 raster vector validate zone manifest serve publish test clean

tools:
	docker build -t $(IMAGE) .

spain: $(INPUT)/spain-latest.osm.pbf
$(INPUT)/spain-latest.osm.pbf:
	mkdir -p $(INPUT)
	curl -fL -C - -o $@.part $(SPAIN_URL) && mv $@.part $@

# --- OSM ---------------------------------------------------------------------

osm: $(WORK)/zone.osm.pbf
$(WORK)/zone.osm.pbf: $(INPUT)/spain-latest.osm.pbf $(ZONES_YAML)
	mkdir -p $(WORK) $(OUT)
	$(TOOLS) osmium extract --overwrite -s complete_ways -b $(BBOX) -o $@ $<
	$(TOOLS) osmium fileinfo -g header.option.osmosis_replication_timestamp $< | cut -c1-10 > $(OUT)/$(ZONE).osmdate
	@echo "Fecha OSM: $$(cat $(OUT)/$(ZONE).osmdate)"

# --- Base OpenMapTiles (Planetiler) ------------------------------------------

base: $(WORK)/base.pmtiles
$(WORK)/base.pmtiles: $(WORK)/zone.osm.pbf
	mkdir -p work/sources
	$(DOCKER_RUN) -e JAVA_TOOL_OPTIONS=-Xmx$(PLANETILER_MEM) $(PLANETILER_IMAGE) \
	  --osm-path=/work/$< --output=/work/$@ --force \
	  --download --download-dir=/work/work/sources --tmpdir=/work/work/tmp \
	  --bounds=$(BBOX) --maxzoom=$(MAXZOOM) --languages=es,en,ca,eu,gl,fr

# --- Capas propias: rutas, caminos, PdI --------------------------------------

overlay: $(WORK)/overlay.pmtiles
$(WORK)/overlay.pmtiles: $(WORK)/zone.osm.pbf scripts/classify.py scripts/features.py osmconf.ini
	$(TOOLS) ogr2ogr -f GeoJSONSeq $(WORK)/raw-routes.geojsonl $< multilinestrings -where "route IN ('hiking','foot')"
	$(TOOLS) ogr2ogr -f GeoJSONSeq $(WORK)/raw-paths.geojsonl $< lines -where "highway IN ('path','footway','track','bridleway','steps')"
	$(TOOLS) ogr2ogr -f GeoJSONSeq $(WORK)/raw-pois.geojsonl $< points \
	  -where "natural IN ('peak','saddle','spring','cave_entrance') OR tourism IN ('alpine_hut','wilderness_hut','viewpoint') OR amenity IN ('shelter','drinking_water') OR mountain_pass='yes'"
	$(TOOLS) ogr2ogr -f GeoJSONSeq -dialect sqlite $(WORK)/raw-poi-areas.geojsonl $< \
	  -sql "SELECT name, \"name:es\", \"name:en\", natural, tourism, amenity, ele, ST_PointOnSurface(geometry) AS geometry FROM multipolygons WHERE tourism IN ('alpine_hut','wilderness_hut') OR amenity='shelter'"
	cat $(WORK)/raw-pois.geojsonl $(WORK)/raw-poi-areas.geojsonl > $(WORK)/raw-all-pois.geojsonl
	$(TOOLS) python3 scripts/features.py routes $(WORK)/raw-routes.geojsonl $(WORK)/ts_routes.geojsonl
	$(TOOLS) python3 scripts/features.py paths $(WORK)/raw-paths.geojsonl $(WORK)/ts_paths.geojsonl
	$(TOOLS) python3 scripts/features.py pois $(WORK)/raw-all-pois.geojsonl $(WORK)/ts_pois.geojsonl
	$(TOOLS) tippecanoe -o $@ --force -Z8 -z$(MAXZOOM) --no-tile-size-limit --no-feature-limit \
	  --no-line-simplification -r1 \
	  -L ts_routes:$(WORK)/ts_routes.geojsonl -L ts_paths:$(WORK)/ts_paths.geojsonl -L ts_pois:$(WORK)/ts_pois.geojsonl

# --- Relieve -------------------------------------------------------------------

dem: $(WORK)/dem.tif
$(WORK)/dem.tif: $(ZONES_YAML)
	mkdir -p $(INPUT)/dem/$(ZONE) $(WORK)
	if [ "$(call zone_field,dem)" = "copernicus-glo30" ]; then \
	  for url in $$($(PY)/dem.py $(BBOX_WS)); do \
	    f="$(INPUT)/dem/$(ZONE)/$$(basename $$url)"; \
	    [ -s "$$f" ] || curl -fsSL -o "$$f" "$$url" || echo "sin tesela (mar?): $$url"; \
	  done; \
	fi
	ls $(INPUT)/dem/$(ZONE)/*.tif > /dev/null  # MDT del CNIG: dejar los GeoTIFF aquí a mano
	$(TOOLS) gdalbuildvrt -overwrite $(WORK)/dem.vrt $(INPUT)/dem/$(ZONE)/*.tif
	$(TOOLS) gdalwarp -overwrite -t_srs EPSG:4326 -te $(BBOX_WS) -r bilinear -co COMPRESS=DEFLATE $(WORK)/dem.vrt $@

contours: $(WORK)/contours.pmtiles
$(WORK)/contours.pmtiles: $(WORK)/dem.tif scripts/features.py
	$(TOOLS) gdal_contour -overwrite -a ele -i 10 -f GeoJSONSeq $< $(WORK)/raw-contours.geojsonl
	$(TOOLS) python3 scripts/features.py contours $(WORK)/raw-contours.geojsonl $(WORK)/ts_contours.geojsonl
	$(TOOLS) tippecanoe -o $@ --force -Z10 -z$(MAXZOOM) --no-tile-size-limit --no-feature-limit \
	  --simplification=4 -L ts_contours:$(WORK)/ts_contours.geojsonl

hillshade: $(OUT)/$(ZONE)-hillshade.pmtiles
$(OUT)/$(ZONE)-hillshade.pmtiles: $(WORK)/dem.tif
	$(TOOLS) gdalwarp -overwrite -t_srs EPSG:3857 -r bilinear $< $(WORK)/dem3857.tif
	# En EPSG:3857 las distancias horizontales se estiran 1/cos(lat): se compensa con -z.
	zf=$$(python3 -c "import math,sys; s,n=float(sys.argv[1]),float(sys.argv[2]); print(1/math.cos(math.radians((s+n)/2)))" $$(echo $(BBOX_WS) | cut -d' ' -f2,4)); \
	$(TOOLS) gdaldem hillshade -multidirectional -compute_edges -z $$zf $(WORK)/dem3857.tif $(WORK)/hillshade.tif
	rm -f $(WORK)/hillshade.mbtiles
	$(TOOLS) gdal_translate -of MBTiles -co TILE_FORMAT=JPEG -co QUALITY=70 -co ZOOM_LEVEL_STRATEGY=UPPER $(WORK)/hillshade.tif $(WORK)/hillshade.mbtiles
	$(TOOLS) gdaladdo -r average $(WORK)/hillshade.mbtiles 2 4 8 16 32 64
	$(TOOLS) pmtiles convert --force $(WORK)/hillshade.mbtiles $@

# Opción B del spike S3: hojas MTN25 del CNIG descargadas a mano en input/mtn25/<zona>/.
mtn25: $(OUT)/$(ZONE)-mtn25.pmtiles
$(OUT)/$(ZONE)-mtn25.pmtiles:
	ls $(INPUT)/mtn25/$(ZONE)/*.tif > /dev/null
	$(TOOLS) gdalbuildvrt -overwrite $(WORK)/mtn25.vrt $(INPUT)/mtn25/$(ZONE)/*.tif
	$(TOOLS) gdalwarp -overwrite -t_srs EPSG:3857 -te_srs EPSG:4326 -te $(BBOX_WS) -r bilinear $(WORK)/mtn25.vrt $(WORK)/mtn25-3857.tif
	rm -f $(WORK)/mtn25.mbtiles
	$(TOOLS) gdal_translate -of MBTiles -co TILE_FORMAT=JPEG -co QUALITY=80 -co ZOOM_LEVEL_STRATEGY=UPPER $(WORK)/mtn25-3857.tif $(WORK)/mtn25.mbtiles
	$(TOOLS) gdaladdo -r average $(WORK)/mtn25.mbtiles 2 4 8 16 32
	$(TOOLS) pmtiles convert --force $(WORK)/mtn25.mbtiles $@

# El ráster publicado depende de `raster` en zones.yaml (hillshade | mtn25 | none).
raster:
	case "$(RASTER)" in \
	  hillshade) $(MAKE) hillshade ZONE=$(ZONE) && cp $(OUT)/$(ZONE)-hillshade.pmtiles $(OUT)/$(ZONE)-raster.pmtiles ;; \
	  mtn25) $(MAKE) mtn25 ZONE=$(ZONE) && cp $(OUT)/$(ZONE)-mtn25.pmtiles $(OUT)/$(ZONE)-raster.pmtiles ;; \
	  none) rm -f $(OUT)/$(ZONE)-raster.pmtiles ;; \
	esac

# --- Ensamblado y comprobaciones ----------------------------------------------

vector: $(OUT)/$(ZONE)-vector.pmtiles
$(OUT)/$(ZONE)-vector.pmtiles: $(WORK)/base.pmtiles $(WORK)/overlay.pmtiles $(WORK)/contours.pmtiles
	# [VERIFICAR] tile-join lee y escribe PMTiles directamente (tippecanoe >= 2.17).
	$(TOOLS) tile-join -o $@ --force --no-tile-size-limit $^

validate:
	$(PY)/validate_zone.py $(ZONES_YAML) $(ZONE) $(OUT)

zone: osm base overlay contours vector raster validate
	@ls -la $(OUT)/$(ZONE)-*.pmtiles

manifest:
	$(PY)/manifest.py $(ZONES_YAML) $(OUT) $(if $(BASE_URL),--base-url $(BASE_URL),)

serve:
	$(PY)/serve.py $(OUT) 8080

publish: manifest
	test -n "$(TAG)"
	gh release view $(TAG) > /dev/null 2>&1 || gh release create $(TAG) --title "$(TAG)" --notes "Zonas offline generadas por pipeline/ (ver manifest.json)"
	gh release upload $(TAG) --clobber $(OUT)/manifest.json $(OUT)/*-vector.pmtiles $(OUT)/*-raster.pmtiles

test:
	python3 -m pytest tests -q

clean:
	rm -rf work/$(ZONE) $(OUT)/$(ZONE)-*
