# Messages Center

Единая абстракция сообщений использует режимы `MANUAL`, `DRAFT_ONLY`, `AUTO_SAFE`. Даже в `AUTO_SAFE` отправка допускается только для текста без финансов, покупок/возвратов, юридических вопросов, конфликтов/угроз, неизвестных вложений, секретов, подозрительных URL, PII и деловых решений. Массовая отправка всегда блокируется подтверждением `MASS_MESSAGE`.

Telegram transport реализован через `grammY`; bot token читается только серверным адаптером. Generic capabilities: `message.telegram.read/draft/send` и `message.whatsapp.conversation.list/read/draft/send`. Команды Telegram не получают прямого shell-доступа: auth → policy → task → capability → audit. Evolution API зарегистрирован отключённым; неофициальный WhatsApp transport считается экспериментальным. Cookies и browser sessions не импортируются. В Supabase сохраняются ссылки, классификация и события, но не дублируются полные provider message bodies.
