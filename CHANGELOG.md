# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- (Nothing yet)

### Changed

- (Nothing yet)

### Fixed

- (Nothing yet)

### Removed

- (Nothing yet)

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

[Unreleased]: https://github.com/Ranfty/meshsight/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Ranfty/meshsight/releases/tag/v0.1.0
