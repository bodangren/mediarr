package com.mediarr.tv.player

class ResumeDecider {
  fun shouldPrompt(session: PlaybackSession): Boolean = session.resumePositionSeconds > 0

  fun startPosition(session: PlaybackSession, option: ResumeOption): Long {
    return if (option == ResumeOption.RESUME) session.resumePositionSeconds else 0
  }
}
