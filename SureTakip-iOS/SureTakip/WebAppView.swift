import SwiftUI
import WebKit
import Network
import UniformTypeIdentifiers

enum AppConfig {
    /// The deployed web app. Everything the user sees comes from here.
    static let appURL = URL(string: "https://sure-takip.web.app")!

    /// Hosts allowed to render inside the app. Anything else (an M-Files link,
    /// a mailto:, an external document) is handed to Safari so the user never
    /// gets stranded on a third-party page with no way back.
    static let internalHosts: Set<String> = ["sure-takip.web.app", "sure-takip.firebaseapp.com"]
}

/// A file produced inside the web app (currently the weekly PDF bulletin) that
/// the shell has written to disk and is ready to share.
struct SharePayload: Identifiable {
    let id = UUID()
    let url: URL
}

@MainActor
final class WebAppModel: ObservableObject {
    @Published var hasLoadedOnce = false
    @Published var isOffline = false
    @Published var loadError: String?
    @Published var pendingShare: SharePayload?

    weak var webView: WKWebView?

    private let monitor = NWPathMonitor()
    private let monitorQueue = DispatchQueue(label: "net.monitor")

    init() {
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor in
                self?.isOffline = (path.status != .satisfied)
            }
        }
        monitor.start(queue: monitorQueue)
    }

    deinit { monitor.cancel() }

    func reload() {
        loadError = nil
        if let webView {
            webView.load(URLRequest(url: AppConfig.appURL))
        }
    }
}

struct WebAppView: UIViewRepresentable {
    @ObservedObject var model: WebAppModel

    func makeCoordinator() -> Coordinator { Coordinator(model: model) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()

        // Persistent store: Firebase Auth keeps its session in IndexedDB /
        // localStorage, so this is what stops the app asking for a password on
        // every launch.
        config.websiteDataStore = .default()

        // Video/audio isn't used, but inline playback avoids a fullscreen
        // takeover if a link ever embeds media.
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let controller = WKUserContentController()
        controller.add(context.coordinator, name: "saveFile")
        controller.addUserScript(Coordinator.nativeBridgeScript)
        config.userContentController = controller

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.backgroundColor = UIColor(Color.appBackground)
        webView.isOpaque = false
        webView.scrollView.backgroundColor = UIColor(Color.appBackground)

        // The page is a fixed-layout app; bouncing past its edges exposes the
        // window behind it and reads as a rendering glitch.
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        // Pull-to-refresh, since there is no browser reload button.
        let refresh = UIRefreshControl()
        refresh.tintColor = .white
        refresh.addTarget(context.coordinator,
                          action: #selector(Coordinator.handleRefresh(_:)),
                          for: .valueChanged)
        webView.scrollView.refreshControl = refresh

        model.webView = webView
        webView.load(URLRequest(url: AppConfig.appURL))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    // MARK: - Coordinator

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate,
                             WKScriptMessageHandler, WKDownloadDelegate {
        private let model: WebAppModel

        init(model: WebAppModel) { self.model = model }

        /// Injected before the page runs. jsPDF's `save()` triggers a blob
        /// download, which a WKWebView silently drops - so js/reports.js checks
        /// for `window.SureTakipNative` and hands the PDF over as base64
        /// instead. This flag is what it looks for.
        static let nativeBridgeScript = WKUserScript(
            source: """
            window.SureTakipNative = {
                platform: 'ios',
                saveFile: function (name, base64) {
                    window.webkit.messageHandlers.saveFile.postMessage({ name: name, data: base64 });
                }
            };
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )

        @objc func handleRefresh(_ sender: UIRefreshControl) {
            model.webView?.reload()
        }

        // MARK: Navigation

        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            // mailto:, tel: and any non-web scheme belong to the system.
            if let scheme = url.scheme?.lowercased(), scheme != "http", scheme != "https" {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }

            // Keep the app on its own origin; send everything else to Safari.
            if let host = url.host, !AppConfig.internalHosts.contains(host) {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }

            decisionHandler(.allow)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            webView.scrollView.refreshControl?.endRefreshing()
            model.hasLoadedOnce = true
            model.loadError = nil
        }

        func webView(_ webView: WKWebView,
                     didFail navigation: WKNavigation!,
                     withError error: Error) {
            handleFailure(webView, error)
        }

        func webView(_ webView: WKWebView,
                     didFailProvisionalNavigation navigation: WKNavigation!,
                     withError error: Error) {
            handleFailure(webView, error)
        }

        private func handleFailure(_ webView: WKWebView, _ error: Error) {
            webView.scrollView.refreshControl?.endRefreshing()
            // A cancelled navigation is normal (e.g. a redirect superseding a
            // request) and must not replace a working page with an error screen.
            let nsError = error as NSError
            guard nsError.code != NSURLErrorCancelled else { return }

            // Once the app is up, transient errors are covered by the offline
            // banner; the full-screen error is only for a failed cold start.
            guard !model.hasLoadedOnce else { return }
            model.loadError = nsError.localizedDescription
        }

        // target="_blank" has no window to open into inside the shell.
        func webView(_ webView: WKWebView,
                     createWebViewWith configuration: WKWebViewConfiguration,
                     for navigationAction: WKNavigationAction,
                     windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = navigationAction.request.url {
                UIApplication.shared.open(url)
            }
            return nil
        }

        // MARK: JS -> native

        func userContentController(_ controller: WKUserContentController,
                                   didReceive message: WKScriptMessage) {
            guard message.name == "saveFile",
                  let body = message.body as? [String: Any],
                  let name = body["name"] as? String,
                  let base64 = body["data"] as? String,
                  let data = Data(base64Encoded: base64) else { return }

            do {
                let url = FileManager.default.temporaryDirectory
                    .appendingPathComponent(sanitize(name))
                try data.write(to: url, options: .atomic)
                model.pendingShare = SharePayload(url: url)
            } catch {
                print("Rapor dosyası yazılamadı: \(error)")
            }
        }

        private func sanitize(_ name: String) -> String {
            let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "._- "))
            let cleaned = String(name.unicodeScalars.filter { allowed.contains($0) })
            return cleaned.isEmpty ? "rapor.pdf" : cleaned
        }

        // MARK: Downloads (any non-PDF file the page serves directly)

        func webView(_ webView: WKWebView,
                     navigationResponse: WKNavigationResponse,
                     didBecome download: WKDownload) {
            download.delegate = self
        }

        func download(_ download: WKDownload,
                      decideDestinationUsing response: URLResponse,
                      suggestedFilename: String,
                      completionHandler: @escaping (URL?) -> Void) {
            let url = FileManager.default.temporaryDirectory
                .appendingPathComponent(sanitize(suggestedFilename))
            try? FileManager.default.removeItem(at: url)
            completionHandler(url)
        }

        func downloadDidFinish(_ download: WKDownload) {
            if let url = download.progress.fileURL {
                model.pendingShare = SharePayload(url: url)
            }
        }
    }
}
