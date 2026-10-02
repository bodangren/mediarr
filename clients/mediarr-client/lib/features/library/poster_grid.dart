import 'package:flutter/material.dart';

/// Browse grid density contract for the TV (FR-1).
///
/// Measured on the target device on 2026-10-03: 1920x1080 physical at density
/// 240 gives a device pixel ratio of 1.5, so the app viewport is **1280x720
/// logical px**. The rail is 160 logical px wide, leaving **1119** logical px
/// for content.
///
/// Before this contract the grid used
/// `SliverGridDelegateWithMaxCrossAxisExtent(maxCrossAxisExtent: 280)`, which
/// resolved to **4 posters of 250x431 logical px in a 1119x407 viewport**: one
/// visible row, clipped at the bottom, roughly 4 titles per screen.
///
/// The constants below are the single source of truth for browse density, so
/// Movies, Series, See All, Search, and Collections cannot drift apart again.
/// They are asserted against the real screens in
/// `test/features/library/poster_grid_density_test.dart`.

/// Poster columns across the TV browse viewport.
const int kTvPosterColumns = 6;

/// One poster tile at the TV viewport, in logical px (248x427 physical).
///
/// The grid cross-axis extent there is **1071** logical px: 1280 viewport
/// minus the 160 rail, minus the 1 px rail divider, minus the 24 px padding on
/// each side of the grid. Six columns of 165 plus five 16 px gaps fill it
/// exactly (6 x 165 + 5 x 16 = 1070).
const double kTvPosterTileWidth = 165;
const double kTvPosterTileHeight = 285;

/// Complete poster rows that must be visible at the TV viewport without
/// scrolling. Two rows of six is the twelve titles the owner asked for.
const int kTvPosterVisibleRows = 2;

/// Gap between poster tiles, in logical px.
const double kPosterGridSpacing = 16;

/// Tile width divided by tile height. Posters are 2:3, so the value is below 1.
const double kPosterTileAspectRatio = 0.58;

/// Column count for a grid [crossAxisExtent] in logical px.
///
/// Derived from the available width so non-TV form factors (the Linux and
/// macOS desktop windows) stay usable, while the TV viewport resolves exactly
/// to [kTvPosterColumns]. Clamped to 2..10 so a degenerate or very narrow
/// extent can never produce an unusable grid.
int posterColumnCountFor(double crossAxisExtent) {
  if (crossAxisExtent <= 0) return kTvPosterColumns;
  final columns = ((crossAxisExtent + kPosterGridSpacing) /
          (kTvPosterTileWidth + kPosterGridSpacing))
      .floor();
  return columns.clamp(2, 10);
}

/// The grid delegate for a poster grid [crossAxisExtent] wide.
///
/// Uses [posterColumnCountFor] so tile width stays close to
/// [kTvPosterTileWidth] at any viewport size.
SliverGridDelegate posterGridDelegateFor(double crossAxisExtent) {
  return SliverGridDelegateWithFixedCrossAxisCount(
    crossAxisCount: posterColumnCountFor(crossAxisExtent),
    childAspectRatio: kPosterTileAspectRatio,
    crossAxisSpacing: kPosterGridSpacing,
    mainAxisSpacing: kPosterGridSpacing,
  );
}