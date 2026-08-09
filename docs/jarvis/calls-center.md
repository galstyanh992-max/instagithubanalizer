# Calls Center

LiveKit — только транспорт с generic capabilities `voice.session.create/start/stop/transcript`. Распознавание и синтез речи продолжают использовать Phase A Faster Whisper/TTS маршрутизацию. Локальная сессия создаёт план комнаты и не совершает внешний звонок. PSTN и любые внешние вызовы по умолчанию отключены и требуют `CALL_EXTERNAL`. Control plane хранит session/event refs; чувствительный transcript хранится только как `contentRef` и redacted preview.

Meetily зарегистрирован как опциональный capture/workflow компонент и не дублирует STT или reasoning JARVIS.
