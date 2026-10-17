# Nepal Glacier Inventory & Hypsometry Explorer

### 🏔️ [Check the Glaciers Here: Open the Interactive Map](https://biswashk920.github.io/nepal-glacier-explorer/)

**Where are Nepal's glaciers, how big are they, and at what elevation do they sit?**
A reproducible analysis of the Randolph Glacier Inventory (RGI) 7.0, with an interactive web map.


---

## 1. Research question

> How are glaciers in Nepal distributed by **size**, **elevation** and **aspect** (the compass direction they face)?

This is a snapshot of the glacier inventory (outlines from roughly 1992 to 2010). It describes where the ice is, not how it is changing.

## 2. Key results

| # | Finding | Evidence |
|---|---------|----------|
| 1 | Nepal has **4,480 glaciers covering 4,245 km²** (glacier centre point inside Nepal). A further 199 transboundary glaciers add 1,042 km², about 25% more. | Table 1 |
| 2 | **Small glaciers are numerous but hold little ice.** 82.6% of glaciers are under 1 km² but hold only 22.2% of the area. The median glacier is 0.23 km². Half of all ice area is held by just 172 glaciers (3.8%). | Table 1, Figure 1 |
| 3 | **Half of Nepal's glacier area lies above 5,550 m.** The 5th to 95th percentile range is 4,666 to 6,658 m, and the peak area is in the 5,400 to 5,500 m band (7.5% of all area). | Figure 2 |
| 4 | **Larger glaciers span more elevation, but do not sit higher on average.** The median elevation range grows from 327 m (<0.5 km²) to 3,143 m (>50 km²). Size correlates with terminus elevation (Spearman ρ = −0.38) and top elevation (ρ = +0.42), but not with median elevation (ρ = +0.02, not significant). | Table 2, Figure 3 |
| 5 | **Aspect shows only a weak preference.** North is the most common sector (17.0% of glaciers). North-facing sectors (NW+N+NE) hold 44.2% of glaciers and south-facing sectors (SE+S+SW) hold 34.1%. The mean direction is about 319° but the concentration is low (R = 0.11, where 0 means no preference and 1 means all identical). | Table 3, Figure 4 |
| 6 | **Aspect depends on elevation, not on size.** Aspect vs elevation tercile: Cramér's V = 0.128. Aspect vs size class: V = 0.047, not significant. Glaciers with the lowest median elevations are the most strongly north-facing (area-weighted mean 359°, R = 0.26). | Figure 5 |

## 3. Data

| Dataset | Use | Source |
|---|---|---|
| **RGI 7.0**, glacier (G) product, regions 14 (South Asia West) and 15 (South Asia East). Shapefiles plus attribute and hypsometry CSVs. | Outlines, area, elevation, aspect, area-elevation distribution | NSIDC-0770, https://doi.org/10.5067/f6jmovy5navz |
| **geoBoundaries** Nepal ADM0 | Country boundary used to select glaciers | https://www.geoboundaries.org (add exact version and licence from your download page) |

No DEM was needed. RGI 7.0 ships a per-glacier area-elevation table (the `-hypsometry.csv` files) in 50 m elevation bins.

**Citation (RGI 7.0):**
RGI 7.0 Consortium, 2023. *Randolph Glacier Inventory - A Dataset of Global Glacier Outlines, Version 7.0.* Boulder, Colorado USA. NSIDC: National Snow and Ice Data Center. doi:10.5067/f6jmovy5navz

## 4. Methods

1. **Load and QA** (`01_data_qa`). Regions 14 and 15 were loaded and merged (56,149 glaciers). Checks covered CRS (EPSG:4326), duplicate IDs, invalid or empty geometries, nulls, impossible values (negative areas or elevations, min > max), and the date and DEM source of each outline. The only column with nulls was the glacier name.
2. **Selecting Nepal's glaciers.** A glacier belongs to Nepal if its RGI centre point (`cenlon`, `cenlat`, a point inside the outline) falls inside the Nepal boundary. Glaciers that overlap Nepal but have their centre point outside are flagged `transboundary` and reported separately. Whole-glacier attributes (area, median elevation) are kept intact, so outlines are never clipped. Only 10 of the 4,480 glaciers come from region 14. The rest are from region 15.
3. **Equal-area areas.** Areas were recomputed in a custom Albers equal-area projection centred on Nepal (`+proj=aea +lat_1=27 +lat_2=30 +lat_0=28.5 +lon_0=84`). They agree with the RGI `area_km2` to within 0.002%, so the RGI values are used throughout.
4. **Size classes** (`02_size_classes`). Classes in km²: <0.5, 0.5–1, 1–5, 5–10, 10–50, >50 (lower bound included). Counts, area and summary statistics per class, plus a sensitivity test using all overlapping glaciers.
5. **Hypsometry** (`03_hypsometry`). The RGI hypsometry CSV gives each glacier's area per 50 m elevation bin as per-mille (‰) of its total area (each row sums to exactly 1000). This unit is inferred, not documented in the files. It was validated by rebuilding each glacier's mean elevation from the bins, which matches the `zmean_m` attribute to within about 1 m (maximum difference 15 m). Bins were multiplied by glacier area to get km², then summed for regional curves. Area-weighted percentiles are interpolated within bins.
6. **Aspect** (`04_aspect`). `aspect_deg` was binned into eight 45° sectors (N = 337.5°–22.5°, and so on), matching the RGI `aspect_sec` code exactly. Circular means and the mean resultant length R were computed, weighted by area where stated. Dependence on size class and on elevation tercile (low, middle, high by median elevation: <5,285 m, 5,285–5,629 m, >5,629 m) was tested with chi-square tests and Cramér's V as the effect size.
7. **Web map** (`05_webmap`). Outlines were simplified to 30 m tolerance (in the equal-area projection) and exported with Folium to a single HTML file.

## 5. Results in detail

### Glacier size

**Table 1. Size classes, glaciers with centre point inside Nepal (n = 4,480, 4,245 km²)**

| Size class (km²) | Glaciers | % of glaciers | Area (km²) | % of area | Area added if transboundary glaciers are included |
|---|---:|---:|---:|---:|---:|
| < 0.5 | 3,092 | 69.0 | 513 | 12.1 | +2.2% |
| 0.5–1 | 608 | 13.6 | 427 | 10.1 | +4.5% |
| 1–5 | 640 | 14.3 | 1,325 | 31.2 | +12.0% |
| 5–10 | 69 | 1.5 | 486 | 11.4 | +32.4% |
| 10–50 | 67 | 1.5 | 1,217 | 28.7 | +43.7% |
| > 50 | 4 | 0.1 | 276 | 6.5 | +58.4% |

**Summary statistics:** mean 0.95 km², median 0.23 km², 90th percentile 1.79 km², 99th percentile 13.2 km², maximum 84.5 km². The area-weighted median glacier size is 4.2 km², meaning half of all ice is in glaciers smaller than that. The 10 largest glaciers hold 11.8% of the area.

The transboundary rule matters little for small glaciers but a lot for large ones. Two of the six glaciers over 50 km² that overlap Nepal have their centre point outside it.

![Glacier size distribution](outputs/figures/02_size_distribution.png)

*Figure 1. (a) Glacier size distribution (log scale). (b) Total area by size class, with transboundary glaciers hatched. The n labels in panel (b) count only glaciers with their centre point inside Nepal.*

### Elevation

![Regional hypsometry](outputs/figures/03_hypsometry_regional.png)

*Figure 2. (a) Glacier area per 100 m elevation band for Nepal, with the area-weighted median. (b) Distribution of each size class's own area across elevation.*

| Elevation threshold | Share of glacier area above it |
|---|---:|
| 5,000 m | 86.4% |
| 5,500 m | 53.6% |
| 6,000 m | 21.8% |
| 6,500 m | 7.1% |

Including transboundary glaciers raises the area-weighted median elevation by only 39 m (5,550 to 5,589 m), so the elevation results are not sensitive to the selection rule. Only 0.64% of the area (27 km²) lies below 4,000 m.

**Table 2. Elevation by size class (medians per glacier, in m a.s.l.)**

| Size class (km²) | Glaciers | Terminus (min) | Median elevation | Top (max) | Elevation range |
|---|---:|---:|---:|---:|---:|
| < 0.5 | 3,092 | 5,248 | 5,438 | 5,634 | 327 |
| 0.5–1 | 608 | 5,091 | 5,435 | 5,840 | 713 |
| 1–5 | 640 | 4,931 | 5,466 | 6,104 | 1,092 |
| 5–10 | 69 | 4,666 | 5,493 | 6,615 | 1,998 |
| 10–50 | 67 | 4,458 | 5,639 | 7,138 | 2,688 |
| > 50 | 4 | 4,546 | 5,817 | 7,791 | 3,143 |

Larger glaciers reach lower at the terminus and much higher at the top. Median elevation rises only for the largest classes, so across all sizes the correlation is negligible (ρ = +0.02).

![Median elevation vs size](outputs/figures/03_median_elevation_vs_size.png)

*Figure 3. (a) Median elevation against glacier area. (b) Median elevation by size class.*

### Aspect

**Table 3. Glaciers and area by aspect sector**

| Sector | Glaciers | % of glaciers | Area (km²) | % of area |
|---|---:|---:|---:|---:|
| N | 760 | 17.0 | 785 | 18.5 |
| NE | 560 | 12.5 | 407 | 9.6 |
| E | 415 | 9.3 | 410 | 9.7 |
| SE | 410 | 9.2 | 353 | 8.3 |
| S | 550 | 12.3 | 644 | 15.2 |
| SW | 569 | 12.7 | 585 | 13.8 |
| W | 554 | 12.4 | 459 | 10.8 |
| NW | 662 | 14.8 | 601 | 14.2 |

A perfectly even spread would give 12.5% per sector. Mean aspect is 319° per glacier and 301° area-weighted, with R = 0.11 and 0.10, so the preferred direction is weak.

![Aspect rose diagrams](outputs/figures/04_aspect_rose.png)

*Figure 4. Aspect of Nepal's glaciers as share of glaciers (a) and of glacier area (b). The dashed ring marks a uniform distribution (12.5%).*

![Aspect by group](outputs/figures/04_aspect_by_group.png)

*Figure 5. Share of glaciers (%) per aspect sector for each size class and elevation tercile. Colour shows the difference from the all-Nepal pattern.*

| Test | χ² | Cramér's V | Reading |
|---|---:|---:|---|
| Aspect vs size class | 40.3 (p = 0.06) | 0.047 | no meaningful relationship |
| Aspect vs elevation tercile | 147.3 (p = 2.5e-24) | 0.128 | small but clear |

The p-values are only indicative, because neighbouring glaciers are not independent. The effect sizes (V) are the numbers to rely on.

All summary tables are also saved as CSV files in `outputs/tables/`.

## 6. Limitations

- **Inventory dates vary.** Outlines date from 1992 to 2010. About 86% are from 1992 to 2002, and 1994 is the largest single year (29%). The results are a mixed-date snapshot, not a single year.
- **Outline uncertainty.** Outlines come from many analysts and images. Small glaciers and snow-covered or shaded areas are the hardest to map. Debris-covered glacier ice is generally difficult to delineate, so areas and terminus elevations of debris-covered glaciers are less certain. This analysis does not correct for it.
- **No change or mass-balance analysis.** The RGI is a snapshot and is not designed for glacier-by-glacier area change, so nothing here says whether glaciers are growing or shrinking.
- **The boundary rule matters.** Using the centre point gives 4,245 km². Counting every overlapping glacier gives 5,286 km². Results for the largest size classes are the most sensitive. The boundary file also affects which border glaciers are included, and border alignment in remote areas (including the disputed far west) is not independently checked here.
- **Hypsometry resolution.** Area-elevation data are 50 m bins stored as per-mille of glacier area. Medians rebuilt from bins can differ from the RGI `zmed_m` by up to about ±27 m. The RGI attributes remain the primary median values.
- **Elevation data source.** Elevations come from Copernicus DEM (30 m for 4,611 overlapping glaciers, 90 m for 68). DEM artefacts are possible. For example, the lowest glacier (0.6 km², terminus at 2,439 m) is far below all others and may be an outline or DEM artefact. It does not affect the percentiles.
- **Aspect is one number per glacier.** Large glaciers curve around and face several directions, and aspect for very small glaciers is noisy. Aspect patterns are descriptive and do not by themselves show causes such as solar shading.
- **Small samples.** There are only four glaciers over 50 km², so statistics for that class are fragile.
- **Statistical independence.** Chi-square and Spearman p-values assume independent samples. Glaciers share climate and slopes with their neighbours, so the p-values are overstated.
- **Web map simplification.** The map shows outlines simplified to 30 m tolerance, for file size. All reported statistics use the original geometries and attributes.

## 7. Repository structure

```
nepal-glacier-explorer/
├── data/                  # not committed; see "How to reproduce"
│   ├── raw/
│   │   ├── rgi7/          # RGI 7.0 regions 14 and 15 (unzipped)
│   │   └── boundary/      # geoBoundaries Nepal ADM0
│   └── processed/         # created by notebook 01
├── notebooks/
│   ├── 01_data_qa.ipynb
│   ├── 02_size_classes.ipynb
│   ├── 03_hypsometry.ipynb
│   ├── 04_aspect.ipynb
│   └── 05_webmap.ipynb
├── scripts/
│   └── glacier_utils.py   # shared paths, size classes, plot style
├── outputs/
│   ├── figures/           # PNG (300 dpi) and SVG
│   └── tables/            # CSV summary tables
├── docs/
│   └── index.html         # interactive map (GitHub Pages)
├── environment.yml
└── README.md
```

## 8. How to reproduce

The analysis runs on a normal laptop. These steps use Anaconda Prompt on Windows.

**1. Get the code and create the environment**

```
git clone https://github.com/biswashk920/nepal-glacier-explorer.git
cd nepal-glacier-explorer
conda env create -f environment.yml
conda activate nepal-glaciers
```

Tested with Python 3.11, GeoPandas 1.2.0, pandas 3.0.6, NumPy 2.4.6, Matplotlib 3.11.2, Folium 0.20.0, Shapely 2.2.0 and pyproj 3.7.2.

**2. Download the data** (not included in this repository)

- RGI 7.0 glacier (G) files for regions 14 and 15 from NSIDC-0770 (https://doi.org/10.5067/f6jmovy5navz). A free NASA Earthdata login is required. Unzip them so you have:
  `data/raw/rgi7/RGI2000-v7.0-G-14_south_asia_west/` and `data/raw/rgi7/RGI2000-v7.0-G-15_south_asia_east/`
- geoBoundaries Nepal ADM0 from https://www.geoboundaries.org, unzipped into:
  `data/raw/boundary/geoBoundaries-NPL-ADM0-all/`

**3. Run the notebooks in order** (VS Code or JupyterLab, kernel `nepal-glaciers`)

`01_data_qa` → `02_size_classes` → `03_hypsometry` → `04_aspect` → `05_webmap`

Notebook 01 creates the files in `data/processed/` that the later notebooks need. Notebook 05 writes `docs/index.html`.

## 9. Acknowledgements and licences

- Glacier data: RGI 7.0 Consortium (2023), see the citation above.
- Boundary: geoBoundaries (add attribution and licence text from the source page).
- Map basemaps: Esri, OpenStreetMap contributors and OpenTopoMap tiles, each with its own terms of use.
- Code: add a licence file (for example MIT) if you want others to reuse it.

## 10. Author

**Kaphle Biswash**, civil engineer (hydrology and flood risk), Nepal