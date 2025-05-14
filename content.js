class DomainHighlighter {
  constructor() {
    this.highlightingEnabled = true;
    this.setupStyles();
    this.init();
  }

  setupStyles() {
    if (!document.head.querySelector('#whois-highlight-style')) {
      const style = document.createElement('style');
      style.id = 'whois-highlight-style';
      style.textContent = `
        .whois-highlight-wrapper {
          position: relative;
          display: inline;
          z-index: 0;
          background-color: rgba(144, 238, 144, 0.3);
          border-radius: 2px;
          pointer-events: none;
        }
      `;
      document.head.appendChild(style);
    }
  }

  isValidDomain(text) {
    // Улучшенное регулярное выражение для доменов:
    // 1. Может содержать дефисы (Check-Host.net)
    // 2. Поддержка интернациональных доменов (IDN)
    // 3. Минимум 2 символа в зоне
    return /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(text) || 
           /^(?!-)[\u0400-\u04FF0-9-]+(\.[\u0400-\u04FF0-9-]+)*\.[\u0400-\u04FF]{2,}$/i.test(text);
  }

  highlightDomains() {
    if (!this.highlightingEnabled) return;

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: node => {
          // Игнорируем скрипты, стили и редактируемые элементы
          if (node.parentNode.tagName === 'SCRIPT' || 
              node.parentNode.tagName === 'STYLE' ||
              node.parentNode.isContentEditable ||
              node.parentNode.closest('.whois-highlight-wrapper')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodesToHighlight = [];
    
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.nodeValue;
      
      // Ищем домены в тексте
      const domainRegex = /(?!-)[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}|(?!-)[\u0400-\u04FF0-9-]+(\.[\u0400-\u04FF0-9-]+)*\.[\u0400-\u04FF]{2,}/gi;
      let match;
      
      while ((match = domainRegex.exec(text)) !== null) {
        nodesToHighlight.push({
          node,
          domain: match[0],
          start: match.index,
          end: match.index + match[0].length
        });
      }
    }

    // Обрабатываем в обратном порядке (чтобы не сбивать индексы)
    for (let i = nodesToHighlight.length - 1; i >= 0; i--) {
      const {node, domain, start, end} = nodesToHighlight[i];
      const parent = node.parentNode;
      const text = node.nodeValue;
      
      // Создаем структуру: текст до + подсвеченный домен + текст после
      const before = text.substring(0, start);
      const after = text.substring(end);
      
      const wrapper = document.createElement('span');
      wrapper.className = 'whois-highlight-wrapper';
      wrapper.textContent = domain;
      
      // Собираем новые узлы
      const newNodes = [];
      if (before) newNodes.push(document.createTextNode(before));
      newNodes.push(wrapper);
      if (after) newNodes.push(document.createTextNode(after));
      
      // Заменяем оригинальный узел
      const fragment = document.createDocumentFragment();
      newNodes.forEach(n => fragment.appendChild(n));
      node.replaceWith(fragment);
    }
  }

  clearHighlights() {
    document.querySelectorAll('.whois-highlight-wrapper').forEach(wrapper => {
      wrapper.replaceWith(wrapper.textContent);
    });
  }

  handleMessage(request) {
    if (request.action === "toggleHighlight") {
      this.highlightingEnabled = request.enabled;
      if (!this.highlightingEnabled) {
        this.clearHighlights();
      } else {
        this.highlightDomains();
      }
    }
  }

  init() {
    // Обработчик сообщений от background.js
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

    // Оптимизированный MutationObserver с debounce
    let highlightTimeout;
    const observer = new MutationObserver(mutations => {
      if (this.highlightingEnabled) {
        clearTimeout(highlightTimeout);
        highlightTimeout = setTimeout(() => {
          this.highlightDomains();
        }, 300);
      }
    });

    // Первоначальная подсветка
    if (document.readyState === 'complete') {
      this.highlightDomains();
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        this.highlightDomains();
      }, {once: true});
    }

    // Наблюдаем за изменениями DOM
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }
}

// Инициализация
new DomainHighlighter();