/**
 * Anomaly Zone Mini-game integration for Foundry VTT (v11, v12, v14+)
 */

const mergeObj = (typeof foundry !== "undefined" && foundry.utils && foundry.utils.mergeObject) 
  ? foundry.utils.mergeObject 
  : (typeof mergeObject !== "undefined" ? mergeObject : Object.assign);

// Используем стандартный Application (V1) для максимальной совместимости 
const BaseApp = typeof Application !== 'undefined' ? Application : class {};

class AnomalyZoneApplication extends BaseApp {
  static get defaultOptions() {
    return mergeObj(super.defaultOptions, {
      id: "anomaly-zone-ui",
      title: "Аномальная Зона",
      template: "modules/anomaly-zone-minigame/app-template.html",
      width: 1040,
      height: 850,
      resizable: true,
      minimizable: true,
      popOut: true
    });
  }

  // Посылка данных внутрь фрейма
  sendToFrame(action, payload) {
    const frame = this.element ? (this.element.find ? this.element.find('iframe')[0] : this.element.querySelector('iframe')) : null;
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage({ source: 'foundry', action, payload }, '*');
    }
  }

  // Socket Listener
  static initializeSockets() {
    if (!game.socket) return;
    game.socket.on('module.anomaly-zone-minigame', (data) => {
      if (data.action === 'FORCE_OPEN') {
        console.log("Anomaly Zone Mini-game | Получен сигнал FORCE_OPEN от Мастера.");
        window.AnomalyZoneTool.open();
      } else if (data.action === 'FORCE_CLOSE') {
        console.log("Anomaly Zone Mini-game | Получен сигнал FORCE_CLOSE от Мастера.");
        const openApp = Object.values(ui.windows).find(app => app.id === "anomaly-zone-ui");
        if (openApp) {
          openApp.close();
        }
      } else {
        const openApp = Object.values(ui.windows).find(app => app.id === "anomaly-zone-ui");
        if (openApp) {
          openApp.sendToFrame(data.action, data.payload);
        }
      }
    });

    // Слушаем сообщения ИЗ фрейма
    window.addEventListener('message', (event) => {
      if (event.data && event.data.source === 'anomaly-zone') {
        const { action, payload } = event.data;
        
        // 1. Широковещательный запрос остальным игрокам
        game.socket.emit('module.anomaly-zone-minigame', { action, payload });

        // Если это принудительное открытие/закрытие у всех, делаем и у себя если мы мастер (но мы уже кликнули, так что сокет разошлет другим)
        // Возвращаем роль пользователя во фрейм, если фрейм запрашивает
        if (action === 'REQUEST_ROLE') {
          const openApp = Object.values(ui.windows).find(app => app.id === "anomaly-zone-ui");
          if (openApp) {
            openApp.sendToFrame('SET_ROLE', { isGM: game.user.isGM, username: game.user.name });
          }
        }
      }
    });
  }
}

// Экспорт API в глобальную область видимости (на случай конфликтов интерфейса или вызова через макросы)
window.AnomalyZoneTool = {
  open: () => {
    // Проверка V1 окон
    let openApp = Object.values(ui.windows).find(app => app.id === "anomaly-zone-ui");
    
    // Проверка V2 окон
    if (!openApp && foundry.applications?.instances) {
      openApp = Array.from(foundry.applications.instances.values()).find(a => a.id === "anomaly-zone-ui");
    }

    if (openApp) {
      openApp.bringToTop ? openApp.bringToTop() : openApp.render({force: true});
    } else {
      new AnomalyZoneApplication().render(true);
    }
  }
};

Hooks.once('ready', () => {
  console.log('Anomaly Zone Mini-game | Модуль успешно инициализирован.');
  AnomalyZoneApplication.initializeSockets();
  console.log('Anomaly Zone Mini-game | Глобальный макрос доступен через: window.AnomalyZoneTool.open()');
});

// Добавляем красивую кнопку радиации в левую панель управления (Journal / Token controls)
Hooks.on('getSceneControlButtons', (controls) => {
  if (!game.user) return;
  
  if (Array.isArray(controls)) {
    // В тяжелых системах вроде GURPS панель токенов часто перезаписывается,
    // поэтому приоритетно добавляем кнопку в панель Журналов (Notes), а не токенов
    let targetCategory = controls.find(c => c.name === "notes");
    if (!targetCategory) targetCategory = controls.find(c => c.name === "token");
    
    if (targetCategory && targetCategory.tools) {
      const alreadyExists = targetCategory.tools.some(t => t.name === "anomalyzone");
      if (!alreadyExists) {
        targetCategory.tools.push({
          name: "anomalyzone",
          title: game.user.isGM ? "Панель куратора Аномальной Зоны" : "Карта Аномальной Зоны",
          icon: "fas fa-radiation", // Используем классический fas, совместим с Foundry < 14 и >= 14
          visible: true, 
          onClick: () => window.AnomalyZoneTool.open(),
          button: true
        });
      }
    } else {
      // Если все стандартные панели недоступны, создаём новую собственную вкладку
      controls.push({
        name: "anomalyzone_layer",
        title: "Аномальная Зона",
        layer: "controls",
        icon: "fas fa-radiation",
        visible: true,
        tools: [
          {
            name: "anomalyzone",
            title: "Открыть панель",
            icon: "fas fa-play",
            visible: true,
            onClick: () => window.AnomalyZoneTool.open(),
            button: true
          }
        ]
      });
    }
  }
});

// КРАЙНИЙ ФОЛЛБЕК: Добавляем кнопку прямо в правую панель (вкладка Журналов и Заметок)
Hooks.on("renderJournalDirectory", (app, html) => {
  if (!game.user) return;

  const btnText = game.user.isGM ? "Начать мини-игру \"Аномалии\"" : "Аномальная Зона";
  const btnHtml = `<button class="anomaly-zone-start-btn" style="flex: 0 0 100%; margin: 5px 0;"><i class="fas fa-radiation"></i> ${btnText}</button>`;

  // Foundry V14 может возвращать сырой DOM элемент вместо jQuery
  let actionButtons = null;
  if (html.find) {
    actionButtons = html.find(".directory-header .action-buttons");
  } else if (html.querySelector) {
    actionButtons = html.querySelector(".directory-header .action-buttons");
  } else if (html[0] && html[0].querySelector) {
    actionButtons = html[0].querySelector(".directory-header .action-buttons");
  }

  // Вставляем кнопку
  if (actionButtons) {
    if (actionButtons.append) actionButtons.append($(btnHtml)[0] || btnHtml); // jQuery 
    else if (actionButtons.insertAdjacentHTML) actionButtons.insertAdjacentHTML("beforeend", btnHtml); // Vanilla JS
  }

  // Вешаем слушатель клика
  setTimeout(() => {
    let btns = document.querySelectorAll(".anomaly-zone-start-btn");
    btns.forEach(b => b.addEventListener('click', (e) => {
      e.preventDefault();
      window.AnomalyZoneTool.open();
    }));
  }, 100);
});
