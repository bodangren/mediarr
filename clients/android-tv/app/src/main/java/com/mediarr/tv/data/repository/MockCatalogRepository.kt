package com.mediarr.tv.data.repository

import com.mediarr.tv.core.model.MediaCard
import com.mediarr.tv.core.model.MediaRow
import com.mediarr.tv.ui.home.MockCatalog

object MockCatalogRepository : CatalogRepository {
  override suspend fun homeRows(): List<MediaRow> = MockCatalog.rows()

  override suspend fun detail(media: MediaCard): MediaCard = media
}
