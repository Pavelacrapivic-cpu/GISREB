/**
 * Адаптивные функции для мобильных устройств
 */

class ResponsiveManager {
    constructor() {
        this.isMobile = this.checkMobile();
        this.isTelegramWebView = this.checkTelegramWebView();
        this.initialize();
    }

    checkMobile() {
        return window.innerWidth <= 768 ||
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    checkTelegramWebView() {
        return window.Telegram && window.Telegram.WebApp;
    }

    initialize() {
        if (this.isMobile) {
            this.adaptForMobile();
        }

        if (this.isTelegramWebView) {
            this.adaptForTelegram();
        }

        // Обработчик изменения размера окна
        window.addEventListener('resize', this.handleResize.bind(this));

        // Предотвращение масштабирования на мобильных
        this.preventZoom();
    }

    adaptForMobile() {
        // Упрощаем интерфейс для мобильных
        document.body.classList.add('mobile-view');

        // Улучшаем работу с клавиатурой
        this.improveKeyboardHandling();

        // Оптимизируем анимации
        this.optimizeAnimations();
    }

    adaptForTelegram() {
        document.body.classList.add('telegram-webview');

        // Настраиваем Telegram WebApp
        const tg = window.Telegram.WebApp;

        // Устанавливаем тему Telegram
        if (tg.colorScheme === 'dark') {
            document.body.classList.add('dark-theme');
        }

        // Разворачиваем на весь экран
        tg.expand();

        // Настраиваем кнопку "Назад"
        tg.BackButton.onClick(() => {
            window.history.back();
        });

        // Показываем кнопку "Назад" если есть история
        if (window.history.length > 1) {
            tg.BackButton.show();
        }
    }

    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = this.checkMobile();

        if (wasMobile !== this.isMobile) {
            if (this.isMobile) {
                this.adaptForMobile();
            } else {
                document.body.classList.remove('mobile-view');
            }
        }
    }

    preventZoom() {
        if (this.isMobile) {
            // Предотвращаем масштабирование при двойном тапе
            let lastTouchEnd = 0;
            document.addEventListener('touchend', (event) => {
                const now = Date.now();
                if (now - lastTouchEnd <= 300) {
                    event.preventDefault();
                }
                lastTouchEnd = now;
            }, false);

            // Отключаем контекстное меню на долгий тап
            document.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                return false;
            });
        }
    }

    improveKeyboardHandling() {
        // Прокрутка к полю ввода при фокусе
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('focus', () => {
                setTimeout(() => {
                    window.scrollTo({
                        top: document.body.scrollHeight,
                        behavior: 'smooth'
                    });
                }, 300);
            });
        }

        // Скрытие клавиатуры при отправке
        document.addEventListener('click', (e) => {
            if (e.target.id === 'send-btn' || e.target.closest('#send-btn')) {
                if (document.activeElement) {
                    document.activeElement.blur();
                }
            }
        });
    }

    optimizeAnimations() {
        // Упрощаем анимации на слабых устройствах
        if ('connection' in navigator && navigator.connection) {
            const connection = navigator.connection;
            if (connection.saveData || connection.effectiveType.includes('2g')) {
                document.body.classList.add('reduced-motion');
            }
        }
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    window.responsiveManager = new ResponsiveManager();
});

// Вспомогательные функции
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isAndroid() {
    return /Android/.test(navigator.userAgent);
}

function getMobileOS() {
    if (isIOS()) return 'ios';
    if (isAndroid()) return 'android';
    return 'other';
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ResponsiveManager, isIOS, isAndroid, getMobileOS };
}