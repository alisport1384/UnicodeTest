package ai.p6tx.lab;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final int PICK_FILE = 101, SAVE_FILE = 102;
    private static final String HOME = "https://appassets.androidplatform.net/assets/index.html";
    private ValueCallback<Uri[]> chooser;
    private String pendingReport;
    private WebView web;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        setContentView(web);
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        // File chooser URIs are read by WebView after an explicit user selection.
        web.getSettings().setAllowContentAccess(true);
        web.getSettings().setAllowFileAccessFromFileURLs(false);
        web.getSettings().setAllowUniversalAccessFromFileURLs(false);
        web.getSettings().setBlockNetworkLoads(true);
        web.addJavascriptInterface(new Object() {
            @JavascriptInterface public void saveReport(String text) {
                if (text == null || text.length() > 100000) return;
                runOnUiThread(() -> {
                    pendingReport = text;
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("application/json");
                    intent.putExtra(Intent.EXTRA_TITLE, "p6tx-report.json");
                    try { startActivityForResult(intent, SAVE_FILE); }
                    catch (ActivityNotFoundException e) { pendingReport = null; Toast.makeText(MainActivity.this, "ذخیره‌ساز فایل در دسترس نیست", Toast.LENGTH_LONG).show(); }
                });
            }
        }, "AndroidBridge");
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                return loader.shouldInterceptRequest(req.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) { return true; }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (chooser != null) chooser.onReceiveValue(null);
                chooser = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                try { startActivityForResult(intent, PICK_FILE); return true; }
                catch (ActivityNotFoundException e) { chooser = null; return false; }
            }
        });
        web.loadUrl(HOME);
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == PICK_FILE && chooser != null) {
            Uri uri = result == RESULT_OK && data != null ? data.getData() : null;
            chooser.onReceiveValue(uri == null ? null : new Uri[]{uri});
            chooser = null;
        } else if (request == SAVE_FILE) {
            if (result == RESULT_OK && data != null && data.getData() != null && pendingReport != null) {
                try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                    if (out == null) throw new java.io.IOException("No output stream");
                    out.write(pendingReport.getBytes(StandardCharsets.UTF_8));
                    Toast.makeText(this, "گزارش ذخیره شد", Toast.LENGTH_SHORT).show();
                } catch (Exception e) { Toast.makeText(this, "خطا در ذخیره گزارش", Toast.LENGTH_LONG).show(); }
            }
            pendingReport = null;
        }
    }
    @Override protected void onDestroy() {
        if (chooser != null) { chooser.onReceiveValue(null); chooser = null; }
        web.removeJavascriptInterface("AndroidBridge");
        web.destroy();
        super.onDestroy();
    }
}
