/**
 * ГИСРЭБ ИИ-Ассистент - Потоковый чат
 */

class GisrebChat {
    constructor() {
        this.ws = null;
        this.sessionId = this.generateSessionId();
        this.isConnected = false;
        this.isTyping = false;
        this.currentBotMessage = null; // ИНИЦИАЛИЗАЦИЯ!

        this.initializeElements();
        this.initializeEventListeners();
        this.connectWebSocket();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    initializeElements() {
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-btn');
        this.chatMessages = document.getElementById('chat-messages');
        this.clearButton = document.getElementById('clear-chat');
        this.statusDot = document.getElementById('status-dot');
        this.statusText = document.getElementById('status-text');

        // Активируем кнопку при вводе текста
        this.messageInput.addEventListener('input', () => {
            this.sendButton.disabled = !this.messageInput.value.trim();

            // Авто-высота textarea
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
        });
    }

    initializeEventListeners() {
        // Отправка сообщения по Enter (без Shift)
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Отправка по кнопке
        this.sendButton.addEventListener('click', () => this.sendMessage());

        // Очистка чата
        this.clearButton.addEventListener('click', () => this.clearChat());

        // Очистка поля ввода
        document.getElementById('clear-input')?.addEventListener('click', () => {
            this.messageInput.value = '';
            this.messageInput.style.height = 'auto';
            this.sendButton.disabled = true;
            this.messageInput.focus();
        });
    }

    async connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        try {
            this.ws = new WebSocket(wsUrl);
            this.setStatus('connecting', 'Подключение...');

            this.ws.onopen = () => {
                this.isConnected = true;
                this.setStatus('connected', 'Подключено');
                console.log('✅ WebSocket подключен');
            };

            this.ws.onmessage = (event) => {
                this.handleWebSocketMessage(event.data);
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                this.setStatus('disconnected', 'Отключено');
                console.log('❌ WebSocket отключен');

                // Попытка переподключения через 3 секунды
                setTimeout(() => this.connectWebSocket(), 3000);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket ошибка:', error);
                this.setStatus('error', 'Ошибка подключения');
            };

        } catch (error) {
            console.error('Ошибка подключения WebSocket:', error);
            this.setStatus('error', 'Не удалось подключиться');
        }
    }

    setStatus(status, text) {
        const statusColors = {
            'connected': '#28a745',
            'connecting': '#ffc107',
            'disconnected': '#dc3545',
            'error': '#dc3545'
        };

        if (this.statusDot) {
            this.statusDot.style.backgroundColor = statusColors[status] || '#6c757d';
        }

        if (this.statusText) {
            this.statusText.textContent = text;
        }
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();

        if (!message || !this.isConnected) {
            return;
        }

        // Добавляем сообщение пользователя в чат
        this.addMessage(message, 'user');

        // Очищаем поле ввода
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        this.sendButton.disabled = true;

        // Показываем индикатор набора
        this.showTypingIndicator();

        // Отправляем через WebSocket
        try {
            this.ws.send(JSON.stringify({
                type: 'message',
                message: message,
                session_id: this.sessionId
            }));

        } catch (error) {
            console.error('Ошибка отправки:', error);
            this.addMessage('Ошибка отправки сообщения. Попробуйте еще раз.', 'bot');
            this.hideTypingIndicator();
            this.sendButton.disabled = false;
        }
    }

    handleWebSocketMessage(data) {
        try {
            const message = JSON.parse(data);

            switch (message.type) {
                case 'status':
                    this.handleStatusMessage(message.data);
                    break;

                case 'chunk':
                    this.handleChunkMessage(message.data);
                    break;

                case 'error':
                    this.handleErrorMessage(message.data);
                    break;

                default:
                    console.log('Неизвестный тип сообщения:', message);
            }

        } catch (error) {
            console.error('Ошибка обработки сообщения:', error, data);
        }
    }

    handleStatusMessage(data) {
        if (data.status === 'processing') {
            this.hideTypingIndicator();
        }
    }

    handleChunkMessage(data) {
        this.hideTypingIndicator();

        if (data.is_final) {
            // Сообщение завершено
            this.sendButton.disabled = false;
            this.currentBotMessage = null;

        } else if (data.content) {
            // Если это первый чанк - создаем новое сообщение
            if (!this.currentBotMessage) {
                this.currentBotMessage = this.addMessage('', 'bot', true);
            }

            // Добавляем контент к текущему сообщению
            this.appendToMessage(this.currentBotMessage, data.content);
        }
    }

    handleErrorMessage(data) {
        console.error('Ошибка от сервера:', data);
        this.addMessage(`Ошибка: ${data.error}`, 'bot');
        this.hideTypingIndicator();
        this.sendButton.disabled = false;
    }

    addMessage(text, sender, isStreaming = false) {
        const messageId = 'msg_' + Date.now();
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Добавляем курсор для потокового сообщения
        const cursorHtml = isStreaming ? '<span class="typing-cursor">▋</span>' : '';

        const messageHTML = `
            <div class="message ${sender}-message" id="${messageId}">
                <div class="message-sender">
                    ${sender === 'user' ? 'Вы' : 'ГИСРЭБ Ассистент'}
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-bubble">
                    ${isStreaming ? cursorHtml : this.escapeHtml(text)}
                </div>
            </div>
        `;

        this.chatMessages.insertAdjacentHTML('beforeend', messageHTML);

        // Плавное появление
        const messageElement = document.getElementById(messageId);
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'translateY(10px)';

        setTimeout(() => {
            messageElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            messageElement.style.opacity = '1';
            messageElement.style.transform = 'translateY(0)';
        }, 10);

        // Автоскролл
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

        if (isStreaming) {
            return {
                element: messageElement,
                contentElement: messageElement.querySelector('.message-bubble')
            };
        }

        return null;
    }

    appendToMessage(messageObj, text) {
        if (messageObj && messageObj.contentElement) {
            // Просто добавляем текст
            messageObj.contentElement.textContent += this.escapeHtml(text);

            // Автоскролл
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    showTypingIndicator() {
        if (this.isTyping) return;

        this.isTyping = true;
        const typingHTML = `
            <div class="message bot-message" id="typing-indicator">
                <div class="message-sender">ГИСРЭБ Ассистент</div>
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;

        this.chatMessages.insertAdjacentHTML('beforeend', typingHTML);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
        this.isTyping = false;
    }

    clearChat() {
        if (confirm('Очистить всю историю чата?')) {
            this.chatMessages.innerHTML = '';
            this.currentBotMessage = null;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.chat = new GisrebChat();

    // Приветственное сообщение
    setTimeout(() => {
        if (!window.chatInitialized) {
            const welcomeMessage = `Добро пожаловать в ГИСРЭБ ИИ-Ассистент! 🚀\n\nЯ помогу вам с вопросами по бюджетным системам.\n\nПопробуйте спросить:\n• Как создать документ БА по администраторам?\n• Что такое бюджетная роспись ГАИФ?\n• Как передать документ на согласование?`;

            window.chat.addMessage(welcomeMessage, 'bot');
            window.chatInitialized = true;
        }
    }, 500);
});