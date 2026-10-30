package com.rodrigue.musiquetv

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

/**
 * Service de lecture : indique à Android que de la musique joue, pour qu'il ne ferme pas
 * l'app quand tu passes à autre chose sur la télé (économiseur d'écran, autre appli…).
 */
class PlaybackService : Service() {

    companion object {
        private const val CHANNEL = "lecture"
        private const val ID = 1
        private const val ACTION_STOP = "stop"

        fun start(ctx: Context, title: String, artist: String) {
            val i = Intent(ctx, PlaybackService::class.java)
                .putExtra("title", title)
                .putExtra("artist", artist)
            try {
                if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i) else ctx.startService(i)
            } catch (_: Exception) {
                // Android peut refuser si l'app est déjà en arrière-plan : la musique continue quand même.
            }
        }

        fun stop(ctx: Context) {
            try {
                ctx.startService(Intent(ctx, PlaybackService::class.java).setAction(ACTION_STOP))
            } catch (_: Exception) {
                try { ctx.stopService(Intent(ctx, PlaybackService::class.java)) } catch (_: Exception) {}
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }
        val title = intent?.getStringExtra("title") ?: "Musique TV"
        val artist = intent?.getStringExtra("artist") ?: ""
        val n = buildNotification(title, artist)
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
            else startForeground(ID, n)
        } catch (_: Exception) {
            stopSelf()
        }
        return START_NOT_STICKY
    }

    private fun buildNotification(title: String, artist: String): Notification {
        val pi = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val b = if (Build.VERSION.SDK_INT >= 26) {
            val nm = getSystemService(NotificationManager::class.java)
            if (nm.getNotificationChannel(CHANNEL) == null) {
                nm.createNotificationChannel(NotificationChannel(CHANNEL, "Lecture", NotificationManager.IMPORTANCE_LOW))
            }
            Notification.Builder(this, CHANNEL)
        } else {
            Notification.Builder(this)
        }
        return b.setContentTitle(title)
            .setContentText(artist)
            .setSmallIcon(R.drawable.ic_notif)
            .setOngoing(true)
            .setContentIntent(pi)
            .build()
    }
}
