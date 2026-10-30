package com.rodrigue.musiquetv

import android.annotation.SuppressLint
import android.app.Activity
import android.app.PendingIntent
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.media.MediaMetadata
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.Message
import android.speech.RecognizerIntent
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.TextView
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.SecureRandom

/**
 * Musique TV
 * ----------
 * Ouvre music.apple.com dans une WebView invisible, puis injecte notre
 * interface TV (tv-ui.js) par-dessus. La musique est lue par le lecteur
 * officiel déjà présent dans la page.
 *
 * Sécurité :
 *  - la WebView ne peut naviguer que sur les sites d'Apple (https) ;
 *  - le pont Android <-> interface exige un jeton secret, changé à chaque chargement,
 *    connu seulement de notre script (les cadres d'autres sites ne peuvent pas l'utiliser) ;
 *  - accès aux fichiers désactivé, contenu mixte interdit, Safe Browsing activé ;
 *  - les requêtes réseau faites par Android sont limitées à LRCLIB et à ton dépôt GitHub ;
 *  - pas de sauvegarde des données de l'app (session Apple) via adb / cloud.
 */
class MainActivity : Activity() {

    companion object {
        const val START_URL = "https://music.apple.com/"
        /** Interface mise à jour à distance : uniquement ce fichier de TON dépôt, en https. */
        const val UI_URL = "https://raw.githubusercontent.com/daganyigite/MusiqueTV/main/app/src/main/assets/tv-ui.js"
        // On se présente comme un Chrome de bureau pour que le site
        // propose sa version complète et la connexion Apple.
        const val USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        const val REQ_VOICE = 42
        private val VERSION_RE = Regex("TVUI_VERSION\\s*=\\s*(\\d+)")

        fun uiVersion(js: String): Int = VERSION_RE.find(js)?.groupValues?.get(1)?.toIntOrNull() ?: 0

        fun looksValid(js: String): Boolean =
            js.length in 30_000..3_000_000 && js.contains("window.__tvui") && js.contains("TVUI_VERSION") &&
                js.contains("'__TV_TOKEN__'")

        fun isAppleHost(host: String?): Boolean {
            val h = host?.lowercase() ?: return false
            return h == "apple.com" || h.endsWith(".apple.com") ||
                h == "icloud.com" || h.endsWith(".icloud.com") ||
                h.endsWith(".cdn-apple.com") || h.endsWith(".mzstatic.com")
        }
    }

    private lateinit var root: FrameLayout
    private lateinit var web: WebView
    private lateinit var splash: TextView
    private lateinit var prefs: SharedPreferences
    private var popup: WebView? = null
    private val handler = Handler(Looper.getMainLooper())
    private val rng = SecureRandom()

    // Interface
    private var bundledJs = ""
    private var bundledVersion = 0
    private var uiScript = ""
    private var runningVersion = 0
    private var usingRemote = false
    @Volatile private var token = ""
    @Volatile private var uiConfirmed = false
    private var watchdogArmed = false

    // Lecture en arrière-plan / télécommande
    private var session: MediaSession? = null
    private var artUrl: String? = null
    private var artBitmap: Bitmap? = null
    private var lastMeta: JSONObject? = null
    private val stopServiceTask = Runnable { PlaybackService.stop(this) }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WebView.setWebContentsDebuggingEnabled(false)

        prefs = getSharedPreferences("musiquetv", MODE_PRIVATE)
        bundledJs = assets.open("tv-ui.js").bufferedReader().use { it.readText() }
        bundledVersion = uiVersion(bundledJs)
        chooseScript()

        root = FrameLayout(this)
        root.setBackgroundColor(Color.parseColor("#0E0F13"))

        web = WebView(this)
        configure(web)
        web.setBackgroundColor(Color.parseColor("#0E0F13"))
        web.addJavascriptInterface(Bridge(), "TVBridge")
        web.webViewClient = object : WebViewClient() {
            // Navigation limitée aux sites d'Apple, en https.
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val u = request.url
                return !(u.scheme == "https" && isAppleHost(u.host))
            }

            override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) {
                token = newToken()
                uiConfirmed = false
                splash.visibility = View.VISIBLE
            }

            // Plus tôt que onPageFinished : l'interface apparaît plus vite.
            override fun onPageCommitVisible(view: WebView, url: String) {
                inject(view, url)
            }

            override fun onPageFinished(view: WebView, url: String) {
                inject(view, url)
                armWatchdog()
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            // Autorise uniquement la lecture protégée (DRM) nécessaire à Apple Music.
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    val ok = request.resources.filter {
                        it == PermissionRequest.RESOURCE_PROTECTED_MEDIA_ID
                    }.toTypedArray()
                    if (ok.isNotEmpty() && isAppleHost(request.origin?.host)) request.grant(ok) else request.deny()
                }
            }

            // La connexion Apple s'ouvre dans une fenêtre séparée (sans accès au pont).
            override fun onCreateWindow(
                view: WebView, isDialog: Boolean, isUserGesture: Boolean, resultMsg: Message
            ): Boolean {
                openPopup(resultMsg)
                return true
            }

            override fun onCloseWindow(window: WebView) {
                closePopup()
            }
        }

        splash = TextView(this).apply {
            text = "Musique TV\nChargement…"
            setTextColor(Color.parseColor("#F2F2F4"))
            textSize = 28f
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0E0F13"))
        }

        root.addView(web, match())
        root.addView(splash, match())
        setContentView(root)

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true)

        setupSession()

        web.loadUrl(START_URL)
        web.requestFocus()

        // Recherche d'une nouvelle interface, en arrière-plan, quelques secondes après le démarrage.
        if (prefs.getBoolean("remote", true)) handler.postDelayed({ checkRemote(false) }, 8000)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configure(w: WebView) {
        w.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            setSupportMultipleWindows(true)
            javaScriptCanOpenWindowsAutomatically = true
            userAgentString = USER_AGENT
            cacheMode = WebSettings.LOAD_DEFAULT
            loadWithOverviewMode = true
            useWideViewPort = true
            // Durcissement
            allowFileAccess = false
            allowContentAccess = false
            setGeolocationEnabled(false)
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            if (Build.VERSION.SDK_INT >= 26) safeBrowsingEnabled = true
        }
        w.isFocusable = true
        w.isFocusableInTouchMode = true
    }

    private fun newToken(): String {
        val b = ByteArray(16)
        rng.nextBytes(b)
        return b.joinToString("") { "%02x".format(it) }
    }

    // ---------------------------------------------------------------- Interface

    /** Choisit l'interface : celle intégrée à l'apk, ou une plus récente téléchargée depuis GitHub. */
    private fun chooseScript() {
        usingRemote = false
        uiScript = bundledJs
        runningVersion = bundledVersion
        val f = File(filesDir, "tv-ui-remote.js")
        if (prefs.getBoolean("remote", true) && f.exists()) {
            try {
                val js = f.readText()
                val v = uiVersion(js)
                if (looksValid(js) && v > bundledVersion && v != prefs.getInt("bad_version", -1)) {
                    uiScript = js
                    runningVersion = v
                    usingRemote = true
                }
            } catch (_: Exception) {}
        }
    }

    private fun inject(view: WebView, url: String) {
        if (Uri.parse(url).host != "music.apple.com") return
        val t = token
        view.evaluateJavascript(uiScript.replace("'__TV_TOKEN__'", "'$t'"), null)
    }

    /**
     * Si une interface téléchargée ne démarre pas (Apple a changé quelque chose, fichier abîmé…),
     * on la met de côté et on revient automatiquement à l'interface intégrée.
     */
    private fun armWatchdog() {
        if (!usingRemote || watchdogArmed) return
        watchdogArmed = true
        handler.postDelayed({
            watchdogArmed = false
            if (usingRemote && !uiConfirmed) {
                prefs.edit().putInt("bad_version", runningVersion).apply()
                File(filesDir, "tv-ui-remote.js").delete()
                chooseScript()
                web.loadUrl(START_URL)
            }
        }, 25000)
    }

    /** Télécharge la dernière interface depuis ton dépôt GitHub (uniquement cette adresse). */
    private fun checkRemote(manual: Boolean) {
        Thread {
            var status = "error"
            var version = 0
            try {
                val c = URL(UI_URL + "?t=" + System.currentTimeMillis()).openConnection() as HttpURLConnection
                c.connectTimeout = 8000
                c.readTimeout = 15000
                c.instanceFollowRedirects = false
                c.setRequestProperty("User-Agent", "MusiqueTV")
                if (c.responseCode == 200) {
                    val bytes = c.inputStream.use { it.readBytes() }
                    c.disconnect()
                    if (bytes.size <= 3_000_000) {
                        val js = String(bytes, Charsets.UTF_8)
                        version = uiVersion(js)
                        val cached = File(filesDir, "tv-ui-remote.js")
                        val cachedV = if (cached.exists()) uiVersion(cached.readText()) else 0
                        val best = maxOf(bundledVersion, cachedV)
                        status = when {
                            !looksValid(js) -> "error"
                            version == prefs.getInt("bad_version", -1) -> "uptodate"
                            version > best -> {
                                val tmp = File(filesDir, "tv-ui-remote.tmp")
                                tmp.writeText(js)
                                tmp.renameTo(cached)
                                "ready"
                            }
                            else -> "uptodate"
                        }
                    }
                } else c.disconnect()
            } catch (_: Exception) {
                status = "error"
            }
            if (manual || status == "ready") {
                js("window.__tvUpdate && window.__tvUpdate(" + JSONObject.quote(status) + "," + version + ")")
            }
        }.start()
    }

    // ---------------------------------------------------------------- Fenêtre de connexion

    private fun openPopup(resultMsg: Message) {
        closePopup()
        val p = WebView(this)
        configure(p)
        p.setBackgroundColor(Color.WHITE)
        CookieManager.getInstance().setAcceptThirdPartyCookies(p, true)
        p.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val u = request.url
                return !(u.scheme == "https" && isAppleHost(u.host))
            }
        }
        p.webChromeClient = object : WebChromeClient() {
            override fun onCloseWindow(window: WebView) {
                closePopup()
            }
        }
        root.addView(p, match())
        popup = p
        p.requestFocus()
        (resultMsg.obj as WebView.WebViewTransport).webView = p
        resultMsg.sendToTarget()
    }

    private fun closePopup() {
        popup?.let {
            root.removeView(it)
            it.destroy()
        }
        popup = null
        web.requestFocus()
    }

    private fun match() = FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT
    )

    private fun js(code: String) {
        runOnUiThread { web.evaluateJavascript(code, null) }
    }

    // ---------------------------------------------------------------- Télécommande, « En cours de lecture »

    private fun setupSession() {
        val s = MediaSession(this, "MusiqueTV")
        s.setCallback(object : MediaSession.Callback() {
            override fun onPlay() = js("window.__tvMedia && window.__tvMedia('play')")
            override fun onPause() = js("window.__tvMedia && window.__tvMedia('pause')")
            override fun onStop() = js("window.__tvMedia && window.__tvMedia('pause')")
            override fun onSkipToNext() = js("window.__tvMedia && window.__tvMedia('next')")
            override fun onSkipToPrevious() = js("window.__tvMedia && window.__tvMedia('previous')")
            override fun onSeekTo(pos: Long) = js("window.__tvSeek && window.__tvSeek(" + (pos / 1000.0) + ")")
        })
        @Suppress("DEPRECATION")
        s.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS or MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS)
        val pi = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        s.setSessionActivity(pi)
        session = s
    }

    private fun applyNowPlaying(m: JSONObject) {
        val s = session ?: return
        val title = m.optString("title")
        if (title.isEmpty()) {
            s.isActive = false
            return
        }
        val playing = m.optBoolean("playing")
        val art = m.optString("art")
        val mb = MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, title)
            .putString(MediaMetadata.METADATA_KEY_ARTIST, m.optString("artist"))
            .putString(MediaMetadata.METADATA_KEY_ALBUM, m.optString("album"))
            .putLong(MediaMetadata.METADATA_KEY_DURATION, m.optLong("dur"))
        if (art == artUrl && artBitmap != null) mb.putBitmap(MediaMetadata.METADATA_KEY_ART, artBitmap)
        s.setMetadata(mb.build())
        val actions = PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PAUSE or PlaybackState.ACTION_PLAY_PAUSE or
            PlaybackState.ACTION_SKIP_TO_NEXT or PlaybackState.ACTION_SKIP_TO_PREVIOUS or
            PlaybackState.ACTION_SEEK_TO or PlaybackState.ACTION_STOP
        s.setPlaybackState(
            PlaybackState.Builder()
                .setActions(actions)
                .setState(if (playing) PlaybackState.STATE_PLAYING else PlaybackState.STATE_PAUSED, m.optLong("pos"), if (playing) 1f else 0f)
                .build()
        )
        s.isActive = true
        if (art.isNotEmpty() && art != artUrl) loadArt(art)

        // Service de lecture : garde l'app en vie quand tu fais autre chose sur la télé.
        handler.removeCallbacks(stopServiceTask)
        if (playing) PlaybackService.start(this, title, m.optString("artist"))
        else handler.postDelayed(stopServiceTask, 15 * 60 * 1000L)
    }

    private fun loadArt(url: String) {
        val u = Uri.parse(url)
        if (u.scheme != "https" || u.host?.endsWith(".mzstatic.com") != true) return
        artUrl = url
        artBitmap = null
        Thread {
            try {
                val c = URL(url).openConnection() as HttpURLConnection
                c.connectTimeout = 6000
                c.readTimeout = 8000
                val bmp = c.inputStream.use { BitmapFactory.decodeStream(it) }
                c.disconnect()
                runOnUiThread {
                    if (artUrl == url && bmp != null) {
                        artBitmap = bmp
                        lastMeta?.let { applyNowPlaying(it) }
                    }
                }
            } catch (_: Exception) {}
        }.start()
    }

    // ---------------------------------------------------------------- Pont avec l'interface

    /** Fonctions que notre interface peut appeler. Chacune exige le jeton secret du chargement en cours. */
    inner class Bridge {
        private fun ok(t: String) = t.isNotEmpty() && t == token

        @JavascriptInterface
        fun ready(t: String) {
            if (!ok(t)) return
            runOnUiThread { splash.visibility = View.GONE }
        }

        /** L'interface a bien démarré : on garde la version téléchargée. */
        @JavascriptInterface
        fun uiOk(t: String, version: Int) {
            if (!ok(t)) return
            uiConfirmed = true
        }

        /** Fin du minuteur : on revient à l'écran d'accueil de la télé (la musique est en pause). */
        @JavascriptInterface
        fun goHome(t: String) {
            if (!ok(t)) return
            runOnUiThread { moveTaskToBack(true) }
        }

        @JavascriptInterface
        fun reloadUi(t: String) {
            if (!ok(t)) return
            runOnUiThread {
                chooseScript()
                web.loadUrl(START_URL)
            }
        }

        @JavascriptInterface
        fun info(t: String): String {
            if (!ok(t)) return "{}"
            val apk = try { packageManager.getPackageInfo(packageName, 0).versionName ?: "" } catch (_: Exception) { "" }
            return JSONObject()
                .put("bundled", bundledVersion)
                .put("running", runningVersion)
                .put("remote", prefs.getBoolean("remote", true))
                .put("usingRemote", usingRemote)
                .put("apk", apk)
                .toString()
        }

        @JavascriptInterface
        fun setRemoteUpdates(t: String, on: Boolean) {
            if (!ok(t)) return
            prefs.edit().putBoolean("remote", on).apply()
            if (!on) File(filesDir, "tv-ui-remote.js").delete()
        }

        @JavascriptInterface
        fun checkUpdate(t: String) {
            if (!ok(t)) return
            checkRemote(true)
        }

        /** Titre en cours : pour la télécommande, l'Assistant Google et la lecture en arrière-plan. */
        @JavascriptInterface
        fun nowPlaying(t: String, json: String) {
            if (!ok(t)) return
            try {
                val m = JSONObject(json)
                runOnUiThread {
                    lastMeta = m
                    applyNowPlaying(m)
                }
            } catch (_: Exception) {}
        }

        @JavascriptInterface
        fun voiceSearch(t: String) {
            if (!ok(t)) return
            runOnUiThread {
                try {
                    val i = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                        .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                        .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "fr-FR")
                        .putExtra(RecognizerIntent.EXTRA_PROMPT, "Que veux-tu écouter ?")
                    startActivityForResult(i, REQ_VOICE)
                } catch (_: Exception) {
                    js("window.__tvVoice && window.__tvVoice(null)")
                }
            }
        }

        /**
         * Requête HTTP faite par Android (le site Apple bloque les appels vers d'autres sites).
         * Limité volontairement à l'API de paroles LRCLIB.
         */
        @JavascriptInterface
        fun httpGet(t: String, id: String, url: String) {
            if (!ok(t)) return
            if (!url.startsWith("https://lrclib.net/api/")) {
                sendHttp(id, 0, "")
                return
            }
            Thread {
                var code = 0
                var body = ""
                try {
                    val c = URL(url).openConnection() as HttpURLConnection
                    c.setRequestProperty("User-Agent", "MusiqueTV/1.0 (https://github.com/daganyigite/MusiqueTV)")
                    c.connectTimeout = 8000
                    c.readTimeout = 10000
                    c.instanceFollowRedirects = false
                    code = c.responseCode
                    val stream = if (code in 200..399) c.inputStream else c.errorStream
                    val bytes = stream?.use { it.readBytes() } ?: ByteArray(0)
                    body = if (bytes.size <= 2_000_000) String(bytes, Charsets.UTF_8) else ""
                    c.disconnect()
                } catch (_: Exception) {
                    code = 0
                }
                sendHttp(id, code, body)
            }.start()
        }
    }

    private fun sendHttp(id: String, code: Int, body: String) {
        js("window.__tvHttp && window.__tvHttp(" + JSONObject.quote(id) + "," + code + "," + JSONObject.quote(body) + ")")
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQ_VOICE) {
            val text = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
            js("window.__tvVoice && window.__tvVoice(" + (if (text != null) JSONObject.quote(text) else "null") + ")")
        }
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.action == KeyEvent.ACTION_DOWN) {
            val media = when (event.keyCode) {
                KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE, KeyEvent.KEYCODE_HEADSETHOOK -> "toggle"
                KeyEvent.KEYCODE_MEDIA_PLAY -> "play"
                KeyEvent.KEYCODE_MEDIA_PAUSE -> "pause"
                KeyEvent.KEYCODE_MEDIA_NEXT, KeyEvent.KEYCODE_MEDIA_FAST_FORWARD -> "next"
                KeyEvent.KEYCODE_MEDIA_PREVIOUS, KeyEvent.KEYCODE_MEDIA_REWIND -> "previous"
                else -> null
            }
            if (media != null && popup == null) {
                web.evaluateJavascript("window.__tvMedia && window.__tvMedia('$media')", null)
                return true
            }
            if (event.keyCode == KeyEvent.KEYCODE_SEARCH && popup == null) {
                web.evaluateJavascript("window.__tvOpenSearch && window.__tvOpenSearch()", null)
                return true
            }
            if (event.keyCode == KeyEvent.KEYCODE_BACK) {
                handleBack()
                return true
            }
        }
        if (event.keyCode == KeyEvent.KEYCODE_BACK || event.keyCode == KeyEvent.KEYCODE_SEARCH) return true
        return super.dispatchKeyEvent(event)
    }

    private fun handleBack() {
        val p = popup
        if (p != null) {
            if (p.canGoBack()) p.goBack() else closePopup()
            return
        }
        // On demande d'abord à l'interface si elle gère le retour
        // (fermer le lecteur, revenir à l'accueil...).
        web.evaluateJavascript("(window.__tvBack ? window.__tvBack() : false)") { result ->
            if (result != "true") {
                // On laisse la musique tourner en arrière-plan.
                moveTaskToBack(true)
            }
        }
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        PlaybackService.stop(this)
        session?.release()
        closePopup()
        web.destroy()
        super.onDestroy()
    }
}
