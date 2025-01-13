# 🔖 Obsidian Web Clipper

<div align="center">

![Obsidian Web Clipper](https://img.shields.io/badge/Platform-Chrome-brightgreen)
![Version](https://img.shields.io/badge/Version-1.0-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

**ウェブページを簡単にObsidianのMarkdownファイルとして保存できるChrome拡張機能**

[インストール方法](#インストール方法) • [使い方](#使い方) • [機能](#機能) • [開発](#開発)

</div>

## ✨ 特徴

- 🚀 ワンクリックでウェブページをMarkdownに変換
- 📝 YAMLフロントマターによるメタデータ保存
- 🎨 コードブロックと画像情報を保持
- 📋 主要なコンテンツを自動抽出
- 🔒 安全なローカルファイル保存

## 🛠 インストール方法

1. このリポジトリをクローンまたはダウンロード
```bash
git clone https://github.com/yourusername/obsidian-web-clipper.git
```

2. Chrome拡張機能の管理ページを開く
   - Chrome で `chrome://extensions/` を開く
   - または メニュー → その他のツール → 拡張機能

3. デベロッパーモードを有効化（右上のトグルスイッチ）

4. 「パッケージ化されていない拡張機能を読み込む」をクリック

5. ダウンロードした `obsidian-web-clipper` フォルダを選択

## 📝 使い方

1. 保存したいウェブページを開く

2. Chrome拡張機能バーのObsidian Web Clipperアイコンをクリック

3. 「Save to Obsidian」ボタンをクリック

4. 保存先を選択して保存

## 🎯 機能

### Markdownへの変換
- 見出し、リスト、リンクなどの基本的なMarkdown要素をサポート
- コードブロックの言語情報を保持
- 画像のalt属性とサイズ情報を保持

### メタデータ
自動的に以下の情報をYAMLフロントマターとして保存：
```yaml
---
title: ページタイトル
url: https://example.com
date: 2024-01-01T12:00:00.000Z
---
```

### コンテンツ抽出
- main要素やarticle要素から主要コンテンツを自動抽出
- 適切な要素が見つからない場合はページ全体を保存

## 🔧 開発

### 技術スタック
- Chrome Extension Manifest V3
- JavaScript (ES6+)
- Turndown (HTML to Markdown)

### プロジェクト構造
```
obsidian-web-clipper/
├── manifest.json      # 拡張機能の設定
├── popup.html        # ポップアップUI
├── popup.js         # メイン処理
├── content.js       # コンテンツスクリプト
└── turndown.js      # Markdown変換ライブラリ
```

### ビルド方法
```bash
cd obsidian-web-clipper
npm install
```

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 🤝 コントリビューション

プルリクエストは大歓迎です！以下の手順で貢献できます：

1. このリポジトリをフォーク
2. 新しいブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチをプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📮 フィードバック

バグを見つけた場合や新機能のリクエストがある場合は、Issueを作成してください。
