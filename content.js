// このファイルは将来的な機能拡張のために用意されています
// 現在は、popup.jsからの直接的なDOM操作で十分なため、
// 最小限の実装となっています

console.log('Obsidian Web Clipper: Content script loaded');

// メッセージリスナーを設定（将来的な機能拡張用）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    sendResponse({
      title: document.title,
      content: document.documentElement.outerHTML
    });
  }
});
