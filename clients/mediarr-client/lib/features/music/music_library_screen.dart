import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/widgets/netflix_scaffold.dart';
import '../../core/widgets/tv_context_menu.dart';
import '../../shared/models/music.dart';
import '../../shared/services/api_client.dart';
import 'music_player_service.dart';
import 'music_resume_store.dart';

enum _MusicSection { artists, albums, recently, songs }

/// iTunes-style Music shell for the TV (track feature_music_library_20261107, Phase 4).
///
/// Persistent sidebar (Artists / Albums / Songs), album grid, track list and a now-playing bar. All
/// rows use the shared FocusableAction so the D-pad ring, traversal and Select handling match the rest
/// of the client.
class MusicLibraryScreen extends ConsumerStatefulWidget {
  const MusicLibraryScreen({super.key});

  @override
  ConsumerState<MusicLibraryScreen> createState() => _MusicLibraryScreenState();
}

class _MusicLibraryScreenState extends ConsumerState<MusicLibraryScreen> {
  _MusicSection _section = _MusicSection.artists;
  List<MusicArtist> _artists = const [];
  List<MusicAlbum> _albums = const [];
  List<MusicTrack> _songs = const [];
  MusicAlbumDetail? _albumDetail;
  MusicArtist? _artistFilter;
  bool _loading = false;
  String? _error;
  Timer? _searchDebounce;
  String _songsQuery = '';
  int _songsTotal = 0;
  /// Explicit handoff into the content pane: autofocus alone does not move focus away from the
  /// in-screen sidebar when a section loads, which stranded the D-pad on the sidebar.
  final FocusNode _contentFirstNode = FocusNode(debugLabel: 'music-content-first');

  @override
  void dispose() {
    _resumeFocusNode.dispose();
    _searchDebounce?.cancel();
    _contentFirstNode.dispose();
    super.dispose();
  }

  void _focusContentAfterBuild() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      // The resume banner is the cheapest path to sound (one Select), so it owns the
      // first focus whenever it is on screen; the grid's first card only gets it when
      // there is nothing to resume. Previously this helper always pulled focus into the
      // grid, which is why the banner stayed unreachable (measured on APK 131-134).
      if (_resume != null) {
        _resumeFocusNode.requestFocus();
        return;
      }
      if (_contentFirstNode.context != null) {
        _contentFirstNode.requestFocus();
      }
    });
  }

  MusicResumeSnapshot? _resume;
  final FocusNode _resumeFocusNode = FocusNode(debugLabel: 'MusicLibrary.resumeBanner');
  /// True once the resume check has finished, so the banner (when present) is the first
  /// focusable widget built. Without this gate the artist grid mounted first and kept
  /// focus, leaving the one-press resume unreachable without arrows (APK 131/132).
  bool _resumeChecked = false;
  bool _bannerFocusRequested = false;

  @override
  void initState() {
    super.initState();
    unawaited(_loadResume());
    _loadArtists();
  }

  Future<void> _loadArtists() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final artists = await ref.read(apiClientProvider.notifier).getMusicArtists();
      if (!mounted) return;
      // An artist with no tracks renders as "Unknown Artist · 0 songs" and reads as a
      // broken row (device, 2026-11-21). The server may still hold the row after a
      // re-tag; the grid simply does not show empty artists.
      setState(() => _artists = artists.where((artist) => artist.trackCount > 0).toList());
      _focusContentAfterBuild();
    } catch (error) {
      if (mounted) setState(() => _error = 'Could not load artists: $error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openArtist(MusicArtist artist) async {
    setState(() {
      _loading = true;
      _artistFilter = artist;
      _albumDetail = null;
    });
    try {
      final albums = await ref.read(apiClientProvider.notifier).getMusicAlbums(artistId: artist.id);
      if (!mounted) return;
      setState(() {
        _albums = albums;
        _section = _MusicSection.albums;
      });
      _focusContentAfterBuild();
    } catch (error) {
      if (mounted) setState(() => _error = 'Could not load albums: $error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openAlbum(MusicAlbum album) async {
    setState(() => _loading = true);
    try {
      final detail = await ref.read(apiClientProvider.notifier).getMusicAlbum(album.id);
      if (!mounted) return;
      setState(() {
        _albumDetail = detail;
        _section = _MusicSection.albums;
      });
      _focusContentAfterBuild();
    } catch (error) {
      if (mounted) setState(() => _error = 'Could not load album: $error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadSongs({String query = ''}) async {
    setState(() {
      _loading = true;
      _albumDetail = null;
      _artistFilter = null;
      _songsQuery = query;
      _error = null;
    });
    try {
      final page = await ref.read(apiClientProvider.notifier).getMusicTrackPage(
            query: query,
            limit: 200,
          );
      if (!mounted) return;
      setState(() {
        _songs = page.items;
        _songsTotal = page.total;
      });
      _focusContentAfterBuild();
    } catch (error) {
      if (mounted) setState(() => _error = 'Could not load songs: $error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onSearchChanged(String value) {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 300), () {
      if (mounted) unawaited(_loadSongs(query: value.trim()));
    });
  }

  /// Play all / Shuffle all must cover the whole query, not just the visible page.
  Future<void> _playAllSongs({required bool shuffle}) async {
    try {
      final page = await ref.read(apiClientProvider.notifier).getMusicTrackPage(
            query: _songsQuery,
            limit: 500,
          );
      if (page.items.isEmpty) return;
      await _play(page.items, 0, shuffle: shuffle);
    } catch (error) {
      if (mounted) setState(() => _error = 'Could not start playback: $error');
    }
  }

  Future<void> _loadRecentAlbums() async {
    setState(() {
      _loading = true;
      _artistFilter = null;
      _albumDetail = null;
    });
    try {
      final albums = await ref.read(apiClientProvider.notifier).getMusicAlbums(recent: true);
      if (!mounted) return;
      setState(() => _albums = albums);
      _focusContentAfterBuild();
    } catch (error) {
      if (mounted) setState(() => _error = 'Could not load recent albums: $error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadAllAlbums() async {
    setState(() {
      _loading = true;
      _artistFilter = null;
      _albumDetail = null;
    });
    try {
      final albums = await ref.read(apiClientProvider.notifier).getMusicAlbums();
      if (!mounted) return;
      setState(() => _albums = albums);
      _focusContentAfterBuild();
    } catch (error) {
      if (mounted) setState(() => _error = 'Could not load albums: $error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showSection(_MusicSection section) {
    setState(() {
      _section = section;
      _albumDetail = null;
      _artistFilter = null;
    });
    if (section == _MusicSection.albums) unawaited(_loadAllAlbums());
    if (section == _MusicSection.recently) unawaited(_loadRecentAlbums());
    if (section == _MusicSection.songs) unawaited(_loadSongs());
  }

  Future<void> _play(List<MusicTrack> tracks, int index, {bool shuffle = false}) async {
    final api = ref.read(apiClientProvider.notifier);
    await ref.read(musicPlayerProvider.notifier).playQueue(
          tracks: tracks,
          index: index,
          urlFor: api.musicStreamUrl,
          shuffle: shuffle,
        );
  }

  void _openAlbumMenu(MusicAlbum album) {
    showTvContextMenu(context, title: album.title, actions: [
      TvContextAction(
        label: 'Play album',
        onSelected: () async {
          final detail = await ref.read(apiClientProvider.notifier).getMusicAlbum(album.id);
          if (detail.tracks.isNotEmpty) {
            await _play(detail.tracks, 0);
          }
        },
      ),
      TvContextAction(label: 'Open album', onSelected: () => _openAlbum(album)),
    ]);
  }

  void _openTrackMenu(MusicTrack track, List<MusicTrack> queue, int index) {
    final api = ref.read(apiClientProvider.notifier);
    showTvContextMenu(context, title: track.title, actions: [
      TvContextAction(label: 'Play now', onSelected: () => _play(queue, index)),
      TvContextAction(
        label: 'Play next',
        onSelected: () => ref.read(musicPlayerProvider.notifier).insertNext(
              track: track,
              urlFor: api.musicStreamUrl,
            ),
      ),
      TvContextAction(label: 'Go to album', onSelected: () => _openAlbum(
            MusicAlbum(
              id: track.albumId,
              artistId: track.artistId,
              title: 'Album',
            ),
          )),
    ]);
  }

  Future<void> _loadResume() async {
    // A resume-store failure (or a platform without shared preferences, like widget
    // tests) must never block the library from loading.
    MusicResumeSnapshot? snapshot;
    try {
      snapshot = await ref.read(musicResumeStoreProvider).load();
    } catch (_) {
      snapshot = null;
    }
    if (!mounted) return;
    setState(() {
      _resume = snapshot?.current == null ? null : snapshot;
      _resumeChecked = true;
    });
    if (_resume != null && !_bannerFocusRequested) {
      _bannerFocusRequested = true;
      _focusContentAfterBuild();
    }
  }

  Future<void> _resumePlayback() async {
    final snapshot = _resume;
    if (snapshot == null) return;
    final api = ref.read(apiClientProvider.notifier);
    await ref.read(musicPlayerProvider.notifier).restoreSnapshot(snapshot, urlFor: api.musicStreamUrl);
    if (mounted) setState(() => _resume = null);
  }

  Widget _resumeBanner() {
    final snapshot = _resume!;
    final track = snapshot.current!;
    final minutes = snapshot.position.inMinutes;
    final seconds = snapshot.position.inSeconds % 60;
    final at = '$minutes:${seconds.toString().padLeft(2, '0')}';
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
      child: FocusableAction(
        onSelect: _resumePlayback,
        variant: FocusableActionVariant.button,
        borderRadius: 12,
        // The banner is the cheapest path to sound (one press). Focus it first so
        // "Continue listening" is the default action after arriving on Music.
        autofocus: true,
        focusNode: _resumeFocusNode,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0x332563EB),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0x665B8DEF)),
          ),
          child: Row(
            children: [
              const Icon(Icons.play_circle_outline, color: Color(0xFF93C5FD), size: 26),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Continue listening · ${track.title} — at $at',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final playback = ref.watch(musicPlayerProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 12),
              child: Row(
                children: [
                  const Text('Music',
                      style: TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w700)),
                  const SizedBox(width: 16),
                  Text('${_artists.length} artists',
                      style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 16)),
                ],
              ),
            ),
            if (playback.current == null && _resume != null && _resume!.current != null)
              _resumeBanner(),
            // Sections are a header chip row, not a nested sidebar: with the sidebar the
            // D-pad needed two Lefts to leave the content pane (content -> sidebar -> rail),
            // and every other TV screen is one. Chips keep the grammar consistent with the
            // Adult screen and free the whole width for the grid.
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 8),
              child: _SectionChips(section: _section, onSelect: _showSection),
            ),
            Expanded(child: _buildContent(playback)),
            if (playback.current != null) _NowPlayingBar(playback: playback),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(MusicPlaybackState playback) {
    if (_error != null) {
      return Padding(
        padding: const EdgeInsets.all(24),
        child: Text(_error!, style: const TextStyle(color: Color(0xFFF87171), fontSize: 16)),
      );
    }
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF8B5CF6)));
    }
    switch (_section) {
      case _MusicSection.artists:
        return _artistGrid();
      case _MusicSection.albums:
      case _MusicSection.recently:
        return _albumDetail != null ? _albumTrackList(_albumDetail!) : _albumGrid();
      case _MusicSection.songs:
        return _songList();
    }
  }

  Widget _artistGrid() {
    if (_artists.isEmpty) {
      return const Center(child: Text('No artists yet', style: TextStyle(color: Color(0xFF9CA3AF))));
    }
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 300,
        mainAxisExtent: 116,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
      ),
      itemCount: _artists.length,
      itemBuilder: (context, index) {
        final artist = _artists[index];
        return FocusableAction(
          variant: FocusableActionVariant.button,
          // The resume banner owns first focus when it is shown.
          autofocus: _resumeChecked && _resume == null && index == 0,
          focusNode: index == 0 ? _contentFirstNode : null,
          onSelect: () => _openArtist(artist),
          child: _Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(artist.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text('${artist.albumCount} ${artist.albumCount == 1 ? 'album' : 'albums'} · ${artist.trackCount} ${artist.trackCount == 1 ? 'song' : 'songs'}',
                    style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 14)),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _albumGrid() {
    if (_albums.isEmpty) {
      return Center(
        child: Text(_artistFilter == null ? 'No albums yet' : 'No albums for ${_artistFilter!.name}',
            style: const TextStyle(color: Color(0xFF9CA3AF))),
      );
    }
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 260,
        // Square artwork + title + meta line; 300 clipped the last line by 1px in the widget test.
        mainAxisExtent: 340,
        mainAxisSpacing: 16,
        crossAxisSpacing: 16,
      ),
      itemCount: _albums.length,
      itemBuilder: (context, index) {
        final album = _albums[index];
        return FocusableAction(
          variant: FocusableActionVariant.poster,
          autofocus: index == 0,
          focusNode: index == 0 ? _contentFirstNode : null,
          onSelect: () => _openAlbum(album),
          onContextMenu: () => _openAlbumMenu(album),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    ref.read(apiClientProvider.notifier).musicArtworkUrl(album.id),
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const ColoredBox(
                      color: Color(0xFF111827),
                      child: Center(
                        child: Icon(Icons.album, color: Color(0xFF4B5563), size: 48),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(album.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w600)),
              Text('${_songsLabel(album.trackCount)}${album.year == null ? '' : ' · ${album.year}'}',
                  style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 14)),
            ],
          ),
        );
      },
    );
  }

  static String _songsLabel(int count) => count == 1 ? '1 song' : '$count songs';

  Widget _albumTrackList(MusicAlbumDetail detail) {
    final tracks = detail.tracks;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: Row(
            children: [
              Expanded(
                child: Text('${detail.album.title} · ${_songsLabel(tracks.length)}',
                    style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w600)),
              ),
              if (tracks.isNotEmpty)
                FocusableAction(
                  variant: FocusableActionVariant.button,
                  autofocus: true,
                  focusNode: _contentFirstNode,
                  onSelect: () => _play(tracks, 0),
                  child: _Card(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                    child: const Row(children: [
                      Icon(Icons.play_arrow, color: Colors.white, size: 24),
                      SizedBox(width: 8),
                      Text('Play album', style: TextStyle(color: Colors.white, fontSize: 16)),
                    ]),
                  ),
                ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: tracks.length,
            itemBuilder: (context, index) => _TrackRow(
              track: tracks[index],
              onSelect: () => _play(tracks, index),
              onContextMenu: () => _openTrackMenu(tracks[index], tracks, index),
            ),
          ),
        ),
      ],
    );
  }

  Widget _songList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  _songsQuery.isEmpty
                      ? 'Songs · ${_songs.length} of $_songsTotal'
                      : 'Results for “$_songsQuery” · ${_songs.length}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w600),
                ),
              ),
              FocusableAction(
                variant: FocusableActionVariant.button,
                onSelect: () => unawaited(_playAllSongs(shuffle: false)),
                child: _Card(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  child: const Row(children: [
                    Icon(Icons.play_arrow, color: Colors.white, size: 24),
                    SizedBox(width: 6),
                    Text('Play all', style: TextStyle(color: Colors.white, fontSize: 16)),
                  ]),
                ),
              ),
              const SizedBox(width: 8),
              FocusableAction(
                variant: FocusableActionVariant.button,
                onSelect: () => unawaited(_playAllSongs(shuffle: true)),
                child: _Card(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  child: const Row(children: [
                    Icon(Icons.shuffle, color: Colors.white, size: 22),
                    SizedBox(width: 6),
                    Text('Shuffle all', style: TextStyle(color: Colors.white, fontSize: 16)),
                  ]),
                ),
              ),
              const SizedBox(width: 16),
              SizedBox(
                width: 360,
                child: TextField(
                  style: const TextStyle(color: Colors.white, fontSize: 16),
                  decoration: const InputDecoration(
                    isDense: true,
                    hintText: 'Search songs, artists, albums',
                    hintStyle: TextStyle(color: Color(0xFF6B7280)),
                    prefixIcon: Icon(Icons.search, color: Color(0xFF9CA3AF)),
                    filled: true,
                    fillColor: Color(0xFF111827),
                    border: OutlineInputBorder(),
                  ),
                  onChanged: _onSearchChanged,
                  onSubmitted: (value) => unawaited(_loadSongs(query: value.trim())),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: _songs.isEmpty
              ? Center(
                  child: Text(
                    _loading
                        ? 'Loading songs…'
                        : _songsQuery.isEmpty
                            ? 'No songs yet'
                            : 'No songs match “$_songsQuery”',
                    style: const TextStyle(color: Color(0xFF9CA3AF)),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _songs.length,
                  itemBuilder: (context, index) => _TrackRow(
                    track: _songs[index],
                    focusNode: index == 0 ? _contentFirstNode : null,
                    onSelect: () => _play(_songs, index),
                    onContextMenu: () => _openTrackMenu(_songs[index], _songs, index),
                  ),
                ),
        ),
      ],
    );
  }
}

/// Section switcher: Artists / Albums / Recently Added / Songs as one D-pad row.
///
/// Replaces the nested sidebar (2026-11-22). The sidebar sat between the content pane and
/// the rail, so leaving the content cost two Left presses while every other screen cost
/// one; the chips live above the grid and keep the same Left-from-content grammar.
class _SectionChips extends StatelessWidget {
  const _SectionChips({required this.section, required this.onSelect});

  final _MusicSection section;
  final ValueChanged<_MusicSection> onSelect;

  @override
  Widget build(BuildContext context) {
    const entries = [
      (_MusicSection.artists, 'Artists', Icons.person_outline),
      (_MusicSection.albums, 'Albums', Icons.album_outlined),
      (_MusicSection.recently, 'Recently Added', Icons.new_releases_outlined),
      (_MusicSection.songs, 'Songs', Icons.music_note_outlined),
    ];
    return SizedBox(
      height: 48,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: entries.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          final (value, label, icon) = entries[index];
          final active = section == value;
          return FocusableAction(
            variant: FocusableActionVariant.button,
            borderRadius: 20,
            onSelect: () => onSelect(value),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
              decoration: BoxDecoration(
                // Accent = focus (drawn by FocusableAction), filled = selected section.
                color: active ? const Color(0xFF2563EB) : const Color(0xFF1F2937),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: active ? const Color(0xFF60A5FA) : const Color(0xFF374151)),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(icon, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Text(label,
                    style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
              ]),
            ),
          );
        },
      ),
    );
  }
}

class _TrackRow extends StatelessWidget {
  const _TrackRow({required this.track, required this.onSelect, this.onContextMenu, this.focusNode});

  final MusicTrack track;
  final VoidCallback onSelect;
  final VoidCallback? onContextMenu;
  final FocusNode? focusNode;

  @override
  Widget build(BuildContext context) {
    final number = track.trackNumber == null ? '' : track.trackNumber!.toString().padLeft(2, '0');
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: FocusableAction(
        variant: FocusableActionVariant.button,
        focusNode: focusNode,
        onSelect: onSelect,
        onContextMenu: onContextMenu,
        child: _Card(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            children: [
              SizedBox(
                width: 36,
                child: Text(number, style: const TextStyle(color: Color(0xFF6B7280), fontSize: 15)),
              ),
              if (track.isPlayed)
                const Padding(
                  padding: EdgeInsets.only(right: 8),
                  child: Icon(Icons.check_circle, color: Color(0xFF22C55E), size: 18),
                ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(track.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white, fontSize: 17)),
                    if ((track.artistName ?? '').isNotEmpty || (track.albumTitle ?? '').isNotEmpty)
                      Text(
                        [track.artistName, track.albumTitle].whereType<String>().where((v) => v.isNotEmpty).join(' · '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
                      ),
                  ],
                ),
              ),
              Text(track.durationLabel, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 15)),
            ],
          ),
        ),
      ),
    );
  }
}

/// Full-screen now-playing view: large art, title/artist, progress, every transport
/// control, and the queue from the current track onwards.
///
/// The bar alone was the only player surface (measured 2026-11-21): the queue existed but
/// was one dialog deeper, and nothing showed elapsed/total at 10 feet. This view is opened
/// with Select on the bar's title and is fully D-pad operable.
class _NowPlayingView extends ConsumerWidget {
  const _NowPlayingView();

  static String _fmt(Duration value) {
    final minutes = value.inMinutes;
    final seconds = (value.inSeconds % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final playback = ref.watch(musicPlayerProvider);
    final player = ref.read(musicPlayerProvider.notifier);
    final track = playback.current;
    if (track == null) {
      return const Center(child: Text('Nothing playing', style: TextStyle(color: Colors.white)));
    }
    final progress = playback.duration.inMilliseconds == 0
        ? 0.0
        : (playback.position.inMilliseconds / playback.duration.inMilliseconds).clamp(0.0, 1.0);
    final upNext = playback.index == null
        ? <MusicTrack>[]
        : playback.queue.skip(playback.index! + 1).take(8).toList();

    return Dialog(
      backgroundColor: const Color(0xFF0B1220),
      insetPadding: const EdgeInsets.all(40),
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Expanded(
                child: Text(track.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w700)),
              ),
              FocusableAction(
                variant: FocusableActionVariant.button,
                onSelect: () => Navigator.of(context).pop(),
                child: const Padding(
                  padding: EdgeInsets.all(8),
                  child: Icon(Icons.close, color: Colors.white70, size: 26),
                ),
              ),
            ]),
            if (track.artistName != null)
              Text(track.artistName!, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 20)),
            const SizedBox(height: 24),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 8,
                backgroundColor: const Color(0xFF1F2937),
                valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF8B5CF6)),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(_fmt(playback.position), style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 16)),
                Text(_fmt(playback.duration), style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 16)),
              ],
            ),
            const SizedBox(height: 24),
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              FocusableAction(
                variant: FocusableActionVariant.button,
                onSelect: player.toggleShuffle,
                child: _PlayerButton(icon: Icons.shuffle, active: playback.shuffle),
              ),
              const SizedBox(width: 16),
              FocusableAction(
                variant: FocusableActionVariant.button,
                onSelect: player.previous,
                child: const _PlayerButton(icon: Icons.skip_previous),
              ),
              const SizedBox(width: 16),
              FocusableAction(
                variant: FocusableActionVariant.button,
                autofocus: true,
                onSelect: player.toggle,
                child: _PlayerButton(icon: playback.isPlaying ? Icons.pause : Icons.play_arrow),
              ),
              const SizedBox(width: 16),
              FocusableAction(
                variant: FocusableActionVariant.button,
                onSelect: player.next,
                child: const _PlayerButton(icon: Icons.skip_next),
              ),
              const SizedBox(width: 16),
              FocusableAction(
                variant: FocusableActionVariant.button,
                onSelect: player.cycleRepeat,
                child: _PlayerButton(
                  icon: playback.repeatMode == MusicRepeatMode.one ? Icons.repeat_one : Icons.repeat,
                  active: playback.repeatMode != MusicRepeatMode.off,
                ),
              ),
            ]),
            if (upNext.isNotEmpty) ...[
              const SizedBox(height: 28),
              const Text('Up next',
                  style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              ...upNext.map((next) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(children: [
                      const Icon(Icons.music_note, size: 16, color: Color(0xFF6B7280)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(next.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Color(0xFFD1D5DB), fontSize: 18)),
                      ),
                    ]),
                  )),
            ],
          ],
        ),
      ),
    );
  }
}

class _NowPlayingBar extends ConsumerWidget {
  const _NowPlayingBar({required this.playback});

  final MusicPlaybackState playback;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final player = ref.read(musicPlayerProvider.notifier);
    final track = playback.current!;
    return Container(
      color: const Color(0xFF111827),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      child: Row(
        children: [
          // The title is the door to the full now-playing view: with only the bar, the
          // queue and the large controls were unreachable at 10 feet.
          FocusableAction(
            variant: FocusableActionVariant.button,
            borderRadius: 10,
            onSelect: () => showDialog<void>(
              context: context,
              builder: (_) => const _NowPlayingView(),
            ),
            child: Row(children: [
              const Icon(Icons.music_note, color: Color(0xFFA78BFA), size: 26),
              const SizedBox(width: 12),
              SizedBox(
                width: 260,
                child: Text(track.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600)),
              ),
            ]),
          ),
          const Spacer(),
          FocusableAction(
            variant: FocusableActionVariant.button,
            onSelect: player.toggleShuffle,
            child: _PlayerButton(
              icon: Icons.shuffle,
              active: playback.shuffle,
            ),
          ),
          const SizedBox(width: 8),
          FocusableAction(
            variant: FocusableActionVariant.button,
            onSelect: player.previous,
            child: const _PlayerButton(icon: Icons.skip_previous),
          ),
          FocusableAction(
            variant: FocusableActionVariant.button,
            onSelect: player.toggle,
            child: _PlayerButton(icon: playback.isPlaying ? Icons.pause : Icons.play_arrow),
          ),
          FocusableAction(
            variant: FocusableActionVariant.button,
            onSelect: player.next,
            child: const _PlayerButton(icon: Icons.skip_next),
          ),
          const SizedBox(width: 8),
          FocusableAction(
            variant: FocusableActionVariant.button,
            onSelect: player.cycleRepeat,
            child: _PlayerButton(
              icon: playback.repeatMode == MusicRepeatMode.one ? Icons.repeat_one : Icons.repeat,
              active: playback.repeatMode != MusicRepeatMode.off,
            ),
          ),
          const SizedBox(width: 8),
          FocusableAction(
            variant: FocusableActionVariant.button,
            onSelect: () => showDialog<void>(
              context: context,
              builder: (_) => const _QueueDialog(),
            ),
            child: const _PlayerButton(icon: Icons.queue_music),
          ),
          const SizedBox(width: 16),
          Text(
            '${_fmt(playback.position)} / ${_fmt(playback.duration)}',
            style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 15),
          ),
        ],
      ),
    );
  }

  static String _fmt(Duration value) {
    final minutes = value.inMinutes;
    final seconds = (value.inSeconds % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }
}

class _QueueDialog extends ConsumerWidget {
  const _QueueDialog();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(musicPlayerProvider);
    final player = ref.read(musicPlayerProvider.notifier);
    return Dialog(
      backgroundColor: const Color(0xFF0B0B12),
      insetPadding: const EdgeInsets.all(64),
      child: SizedBox(
        width: 760,
        height: 620,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 12),
              child: Row(
                children: [
                  Expanded(
                    child: Text('Queue · ${state.queue.length}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w600)),
                  ),
                  Text(
                    state.shuffle ? 'Shuffle on' : 'In order',
                    style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 16),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: state.queue.length,
                itemBuilder: (context, index) {
                  final track = state.queue[index];
                  final isCurrent = index == state.index;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: FocusableAction(
                      variant: FocusableActionVariant.button,
                      autofocus: isCurrent || (state.index == null && index == 0),
                      onSelect: () async {
                        await player.jumpTo(index);
                        if (context.mounted) Navigator.of(context).pop();
                      },
                      onContextMenu: () => showTvContextMenu(context, title: track.title, actions: [
                        TvContextAction(
                          label: 'Remove from queue',
                          onSelected: () => player.removeAt(index),
                        ),
                        TvContextAction(
                          label: 'Move up',
                          onSelected: () => player.moveItem(index, index - 1),
                        ),
                        TvContextAction(
                          label: 'Move down',
                          onSelected: () => player.moveItem(index, index + 1),
                        ),
                      ]),
                      child: _Card(
                        active: isCurrent,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        child: Row(
                          children: [
                            if (isCurrent)
                              const Padding(
                                padding: EdgeInsets.only(right: 10),
                                child: Icon(Icons.equalizer, color: Color(0xFFC4B5FD), size: 20),
                              ),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(track.title,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(color: Colors.white, fontSize: 17)),
                                  Text(
                                    [track.artistName, track.albumTitle]
                                        .whereType<String>()
                                        .where((v) => v.isNotEmpty)
                                        .join(' · '),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
                                  ),
                                ],
                              ),
                            ),
                            Text(track.durationLabel, style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 15)),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PlayerButton extends StatelessWidget {
  const _PlayerButton({required this.icon, this.active = false});

  final IconData icon;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return _Card(
      active: active,
      padding: const EdgeInsets.all(10),
      child: Icon(icon, color: active ? const Color(0xFFC4B5FD) : Colors.white, size: 26),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.child, this.padding = const EdgeInsets.all(14), this.active = false});

  final Widget child;
  final EdgeInsets padding;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: active ? const Color(0xFF241B4D) : const Color(0xFF111827),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: active ? const Color(0xFF8B5CF6) : const Color(0xFF262635)),
      ),
      child: child,
    );
  }
}
