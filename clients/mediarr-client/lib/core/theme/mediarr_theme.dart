import 'package:flutter/material.dart';

/// Mediarr "Modern Dark" design tokens — matches the web app's CSS variables.
class MediarrColors {
  MediarrColors._();

  // Surface colors (--surface-*)
  static const Color surfaceBase = Color(0xFF0a0a0f);
  static const Color surfaceCard = Color(0xFF12121a);
  static const Color surfaceElevated = Color(0xFF1a1a25);
  static const Color surfaceHover = Color(0xFF22222f);

  // Accent colors (--accent-*)
  static const Color accentPrimary = Color(0xFF6366f1); // indigo
  static const Color accentSecondary = Color(0xFF8b5cf6); // violet
  static const Color accentTertiary = Color(0xFF06b6d4); // cyan

  // Text colors (--text-*)
  static const Color textPrimary = Color(0xFFf1f5f9);
  static const Color textSecondary = Color(0xFF94a3b8);
  static const Color textMuted = Color(0xFF64748b);

  // Status colors (--status-*)
  static const Color statusSuccess = Color(0xFF22c55e);
  static const Color statusWarning = Color(0xFFf59e0b);
  static const Color statusError = Color(0xFFef4444);
  static const Color statusInfo = Color(0xFF3b82f6);

  // Border
  static const Color borderSubtle = Color(0xFF1e293b);

  // Focus ring for D-pad navigation
  static const Color focusRing = Color(0xFF6366f1);
}

/// The canonical dark theme for the Mediarr client.
final ThemeData mediarrDarkTheme = ThemeData(
  brightness: Brightness.dark,
  useMaterial3: true,

  // Scaffold & surface
  scaffoldBackgroundColor: MediarrColors.surfaceBase,

  colorScheme: const ColorScheme.dark(
    surface: MediarrColors.surfaceBase,
    primary: MediarrColors.accentPrimary,
    secondary: MediarrColors.accentSecondary,
    tertiary: MediarrColors.accentTertiary,
    error: MediarrColors.statusError,
    onSurface: MediarrColors.textPrimary,
    onPrimary: MediarrColors.textPrimary,
    onSecondary: MediarrColors.textPrimary,
    outline: MediarrColors.borderSubtle,
    surfaceContainerHighest: MediarrColors.surfaceElevated,
  ),

  // Card
  cardTheme: const CardThemeData(
    color: MediarrColors.surfaceCard,
    elevation: 0,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.all(Radius.circular(12)),
      side: BorderSide(color: MediarrColors.borderSubtle),
    ),
  ),

  // AppBar
  appBarTheme: const AppBarTheme(
    backgroundColor: MediarrColors.surfaceBase,
    foregroundColor: MediarrColors.textPrimary,
    elevation: 0,
  ),

  // Text
  textTheme: const TextTheme(
    headlineLarge: TextStyle(
      color: MediarrColors.textPrimary,
      fontSize: 32,
      fontWeight: FontWeight.bold,
    ),
    headlineMedium: TextStyle(
      color: MediarrColors.textPrimary,
      fontSize: 24,
      fontWeight: FontWeight.w600,
    ),
    titleLarge: TextStyle(
      color: MediarrColors.textPrimary,
      fontSize: 20,
      fontWeight: FontWeight.w600,
    ),
    titleMedium: TextStyle(
      color: MediarrColors.textPrimary,
      fontSize: 16,
      fontWeight: FontWeight.w500,
    ),
    bodyLarge: TextStyle(
      color: MediarrColors.textPrimary,
      fontSize: 16,
    ),
    bodyMedium: TextStyle(
      color: MediarrColors.textSecondary,
      fontSize: 14,
    ),
    bodySmall: TextStyle(
      color: MediarrColors.textMuted,
      fontSize: 12,
    ),
  ),

  // Navigation rail (sidebar)
  navigationRailTheme: const NavigationRailThemeData(
    backgroundColor: MediarrColors.surfaceCard,
    selectedIconTheme: IconThemeData(color: MediarrColors.accentPrimary),
    unselectedIconTheme: IconThemeData(color: MediarrColors.textSecondary),
    // Label styles applied via selectedIconTheme/unselectedIconTheme
    indicatorColor: Color(0x336366f1), // accentPrimary at 20% opacity
  ),

  // Divider
  dividerTheme: const DividerThemeData(
    color: MediarrColors.borderSubtle,
    thickness: 1,
  ),

  // Icon
  iconTheme: const IconThemeData(
    color: MediarrColors.textSecondary,
  ),
);
