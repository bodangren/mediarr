package com.mediarr.tv.data.repository

import com.mediarr.tv.core.model.MediaCard
import com.mediarr.tv.core.model.MediaRow

interface CatalogRepository {
  suspend fun homeRows(): List<MediaRow>
  suspend fun detail(media: MediaCard): MediaCard
}
