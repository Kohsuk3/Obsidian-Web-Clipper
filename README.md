# 🖥️ Obsidian Web Clipper

### *ウェブページをObsidian用のMarkdownファイルに変換するChrome拡張機能*

[![Version](https://img.shields.io/badge/version-v2.2-brightgreen.svg?style=for-the-badge)](https://github.com/Kohsuk3/Obsidian-Web-Clipper/releases)
[![Chrome](https://img.shields.io/badge/Chrome-88+-4285F4.svg?style=for-the-badge&logo=google-chrome)](https://chrome.google.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](LICENSE)

**📝 ウェブページをクリーンなMarkdownファイルとして保存し、Obsidianで活用できます**

[📥 最新版をダウンロード](https://github.com/Kohsuk3/Obsidian-Web-Clipper/releases/latest) • [🐛 不具合報告](https://github.com/Kohsuk3/Obsidian-Web-Clipper/issues)

---

## ✨ 主な機能

### 🧠 スマートコンテンツ抽出
- **アルゴリズミック解析**: HTML構造とクラス名を分析してメインコンテンツを特定
- **ノイズ除去**: ナビゲーション、広告、コメントなどの不要な要素を自動で除去
- **サイト最適化**: Zenn、GitHub、Medium、Qiitaなどの主要サイトに対応

### 🖼️ 画像処理
- **統一サイズ**: 全ての画像を680px幅に統一してObsidianでの表示を最適化
- **URL保持**: 外部リンクとして画像URLを維持
- **Obsidian記法**: `![alt|680](url)` 形式で出力

### 📊 構造保持
- **テーブル**: ヘッダーやセル内容を適切に変換
- **コードブロック**: 言語情報を保持した状態で変換
- **リスト**: ネスト構造や番号付きリストに対応

### 🔧 使いやすさ
- **プレビュー機能**: 保存前に変換結果を確認可能
- **フォーマット選択**: Clean版（推奨）とRaw版を選択可能
- **日本語対応**: UIとエラーメッセージが日本語

---

## 🚀 インストール方法

### 手動インストール
1. [最新リリース](https://github.com/Kohsuk3/Obsidian-Web-Clipper/releases/latest)をダウンロード
2. Chromeで `chrome://extensions` を開く
3. 右上の「デベロッパーモード」をオンにする
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. ダウンロードして解凍したフォルダを選択

---

## 📖 使用方法

### 基本的な使い方
1. 保存したいウェブページで拡張機能アイコンをクリック
2. 設定を選択:
   - ✅ **スマートクリーンアップ** (推奨): メインコンテンツのみを抽出
   - 🖼️ **小さな画像を除去**: アイコンやアバターを除去
   - 🔗 **ナビゲーションリンクを除去**: 記事内容に関係ないリンクを除去
3. **プレビュー** ボタンで結果を事前確認（オプション）
4. **Save to Markdown** で保存
5. 保存先を選択

### 出力形式

```markdown
---
title: "記事タイトル"
url: "https://example.com/article"
date: 2024-01-15T10:30:00.000Z
---

# 記事タイトル

![画像|680](https://example.com/image.jpg)

記事の本文がクリーンに抽出されます。
```

**コードブロックも適切に保持:**
```javascript
function example() {
  return "hello world";
}
```

**テーブルも正しく変換:**

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| データ1 | データ2 | データ3 |

---

## 🌟 対応サイト

### 最適化済みサイト
[![Zenn](https://img.shields.io/badge/Zenn-3EA8FF.svg?style=for-the-badge&logo=zenn&logoColor=white)](https://zenn.dev)
[![GitHub](https://img.shields.io/badge/GitHub-181717.svg?style=for-the-badge&logo=github&logoColor=white)](https://github.com)
[![Qiita](https://img.shields.io/badge/Qiita-55C500.svg?style=for-the-badge&logo=qiita&logoColor=white)](https://qiita.com)
[![Medium](https://img.shields.io/badge/Medium-12100E.svg?style=for-the-badge&logo=medium&logoColor=white)](https://medium.com)

### 汎用対応
その他のウェブサイト全般でも利用可能です。

---

## 🔧 技術仕様

- **Chrome Extension Manifest V3** 対応
- **セキュリティ**: サンドボックス化されたコンテンツ抽出
- **互換性**: Chrome 88+, Edge 88+
- **ライブラリ**: Turndown.js（HTML→Markdown変換）

### アーキテクチャ
```
┌─────────────────────────────────────┐
│          ブラウザ拡張機能            │
├─────────────────────────────────────┤
│  🧠 コンテンツ解析エンジン           │
│  ├── HTML構造解析                  │
│  ├── 要素スコアリング              │
│  └── ノイズフィルタリング          │
├─────────────────────────────────────┤
│  🔄 変換パイプライン                │
│  ├── コンテンツ抽出                │
│  ├── Markdown変換                 │
│  └── YAML生成                     │
├─────────────────────────────────────┤
│  💾 出力エンジン                    │
│  ├── Chrome Downloads API        │
│  └── エラーハンドリング            │
└─────────────────────────────────────┘
```

---

## 🤝 コントリビューション

プロジェクトへの貢献を歓迎します！

```bash
# 開発環境のセットアップ
git clone https://github.com/Kohsuk3/Obsidian-Web-Clipper.git
cd Obsidian-Web-Clipper
# Chromeで拡張機能として読み込み
```

### 改善案
- 🌐 追加サイトの最適化
- 🎨 UI/UX改善
- 🔧 フィルタリングオプションの追加
- 📱 モバイルブラウザ対応

---

## 📄 ライセンス

MIT License - 個人・商用利用ともに無料

**Obsidianコミュニティによって開発されています**

---

## 🎯 よくある質問

**Q: 画像はローカルに保存されますか？**
A: いいえ、画像は外部URLとして保持されます。

**Q: どのような形式で保存されますか？**
A: Markdownファイル（.md）として保存され、YAMLフロントマターが含まれます。

**Q: すべてのウェブサイトで動作しますか？**
A: ほとんどのウェブサイトで動作しますが、一部制限があるサイト（chrome://など）では利用できません。

**Q: プライベートな情報は送信されますか？**
A: いいえ、すべての処理はローカルで実行され、外部サーバーにデータは送信されません。

---

[⭐ このリポジトリにスターを付ける](https://github.com/Kohsuk3/Obsidian-Web-Clipper) • [🍴 フォークする](https://github.com/Kohsuk3/Obsidian-Web-Clipper/fork)