// ステータス表示を管理する関数
function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${isError ? 'error' : 'success'}`;
}

// ファイル名をサニタイズする関数
function sanitizeFileName(text) {
  return text
    .replace(/[<>:"|?*]/g, '-') // 禁止文字を置換（\は除外）
    .replace(/\s+/g, '-')       // スペースをハイフンに
    .replace(/-+/g, '-')        // 連続するハイフンを単一に
    .replace(/^-|-$/g, '')      // 先頭と末尾のハイフンを削除
    .substring(0, 100);         // 長さを制限
}

// ファイル名を生成する関数
function generateFileName(title) {
  const date = new Date().toISOString().split('T')[0];
  const sanitizedTitle = sanitizeFileName(title);
  return `${sanitizedTitle}-${date}.md`;
}

// HTMLコンテンツを取得する関数
async function getPageContent(cleanContentEnabled = true, filterSmallImages = true, filterNavigationLinks = true) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.id) {
      throw new Error('アクティブなタブが見つかりません');
    }
    
    // タブがアクセス可能かチェック
    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('edge://') || tab.url?.startsWith('moz-extension://')) {
      throw new Error('このページはアクセスできません（ブラウザの内部ページ）');
    }
    
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [cleanContentEnabled, filterSmallImages, filterNavigationLinks],
      function: (cleanContentEnabled, filterSmallImages, filterNavigationLinks) => {
        // グローバル変数として設定を渡す
        window.cleanContentEnabled = cleanContentEnabled;
        window.filterSmallImages = filterSmallImages;
        window.filterNavigationLinks = filterNavigationLinks;
        // YAMLの値を安全にエスケープする関数
        const escapeYAMLValue = (value) => {
          if (typeof value !== 'string') return value;
          // コロン、引用符、改行、特殊文字が含まれる場合は引用符で囲む
          if (/[:\n\r"'\\]/.test(value) || value.includes(' #') || value.startsWith(' ') || value.endsWith(' ')) {
            return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`;
          }
          return value;
        };

        // メタデータを含むYAMLフロントマターを作成
        const frontMatter = [
          '---',
          `title: ${escapeYAMLValue(document.title)}`,
          `url: ${escapeYAMLValue(window.location.href)}`,
          `date: ${new Date().toISOString()}`,
          '---',
          '',
          ''  // 空行を追加してフロントマターとコンテンツを分離
        ].join('\n');

        // Notionレベルのスマートコンテンツ抽出アルゴリズム
        const extractSmartContent = (element) => {
          // クローンを作成して元のDOMを変更しない
          const clonedElement = element.cloneNode(true);
          
          // 1. まずコンテンツスコアリングを実行
          const scoredElements = scoreContentElements(clonedElement);
          
          // 2. 最適なコンテンツ領域を特定
          const mainContentArea = findMainContentArea(scoredElements, clonedElement);
          
          // 3. 特定された領域をクリーンアップ
          return cleanContent(mainContentArea || clonedElement);
        };

        // コンテンツ要素にスコアを付与する関数（Notion式アルゴリズム）
        const scoreContentElements = (root) => {
          const scored = new Map();
          const allElements = root.querySelectorAll('*');
          
          allElements.forEach(element => {
            let score = 0;
            const text = element.textContent?.trim() || '';
            const tagName = element.tagName.toLowerCase();
            
            // 基本スコア：テキスト量に基づく
            score += Math.min(text.length / 100, 50);
            
            // 構造的価値スコア
            if (['article', 'main', 'section'].includes(tagName)) score += 20;
            if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) score += 10;
            if (['p', 'div', 'span'].includes(tagName) && text.length > 50) score += 5;
            if (['ul', 'ol', 'li'].includes(tagName)) score += 8;
            if (['table', 'thead', 'tbody', 'tr', 'td'].includes(tagName)) score += 8;
            if (['pre', 'code'].includes(tagName)) score += 15;
            
            // クラス名・ID による価値判定
            const classAndId = (element.className + ' ' + (element.id || '')).toLowerCase();
            if (/content|article|post|entry|main|primary/.test(classAndId)) score += 25;
            if (/body|text|story|description/.test(classAndId)) score += 15;
            if (/title|heading|header/.test(classAndId)) score += 10;
            
            // マイナススコア：ノイズ要素
            if (/nav|menu|sidebar|footer|header|ad|comment|social|share|related/.test(classAndId)) score -= 30;
            if (/button|btn|icon|avatar|badge|tag/.test(classAndId)) score -= 20;
            if (element.querySelectorAll('a').length > element.querySelectorAll('p').length) score -= 10;
            
            // 画像の適切性チェック
            const images = element.querySelectorAll('img');
            images.forEach(img => {
              const width = parseInt(img.width) || 0;
              const height = parseInt(img.height) || 0;
              const src = img.src || '';
              const alt = img.alt || '';
              
              if (width > 200 || height > 200) score += 8; // 大きな画像は価値が高い
              if (width < 50 && height < 50) score -= 5; // 小さな画像（アイコン等）
              if (/avatar|icon|logo|badge/.test(src + alt)) score -= 8;
              if (/content|article|illustration/.test(src + alt)) score += 5;
            });
            
            // リンク密度チェック（リンクが多すぎる要素はナビゲーション）
            const links = element.querySelectorAll('a');
            const linkDensity = links.length / Math.max(text.length / 100, 1);
            if (linkDensity > 0.3) score -= 15;
            
            scored.set(element, Math.max(score, 0));
          });
          
          return scored;
        };

        // メインコンテンツエリアを特定する関数
        const findMainContentArea = (scoredElements, root) => {
          let bestElement = null;
          let bestScore = 0;
          
          // 各要素とその子要素のスコア合計を計算
          scoredElements.forEach((score, element) => {
            const children = element.querySelectorAll('*');
            let totalScore = score;
            
            children.forEach(child => {
              totalScore += (scoredElements.get(child) || 0) * 0.3; // 子要素は30%の重み
            });
            
            // 要素のサイズも考慮（あまりに小さい要素は除外）
            const rect = element.getBoundingClientRect?.() || { width: 100, height: 100 };
            if (rect.width < 200 || rect.height < 100) totalScore *= 0.5;
            
            if (totalScore > bestScore) {
              bestScore = totalScore;
              bestElement = element;
            }
          });
          
          return bestElement;
        };

        // コンテンツをクリーンアップする関数（従来版を改良）
        const cleanContent = (element) => {
          // クローンを作成して元のDOMを変更しない
          const clonedElement = element.cloneNode(true);
          
          // 不要な要素を削除するセレクタ
          const unwantedSelectors = [
            // ナビゲーション要素
            'nav', '.nav', '.navigation', '.navbar', '.menu',
            'header', '.header', 'footer', '.footer',
            
            // ユーザー情報・プロフィール
            '.avatar', '.profile', '.user-info', '.author-info',
            '.user-card', '.profile-card',
            
            // UI要素・ボタン
            '.btn', '.button', 'button:not([type="submit"])',
            '.share', '.social', '.social-share', '.sns',
            '.like', '.favorite', '.bookmark',
            
            // 広告・サイドバー
            '.ad', '.ads', '.advertisement', '.sidebar', '.aside',
            '.related', '.recommendation', '.suggested',
            
            // コメント・フィードバック
            '.comment', '.comments', '.discussion', '.feedback',
            '.review', '.rating',
            
            // メタ情報
            '.meta', '.metadata', '.tags', '.tag-list',
            '.breadcrumb', '.pagination',
            
            // サイト特有の要素
            '.zenn-', '[class*="zenn"]', '[data-zenn]',
            // GitHub
            '.js-', '.octicon', '.Header', '.Footer',
            // Medium  
            '.js-', '[data-module]', '.u-', '.footer',
            // Qiita
            '.js-', '[data-hyperapp]', '.p-header', '.p-footer',
            
            // その他のノイズ
            '.notification', '.alert', '.banner', '.popup',
            '.overlay', '.modal', '.tooltip',
            'script', 'style', 'noscript',
            
            // 小さすぎる画像（アイコン等）
            'img[width="1"]', 'img[height="1"]',
            'img[width*="16"]', 'img[height*="16"]',
            'img[width*="24"]', 'img[height*="24"]',
            'img[width*="32"]', 'img[height*="32"]',
            'img[width*="48"]', 'img[height*="48"]',
            'img[width*="64"]', 'img[height*="64"]',
            'img[src*="icon"]', 'img[alt*="icon"]'
          ];
          
          // 各セレクタに該当する要素を削除
          unwantedSelectors.forEach(selector => {
            const elements = clonedElement.querySelectorAll(selector);
            elements.forEach(el => el.remove());
          });
          
          // 100x100未満の画像を除去（設定に応じて）
          if (window.filterSmallImages) {
            const smallImages = clonedElement.querySelectorAll('img');
            smallImages.forEach(img => {
            const width = parseInt(img.width) || parseInt(img.getAttribute('width')) || 
                         parseInt(getComputedStyle(img).width) || 0;
            const height = parseInt(img.height) || parseInt(img.getAttribute('height')) || 
                          parseInt(getComputedStyle(img).height) || 0;
            
            // サイズが取得できた場合の判定
            if ((width > 0 && width < 100) || (height > 0 && height < 100)) {
              img.remove();
              return;
            }
            
            // naturalWidth/naturalHeightによる判定（実際の画像サイズ）
            if (img.naturalWidth && img.naturalHeight) {
              if (img.naturalWidth < 100 || img.naturalHeight < 100) {
                img.remove();
                return;
              }
            }
            
            // srcに明らかなアイコン指標が含まれる場合
            const src = img.src?.toLowerCase() || '';
            const alt = img.alt?.toLowerCase() || '';
            if (src.includes('avatar') || src.includes('logo') || src.includes('icon') || 
                alt.includes('avatar') || alt.includes('logo') || alt.includes('icon')) {
              img.remove();
            }
            });
          }
          
          // コンテンツに関連性の低いリンクを除去（設定に応じて）
          if (window.filterNavigationLinks) {
            const links = clonedElement.querySelectorAll('a');
            links.forEach(link => {
            const text = link.textContent.trim();
            const href = link.href || '';
            const className = link.className.toLowerCase();
            
            // 短すぎるリンクテキスト（ナビゲーション系）
            if (text.length < 3) {
              link.replaceWith(...link.childNodes);
              return;
            }
            
            // ナビゲーション系クラス名
            if (/nav|menu|button|btn|tag|category|author|profile/.test(className)) {
              link.replaceWith(...link.childNodes);
              return;
            }
            
            // 明らかなナビゲーション文言
            if (/^(home|戻る|次へ|前へ|top|menu|nav|share|tweet|facebook|line)$/i.test(text)) {
              link.replaceWith(...link.childNodes);
              return;
            }
            
            // 記事内の参考リンクは保持（長めのテキストまたは文章中）
            if (text.length > 10 || link.closest('p, li, blockquote')) {
              // そのまま保持
              return;
            }
            
            // その他の短いリンクはテキストのみ残す
            if (text.length < 20) {
              link.replaceWith(...link.childNodes);
            }
            });
          }
          
          
          // 空の要素を削除
          const emptyElements = clonedElement.querySelectorAll('div:empty, span:empty, p:empty');
          emptyElements.forEach(el => el.remove());
          
          // テキストのみの小さなdiv（おそらくUI要素）を削除
          const textOnlyDivs = clonedElement.querySelectorAll('div');
          textOnlyDivs.forEach(div => {
            const text = div.textContent.trim();
            if (text.length < 10 && !div.querySelector('h1, h2, h3, h4, h5, h6, p, li, img, code, pre')) {
              div.remove();
            }
          });
          
          // 内容が空すぎる場合は元の要素を返す
          const finalContent = clonedElement.innerHTML;
          const textLength = clonedElement.textContent?.trim()?.length || 0;
          
          if (textLength < 100) {
            console.warn('Filtered content too short, returning original');
            return element.innerHTML;
          }
          
          return finalContent;
        };

        // 本文のコンテンツを取得（優先順位付きで検索）
        let mainContent = '';
        
        // 最も適切なコンテンツエリアを優先順位順に検索
        const contentSelectors = [
          // 記事コンテンツ
          'article[role="main"]', 'main article', '.article-content', '.post-content',
          '.entry-content', '.content-main', '.main-content',
          
          // メインエリア
          'main', '[role="main"]', '#main', '#main-content',
          
          // 一般的なコンテンツエリア
          '.content', '#content', '.post', '.entry',
          
          // Zenn特有
          '.markdown-body', '.zenn-markdown'
        ];
        
        let contentElement = null;
        for (const selector of contentSelectors) {
          contentElement = document.querySelector(selector);
          if (contentElement) break;
        }
        
        if (contentElement) {
          // ユーザーの設定に応じて処理を適用
          if (window.cleanContentEnabled) {
            try {
              mainContent = extractSmartContent(contentElement);
            } catch (extractError) {
              console.error('Smart content extraction failed:', extractError);
              mainContent = contentElement.innerHTML;
            }
          } else {
            mainContent = contentElement.innerHTML;
          }
        } else {
          // フォールバック: body全体にスマート抽出を適用
          if (window.cleanContentEnabled) {
            try {
              mainContent = extractSmartContent(document.body);
            } catch (extractError) {
              console.error('Smart content extraction failed on body:', extractError);
              mainContent = document.body.innerHTML;
            }
          } else {
            mainContent = document.body.innerHTML;
          }
        }
        
        // 最終的な安全チェック
        if (!mainContent || mainContent.trim() === '') {
          console.warn('No content extracted, falling back to body');
          mainContent = document.body.innerHTML;
        }

        console.log('Final content length:', mainContent?.length || 0);
        console.log('Page title:', document.title);
        
        const result = {
          title: document.title,
          content: mainContent,
          frontMatter: frontMatter,
          url: window.location.href
        };
        
        console.log('Returning result:', result);
        return result;
      }
    });

    console.log('Script execution result:', result);
    
    if (!result || !result[0] || !result[0].result) {
      throw new Error('Script execution returned no result');
    }
    
    return result[0].result;
  } catch (error) {
    console.error('Error getting page content:', error);
    if (error.message.includes('Cannot access')) {
      throw new Error('このページにはアクセスできません。拡張機能の権限が不足しています。');
    } else if (error.message.includes('アクティブなタブ') || error.message.includes('ブラウザの内部ページ')) {
      throw error;
    } else {
      throw new Error(`ページ内容の取得に失敗しました: ${error.message}。ページを再読み込みしてください。`);
    }
  }
}

// HTMLをMarkdownに変換する関数
function convertToMarkdown(html, frontMatter) {
  try {
    if (typeof TurndownService !== 'function') {
      throw new Error('Turndownライブラリが読み込まれていません。ページを再読み込みしてください。');
    }
    
    if (!html || html.trim() === '') {
      throw new Error('変換するHTMLコンテンツがありません。');
    }

    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*'
    });

    // コードブロックの保持（preタグとcodeタグの両方に対応）
    turndownService.addRule('codeBlocks', {
      filter: ['pre'],
      replacement: function(content, node) {
        const codeElement = node.querySelector('code');
        const code = (codeElement || node).textContent || (codeElement || node).innerText || '';
        
        // 言語名の抽出（複数のパターンに対応）
        let language = '';
        if (codeElement) {
          const classList = Array.from(codeElement.classList || []);
          const langClass = classList.find(cls => cls.startsWith('language-') || cls.startsWith('lang-'));
          if (langClass) {
            language = langClass.replace(/^(language-|lang-)/, '');
          }
        }
        
        // data-lang属性からも言語名を取得
        if (!language && (node.dataset?.lang || codeElement?.dataset?.lang)) {
          language = node.dataset?.lang || codeElement?.dataset?.lang || '';
        }
        
        return `\n\`\`\`${language}\n${code}\n\`\`\`\n`;
      }
    });

    // 画像の処理（altテキストとサイズ情報を保持）
    turndownService.addRule('images', {
      filter: ['img'],
      replacement: function(content, node) {
        const alt = node.alt || '';
        const src = node.src || '';
        const title = node.title || '';
        
        // Obsidianの画像サイズ指定記法に対応（全て680pxに統一）
        let sizeAttr = '|680';
        
        // タイトル属性がある場合の処理
        const titlePart = title ? ` "${title}"` : '';
        
        return `![${alt}${sizeAttr}](${src}${titlePart})`;
      }
    });

    // テーブルの高度な処理
    turndownService.addRule('tables', {
      filter: ['table'],
      replacement: function(content, node) {
        const rows = Array.from(node.querySelectorAll('tr'));
        if (rows.length === 0) return '';
        
        const tableData = [];
        let hasHeader = false;
        
        rows.forEach((row, index) => {
          const cells = Array.from(row.querySelectorAll('td, th'));
          const rowData = cells.map(cell => {
            let cellText = cell.textContent.trim();
            // セル内の改行を適切に処理
            cellText = cellText.replace(/\n/g, '<br>');
            // パイプ文字をエスケープ
            cellText = cellText.replace(/\|/g, '\\|');
            return cellText;
          });
          
          if (row.querySelector('th')) {
            hasHeader = true;
          }
          
          tableData.push(rowData);
        });
        
        if (tableData.length === 0) return '';
        
        let markdown = '\n';
        
        // ヘッダー行
        if (hasHeader && tableData.length > 0) {
          markdown += '| ' + tableData[0].join(' | ') + ' |\n';
          markdown += '|' + tableData[0].map(() => ' --- ').join('|') + '|\n';
          
          // データ行
          for (let i = 1; i < tableData.length; i++) {
            markdown += '| ' + tableData[i].join(' | ') + ' |\n';
          }
        } else {
          // ヘッダーなしの場合
          tableData.forEach(row => {
            markdown += '| ' + row.join(' | ') + ' |\n';
          });
        }
        
        return markdown + '\n';
      }
    });
    
    const markdown = turndownService.turndown(html);
    return `${frontMatter}${markdown}`;
  } catch (error) {
    console.error('Markdown conversion error:', error);
    if (error.message.includes('Turndownライブラリ') || error.message.includes('変換するHTML')) {
      throw error;
    } else {
      throw new Error(`Markdown変換に失敗しました: ${error.message}`);
    }
  }
}

// ファイルを保存する関数
async function saveFile(content, filename) {
  let objectUrl = null;
  
  try {
    // Blobを作成
    const blob = new Blob([content], { type: 'text/markdown' });
    objectUrl = URL.createObjectURL(blob);

    // ダウンロードを実行（ユーザーに保存先を選択させる）
    const downloadId = await chrome.downloads.download({
      url: objectUrl,
      filename: filename,
      saveAs: true,  // 保存ダイアログを表示
      conflictAction: 'uniquify'
    });

    // ダウンロードの完了を待機
    await new Promise((resolve, reject) => {
      let timeoutId = setTimeout(() => {
        chrome.downloads.onChanged.removeListener(listener);
        reject(new Error('Download timed out'));
      }, 30000);  // 30秒タイムアウト

      function listener(delta) {
        if (delta.id === downloadId) {
          if (delta.state?.current === 'complete') {
            clearTimeout(timeoutId);
            chrome.downloads.onChanged.removeListener(listener);
            resolve();
          } else if (delta.state?.current === 'interrupted') {
            clearTimeout(timeoutId);
            chrome.downloads.onChanged.removeListener(listener);
            // ユーザーキャンセルの場合
            if (delta.error?.current === 'USER_CANCELED') {
              reject(new Error('USER_CANCELED'));
            } else {
              reject(new Error(`Download failed: ${delta.error?.current || 'interrupted'}`));
            }
          } else if (delta.error) {
            clearTimeout(timeoutId);
            chrome.downloads.onChanged.removeListener(listener);
            reject(new Error(`Download failed: ${delta.error.current}`));
          }
        }
      }

      chrome.downloads.onChanged.addListener(listener);
    });

    showStatus('File saved successfully! 🎉');
    return true;
  } catch (error) {
    console.error('Error saving file:', error);
    if (error.message === 'USER_CANCELED') {
      throw new Error('CANCELED');
    } else if (error.message.includes('Invalid filename')) {
      throw new Error('ファイル名に無効な文字が含まれています。もう一度お試しください。');
    } else if (error.message.includes('Download failed')) {
      throw new Error('ファイルのダウンロードに失敗しました。ブラウザの設定を確認してください。');
    } else if (error.message.includes('timed out')) {
      throw new Error('ダウンロードがタイムアウトしました。もう一度お試しください。');
    } else {
      throw new Error(`ファイル保存に失敗しました: ${error.message}`);
    }
  } finally {
    // Blobのメモリを解放
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

// メイン処理
document.addEventListener('DOMContentLoaded', () => {
  // プレビューボタンのクリックイベント
  document.getElementById('previewButton').addEventListener('click', async () => {
    const previewButton = document.getElementById('previewButton');
    const previewDiv = document.getElementById('preview');
    
    previewButton.disabled = true;
    
    try {
      showStatus('Generating preview...');
      
      // フォーマット設定を取得
      const formatRadio = document.querySelector('input[name="format"]:checked');
      const format = formatRadio ? formatRadio.value : 'clean';
      const cleanContentEnabled = format === 'clean';
      
      // フィルタリング設定を取得
      const filterSmallImages = document.getElementById('filterSmallImages').checked;
      const filterNavigationLinks = document.getElementById('filterNavigationLinks').checked;
      
      const pageData = await getPageContent(cleanContentEnabled, filterSmallImages, filterNavigationLinks);
      
      if (!pageData || !pageData.content) {
        throw new Error('Failed to extract page content. Please try again or check if the page is accessible.');
      }
      
      const markdown = convertToMarkdown(pageData.content, pageData.frontMatter);
      
      // プレビューを表示
      previewDiv.textContent = markdown.substring(0, 2000) + (markdown.length > 2000 ? '\n...(truncated)' : '');
      previewDiv.classList.remove('hidden');
      
      showStatus('Preview generated successfully! 👀');
    } catch (error) {
      console.error('Error generating preview:', error);
      showStatus(`Preview error: ${error.message}`, true);
    } finally {
      previewButton.disabled = false;
    }
  });

  // ボタンのクリックイベントを設定
  document.getElementById('saveButton').addEventListener('click', async () => {
    const button = document.getElementById('saveButton');
    button.disabled = true;

    try {
      showStatus('Getting page content...');
      
      // フォーマット設定を取得
      const formatRadio = document.querySelector('input[name="format"]:checked');
      const format = formatRadio ? formatRadio.value : 'clean';
      const cleanContentEnabled = format === 'clean';
      
      // フィルタリング設定を取得
      const filterSmallImages = document.getElementById('filterSmallImages').checked;
      const filterNavigationLinks = document.getElementById('filterNavigationLinks').checked;
      
      const pageData = await getPageContent(cleanContentEnabled, filterSmallImages, filterNavigationLinks);
      
      if (!pageData || !pageData.content) {
        throw new Error('Failed to extract page content. Please try again or check if the page is accessible.');
      }
      
      showStatus('Converting to Markdown...');
      const markdown = convertToMarkdown(pageData.content, pageData.frontMatter);
      
      showStatus('Choose where to save the file...');
      const suffix = format === 'raw' ? '-raw' : '';
      const fileName = generateFileName(pageData.title).replace('.md', `${suffix}.md`);
      await saveFile(markdown, fileName);
    } catch (error) {
      console.error('Error saving file:', error);
      if (error.message === 'CANCELED') {
        showStatus('Save cancelled');
      } else {
        showStatus(`Error: ${error.message}`, true);
      }
    } finally {
      button.disabled = false;
    }
  });
});
