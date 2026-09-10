// Loads a URL in a REAL WKWebView (Safari's engine, not Chrome's) and evaluates one JavaScript
// file in it, printing whatever that file returns. Two arguments, both required:
//
//     swiftc -O probe.swift -o probe          # needs only the Command Line Tools
//     ./probe http://localhost:4318/ measure-text-scale.js
//
// It exists because Chrome cannot answer WebKit questions, and this repo shipped two wrong
// diagnoses of the same iOS text bug for exactly that reason. See README.md.
//
// The window is created and laid out for real (390x844, iPhone-ish) rather than offscreen:
// WebKit skips work in subtrees it thinks nobody can see, and text sizing is one of the things
// it skips.
import Cocoa
import WebKit

final class Handler: NSObject, WKNavigationDelegate {
    var done = false
    var script = ""
    func webView(_ w: WKWebView, didFinish n: WKNavigation!) {
        // The app is a SPA: didFinish fires on the shell, before React has mounted anything.
        // Two seconds is enough for the auth gate to render on this machine. If a probe starts
        // reporting elements as absent that you can see in Safari, raise this before assuming
        // the elements are missing.
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            w.evaluateJavaScript(self.script) { r, e in
                if let s = r as? String { print(s) } else { print("ERR \(String(describing: e))") }
                self.done = true
            }
        }
    }
}

let url = URL(string: CommandLine.arguments[1])!
let script = try! String(contentsOfFile: CommandLine.arguments[2], encoding: .utf8)
let wv = WKWebView(frame: NSRect(x: 0, y: 0, width: 390, height: 844), configuration: WKWebViewConfiguration())
let h = Handler(); h.script = script
wv.navigationDelegate = h
let win = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 390, height: 844),
                   styleMask: [.titled], backing: .buffered, defer: false)
win.contentView = wv
wv.load(URLRequest(url: url))
let deadline = Date().addingTimeInterval(40)
while !h.done && Date() < deadline {
    RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.05))
}
if !h.done { print("TIMEOUT") }
