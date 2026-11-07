package com.mediarr.mediarr_client

import android.content.Intent
import android.provider.Settings
import androidx.core.content.FileProvider
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "mediarr/update")
            .setMethodCallHandler { call, result ->
                if (call.method != "installApk") {
                    result.notImplemented()
                    return@setMethodCallHandler
                }
                val path = call.argument<String>("path")
                if (path == null) {
                    result.error("bad_args", "path is required", null)
                    return@setMethodCallHandler
                }
                try {
                    val file = File(path)
                    val uri = FileProvider.getUriForFile(
                        this,
                        "$packageName.fileprovider",
                        file,
                    )
                    val intent = Intent(Intent.ACTION_INSTALL_PACKAGE).apply {
                        data = uri
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    startActivity(intent)
                    result.success(true)
                } catch (error: Exception) {
                    result.error("install_failed", error.message, null)
                }
            }

        // Escape hatch for dedicated-box (kiosk) mode: opens the system Home
        // app picker so the TV can be returned to its stock launcher without
        // ADB.
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "mediarr/system")
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "openHomeSettings" -> {
                        val intents = listOf(
                            Intent(Settings.ACTION_HOME_SETTINGS),
                            Intent(Settings.ACTION_SETTINGS),
                        )
                        for (intent in intents) {
                            try {
                                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                startActivity(intent)
                                result.success(true)
                                return@setMethodCallHandler
                            } catch (_: Exception) {
                                // Try the next, broader intent.
                            }
                        }
                        result.error("no_settings", "No system settings activity", null)
                    }
                    else -> result.notImplemented()
                }
            }
    }
}
