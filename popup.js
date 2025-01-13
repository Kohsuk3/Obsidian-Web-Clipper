// ステータス表示を管理する関数
function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${isError ? 'error' : 'success'}`;
}

// ファイル名を生成する関数
function generateFileName(title) {
  const date = new Date().toISOString().split('T')[0];
  const sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, '-').substring(0, 100);
  return `${sanitizedTitle}-${date}.md`;  // 拡張子を.mdに変更
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
          frontMatter: frontMatter
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
function saveFile(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  
  return chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  });
}

// メイン処理
document.addEventListener('DOMContentLoaded', () => {
  // 初期化時にステータスをクリア
  showStatus('');

  // ボタンのクリックイベントを設定
  document.getElementById('saveButton').addEventListener('click', async () => {
    const button = document.getElementById('saveButton');
    button.disabled = true;

    try {
      showStatus('Getting page content...');
      const pageData = await getPageContent();
      
      showStatus('Converting to Markdown...');
      const markdown = convertToMarkdown(pageData.content, pageData.frontMatter);
      
      showStatus('Saving file...');
      await saveFile(markdown, generateFileName(pageData.title));

      showStatus('Page saved as Markdown! 🎉');
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
