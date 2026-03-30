## [0.3.1](https://github.com/Ranfty/meshsight/compare/v0.3.0...v0.3.1) (2026-03-30)


### Bug Fixes

* Use correct title ([482e0fa](https://github.com/Ranfty/meshsight/commit/482e0fa7e7740509883af6c87dcc1482e252836d))

# [0.3.0](https://github.com/Ranfty/meshsight/compare/v0.2.1...v0.3.0) (2026-03-30)


### Bug Fixes

* Do not auto navigate after config change ([78f4228](https://github.com/Ranfty/meshsight/commit/78f4228fb45b22c48cb155ea92bcaf477b5b4da3))


### Features

* Add sidebar footer with repo link ([571bc34](https://github.com/Ranfty/meshsight/commit/571bc346a6fb75ae1a6f44790240ab6acabbb52a))

## [0.2.1](https://github.com/Ranfty/meshsight/compare/v0.2.0...v0.2.1) (2026-03-30)


### Bug Fixes

* Correct favicon and icon paths ([38289af](https://github.com/Ranfty/meshsight/commit/38289afdc3ca71e8cd3500b5ea36090ff2238ae2))

# [0.2.0](https://github.com/Ranfty/meshsight/compare/v0.1.1...v0.2.0) (2026-03-30)


### Bug Fixes

* apply min height to sidebar ([2ed8a71](https://github.com/Ranfty/meshsight/commit/2ed8a71a698dca4329b1edb3bb1e38b1b4a5c778))


### Features

* favicon and header icon ([4577708](https://github.com/Ranfty/meshsight/commit/4577708f1801a40e7089b0515993cbf428c691f8))

## [0.1.1](https://github.com/Ranfty/meshsight/compare/v0.1.0...v0.1.1) (2026-03-30)


### Bug Fixes

* human readable distance in link chart ([f86ffe2](https://github.com/Ranfty/meshsight/commit/f86ffe27aba688a112419408c0c0825216aae156))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-03-30

### Added

- Initial release: pure client-side RF coverage planning for Meshtastic LoRa networks
- Coverage heatmap visualization with signal strength ramping
- Line-of-sight (LOS) analysis with Fresnel zone clearance checking
- Link budget calculator with viable / marginal / not-viable classification
- Elevation profile chart showing terrain and Fresnel zones
- 9 built-in LoRa modem presets (SHORT_TURBO to VERY_LONG_SLOW)
- Multi-region support (EU 868 MHz, US 915 MHz, ANZ 915 MHz)
- Per-node configuration (antenna height, TX power, antenna gain, device role)
- Terrain-aware RF simulation:
  - Free-space path loss (FSPL)
  - Knife-edge diffraction (Fresnel-Kirchhoff v-parameter)
  - Earth curvature correction (k-factor 4/3)
- Elevation data fetching from AWS Terrarium tiles (SRTM3, ~90 m resolution)
- IndexedDB caching for elevation tiles and coverage results
- Persistent state via localStorage (nodes, config, map view)
- Web Worker for non-blocking coverage calculations
- Responsive UI: collapsible sidebar on desktop, sheet modal on mobile
- Dark theme inspired by RF engineering tools
- Map controls: Place Node toggle, Link Analysis toggle, Coverage visibility
- Node dragging, deletion, naming, and colour assignment
- LoRa config panel with presets, regions, and bandwidth/SF/CR selection
- GitHub Pages deployment via GitHub Actions
- Comprehensive engine unit tests
- TypeScript strict mode throughout
