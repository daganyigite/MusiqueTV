package com.rodrigue.musiquetv

import android.annotation.SuppressLint
import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.os.Message
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
import java.net.HttpURLConnection
import java.net.URL

/**
 * Musique TV
 * ----------
 * Ouvre music.apple.com dans une WebView invisible, puis injecte notre
 * interface TV (assets/tv-ui.js) par-dessus. La musique est lue par le
 * lecteur officiel déjà présent dans la page.
 */
class MainActivity : Activity() {

    companion object {
        const val START_URL = "https://music.apple.com/"
        // On se présente comme un Chrome de bureau pour que le site
        // propose sa version complète et la connexion Apple.
        const val USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    }

    private lateinit var root: FrameLayout
    private lateinit var web: WebView
    private lateinit var splash: TextView
    private var popup: WebView? = null
    private var uiScript: String = ""

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        uiScript = assets.open("tv-ui.js").bufferedReader().use { it.readText() }

        root = FrameLayout(this)
        root.setBackgroundColor(Color.parseColor("#0E0F13"))

        web = WebView(this)
        configure(web)
        web.setBackgroundColor(Color.parseColor("#0E0F13"))
        web.addJavascriptInterface(Bridge(), "TVBridge")
        web.webViewClient = object : WebViewClient() {
            // Pendant le chargement, on cache le site Apple derrière l'écran d'attente.
            override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                splash.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView, url: String) {
                if (url.contains("music.apple.com")) {
                    view.evaluateJavascript(uiScript, null)
                }
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            // Autorise la lecture protégée (DRM) nécessaire à Apple Music.
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    val ok = request.resources.filter {
                        it == PermissionRequest.RESOURCE_PROTECTED_MEDIA_ID
                    }.toTypedArray()
                    if (ok.isNotEmpty()) request.grant(ok) else request.deny()
                }
            }

            // La connexion Apple s'ouvre dans une fenêtre séparée.
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

        web.loadUrl(START_URL)
        web.requestFocus()
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
        }
        w.isFocusable = true
        w.isFocusableInTouchMode = true
    }

    private fun openPopup(resultMsg: Message) {
        closePopup()
        val p = WebView(this)
        configure(p)
        p.setBackgroundColor(Color.WHITE)
        CookieManager.getInstance().setAcceptThirdPartyCookies(p, true)
        p.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = false
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

    /** Fonctions que notre interface (JavaScript) peut appeler. */
    inner class Bridge {
        @JavascriptInterface
        fun ready() {
            runOnUiThread { splash.visibility = View.GONE }
        }

        @JavascriptInterface
        fun reloadUi() {
            runOnUiThread { web.loadUrl(START_URL) }
        }

        /**
         * Requête HTTP faite par Android (le site Apple bloque les appels vers d'autres sites).
         * Limité volontairement à l'API de paroles LRCLIB.
         */
        @JavascriptInterface
        fun httpGet(id: String, url: String) {
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
                    code = c.responseCode
                    val stream = if (code in 200..399) c.inputStream else c.errorStream
                    body = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
                    c.disconnect()
                } catch (e: Exception) {
                    code = 0
                }
                sendHttp(id, code, body)
            }.start()
        }
    }

    private fun sendHttp(id: String, code: Int, body: String) {
        val js = "window.__tvHttp && window.__tvHttp(" + JSONObject.quote(id) + "," + code + "," + JSONObject.quote(body) + ")"
        runOnUiThread { web.evaluateJavascript(js, null) }
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
            if (event.keyCode == KeyEvent.KEYCODE_BACK) {
                handleBack()
                return true
            }
        }
        if (event.keyCode == KeyEvent.KEYCODE_BACK) return true
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
        closePopup()
        web.destroy()
        super.onDestroy()
    }
}
