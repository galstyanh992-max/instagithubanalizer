# Browser Workspace

Существующая browser workspace использует CamoFox (`127.0.0.1:9377`) через server API: health, tabs, snapshot, click, type и search. Frontend не управляет локальным процессом напрямую.

Маршрутизация при отказе: специализированный reader/crawler → CamoFox/browser-use → Playwright. Каждый переход должен записывать исходную ошибку и выбранный fallback.

Безопасность:

- browser content считается недоверенным вводом;
- cookies, OAuth tokens и browser profile не попадают в registry/logs;
- отправка данных и загрузка файлов требуют политики side effects;
- worker запускается в локальном контуре, а Dashboard видит только health/metrics/errors;
- отсутствующий CamoFox остаётся `OFFLINE/MISSING`, а не имитирует результат.
