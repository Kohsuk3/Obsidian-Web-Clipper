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
async function getPageContent() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        // メタデータを含むYAMLフロントマターを作成
        const frontMatter = [
          '---',
          `title: ${document.title}`,
          `url: ${window.location.href}`,
          `date: ${new Date().toISOString()}`,
          '---',
          '',
          ''  // 空行を追加してフロントマターとコンテンツを分離
        ].join('\n');

        // 本文のコンテンツを取得（主にmain要素やarticle要素から）
        let mainContent = '';
        const mainElement = document.querySelector('main, article, .main-content, #main-content');
        if (mainElement) {
          mainContent = mainElement.innerHTML;
        } else {
          // 主要なコンテンツ領域が見つからない場合は、body全体を使用
          mainContent = document.body.innerHTML;
        }

        return {
          title: document.title,
          content: mainContent,
          frontMatter: frontMatter,
          url: window.location.href
        };
      }
    });

    return result[0].result;
  } catch (error) {
    console.error('Error getting page content:', error);
    throw new Error('Failed to get page content');
  }
}

// HTMLをMarkdownに変換する関数
function convertToMarkdown(html, frontMatter) {
  try {
    if (typeof TurndownService !== 'function') {
      throw new Error('TurndownService is not loaded');
    }

    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*'
    });

    // コードブロックの保持
    turndownService.addRule('pre', {
      filter: ['pre'],
      replacement: function(content, node) {
        const code = node.textContent || node.innerText;
        const language = node.querySelector('code')?.className?.replace('language-', '') || '';
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
        const width = node.width ? ` width="${node.width}"` : '';
        const height = node.height ? ` height="${node.height}"` : '';
        
        let titlePart = title ? ` "${title}"` : '';
        let sizePart = (width || height) ? ` =${width}${height}` : '';
        
        return `![${alt}](${src}${titlePart}${sizePart})`;
      }
    });

    const markdown = turndownService.turndown(html);
    return `${frontMatter}${markdown}`;
  } catch (error) {
    console.error('Markdown conversion error:', error);
    throw new Error(`Failed to convert HTML to Markdown: ${error.message}`);
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
    if (error.message.includes('Invalid filename')) {
      throw new Error('Invalid characters in filename. Please try again.');
    }
    throw error;
  } finally {
    // Blobのメモリを解放
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

// メイン処理
document.addEventListener('DOMContentLoaded', () => {
  // ボタンのクリックイベントを設定
  document.getElementById('saveButton').addEventListener('click', async () => {
    const button = document.getElementById('saveButton');
    button.disabled = true;

    try {
      showStatus('Getting page content...');
      const pageData = await getPageContent();
      
      showStatus('Converting to Markdown...');
      const markdown = convertToMarkdown(pageData.content, pageData.frontMatter);
      
      showStatus('Choose where to save the file...');
      const fileName = generateFileName(pageData.title);
      await saveFile(markdown, fileName);
    } catch (error) {
      console.error('Error saving file:', error);
      showStatus(
        error.name === 'AbortError' 
          ? 'Save cancelled'
          : `Error: ${error.message}`,
        true
      );
    } finally {
      button.disabled = false;
    }
  });
});
