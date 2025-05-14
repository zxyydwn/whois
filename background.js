// Состояние расширения
const state = {
  highlightingEnabled: true
};

// Создание контекстного меню
async function createContextMenu() {
  try {
    await chrome.contextMenus.removeAll();
    
    // Родительский пункт
    await chrome.contextMenus.create({
      id: "whoisParent",
      title: "WHOIS",
      contexts: ["all"]
    });

    // Подпункты
    await Promise.all([
      chrome.contextMenus.create({
        id: "whoisCom",
        parentId: "whoisParent",
        title: "whois.com",
        contexts: ["all"]
      }),
      chrome.contextMenus.create({
        id: "whoisNicRu",
        parentId: "whoisParent",
        title: "nic.ru проверка домена на премиальность (не 100%)",
        contexts: ["all"]
      }),
      chrome.contextMenus.create({
        id: "whoisToggle",
        parentId: "whoisParent",
        title: state.highlightingEnabled ? "Выключить подсветку" : "Включить подсветку",
        contexts: ["all"]
      })
    ]);
  } catch (error) {
    console.error('Error creating context menu:', error);
  }
}

// Обработчик выбора в меню
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const selectedText = info.selectionText?.trim() || '';
  
  switch (info.menuItemId) {
    case "whoisCom":
      if (selectedText) {
        await chrome.tabs.create({url: `https://www.whois.com/whois/${selectedText}`});
      } else {
        await chrome.tabs.create({url: `https://www.whois.com/`});
      }
      break;
      
    case "whoisNicRu":
      if (selectedText) {
        await chrome.tabs.create({url: `https://www.nic.ru/corp/catalog/domains-for-corp/?searchWord=${selectedText}`});
      } else {
        await chrome.tabs.create({url: `https://www.nic.ru/whois/`});
      }
      break;
      
    case "whoisToggle":
      state.highlightingEnabled = !state.highlightingEnabled;
      await chrome.contextMenus.update("whoisToggle", {
        title: state.highlightingEnabled ? "Выключить подсветку" : "Включить подсветку"
      });
      
      try {
        const tabs = await chrome.tabs.query({});
        await Promise.all(tabs.map(tab => {
          return chrome.tabs.sendMessage(tab.id, {
            action: "toggleHighlight",
            enabled: state.highlightingEnabled
          }).catch(() => {}); // Игнорируем ошибки в закрытых/недоступных вкладках
        }));
      } catch (error) {
        console.error('Error sending message to tabs:', error);
      }
      break;
  }
});

// Инициализация
chrome.runtime.onInstalled.addListener(createContextMenu);
chrome.runtime.onStartup.addListener(createContextMenu);