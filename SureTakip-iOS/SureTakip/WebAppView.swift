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

/// Hosts the WKWebView inside its own UIViewController and pins it to that
/// controller's own view edges with Auto Layout (`view.topAnchor`, not
/// `view.safeAreaLayoutGuide.topAnchor`).
///
/// The first version of this used `UIViewRepresentable` and relied on
/// SwiftUI's `.ignoresSafeArea()` to size the raw WKWebView. In practice that
/// left black bars under the notch and above the home indicator on every
/// device - the modifier affects SwiftUI's own layout, but a
/// `UIViewRepresentable`'s size negotiation with UIKit doesn't reliably
/// inherit it, so the WKWebView ended up sized to the *safe* area while
/// RootView's plain SwiftUI `Color` behind it (which isn't a
/// UIViewRepresentable) correctly filled the whole screen - the mismatch was
/// exactly the top/bottom bands being reported. Explicit Auto Layout
/// constraints to the view's own edges remove that ambiguity entirely: this
/// view controller's `view` gets the full screen from `.ignoresSafeArea()`
/// on the SwiftUI side (that part does work reliably), and the webview is
/// then pinned to fill 100% of it, no negotiation involved.
final class WebViewController: UIViewController {
    let webView: WKWebView
    private let coordinator: WebAppView.Coordinator

    init(model: WebAppModel, coordinator: WebAppView.Coordinator) {
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
        controller.add(coordinator, name: "saveFile")
        controller.add(coordinator, name: "updateWidget")
        controller.addUserScript(WebAppView.Coordinator.nativeBridgeScript)
        config.userContentController = controller

        self.webView = WKWebView(frame: .zero, configuration: config)
        self.coordinator = coordinator
        super.init(nibName: nil, bundle: nil)

        webView.navigationDelegate = coordinator
        webView.uiDelegate = coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.backgroundColor = UIColor(Color.appBackground)
        webView.isOpaque = false
        webView.scrollView.backgroundColor = UIColor(Color.appBackground)

        // The page is a fixed-layout app; bouncing past its edges exposes the
        // window behind it and reads as a rendering glitch.
        webView.scrollView.bounces = false
        // Paired with the edge-to-edge Auto Layout below and viewport-fit=cover
        // in index.html, this is what lets CSS env(safe-area-inset-*) report
        // real values instead of the webview quietly padding for them itself.
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        let refresh = UIRefreshControl()
        refresh.tintColor = .white
        refresh.addTarget(coordinator,
                          action: #selector(WebAppView.Coordinator.handleRefresh(_:)),
                          for: .valueChanged)
        webView.scrollView.refreshControl = refresh

        model.webView = webView
        webView.load(URLRequest(url: AppConfig.appURL))

        // A token can arrive before the page is ready or long after it loaded;
        // both paths funnel through the coordinator, which no-ops until the
        // page exposes window.SureTakipPush.
        PushCenter.shared.onToken = { [weak coordinator, weak webView] token in
            guard let coordinator, let webView else { return }
            coordinator.deliverPushToken(token, to: webView)
        }
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(Color.appBackground)

        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
    }
}

struct WebAppView: UIViewControllerRepresentable {
    @ObservedObject var model: WebAppModel

    func makeCoordinator() -> Coordinator { Coordinator(model: model) }

    func makeUIViewController(context: Context) -> WebViewController {
        WebViewController(model: model, coordinator: context.coordinator)
    }

    func updateUIViewController(_ controller: WebViewController, context: Context) {}

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
                },
                updateWidget: function (json) {
                    window.webkit.messageHandlers.updateWidget.postMessage(json);
                }
            };
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )

        /// Passes the FCM token into the page, which registers it against the
        /// signed-in user. Silently does nothing until the page is ready - it
        /// is re-sent on every `didFinish`.
        func deliverPushToken(_ token: String, to webView: WKWebView) {
            let escaped = token.replacingOccurrences(of: "\\", with: "\\\\")
                               .replacingOccurrences(of: "'", with: "\\'")
            let device = UIDevice.current.name.replacingOccurrences(of: "'", with: "\\'")
            webView.evaluateJavaScript("""
                if (window.SureTakipPush && window.SureTakipPush.onToken) {
                    window.SureTakipPush.onToken('\(escaped)', '\(device)');
                }
                """, completionHandler: nil)
        }

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

            // Re-send on every load: a reload wipes window.SureTakipPush, and
            // the token usually predates the first page load anyway.
            if let token = PushCenter.shared.token {
                deliverPushToken(token, to: webView)
            }
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
            // Deadline summary for the app badge (and, later, the widget).
            if message.name == "updateWidget" {
                if let json = message.body as? String {
                    WidgetStore.saveSnapshot(json: json)
                }
                return
            }

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
