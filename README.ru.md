# <img src="./assets/a1-logo.svg" alt="A1" width="40"> Google Tag Manager MCP

[English](./README.md) | **Русский**

[![npm](https://img.shields.io/npm/v/mcp-google-tagmanager)](https://www.npmjs.com/package/mcp-google-tagmanager)
[![CI](https://github.com/A1-x-Tech/mcp-google-tagmanager/actions/workflows/ci.yml/badge.svg)](https://github.com/A1-x-Tech/mcp-google-tagmanager/actions/workflows/ci.yml)
[![Glama](https://glama.ai/mcp/servers/A1-x-Tech/mcp-google-tagmanager/badges/score.svg)](https://glama.ai/mcp/servers/A1-x-Tech/mcp-google-tagmanager)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**A1 Google Tag Manager MCP** позволяет AI-приложению проверять и настраивать контейнеры Google Tag Manager на естественном языке. Можно увидеть, что срабатывает на странице, подготовить теги, триггеры и переменные в черновом рабочем пространстве, а затем осознанно собрать и опубликовать версию.

Сервер подключается к Google Tag Manager API v2 через ваш аккаунт Google. В отличие от догадки AI о настройке GTM, он работает с выбранными вами настоящими контейнером, рабочим пространством и версией.

- **19 инструментов.** 10 операций только читают данные GTM; 4 создают черновики или меняют встроенные переменные; 5 могут изменить, удалить, собрать или опубликовать конфигурацию.
- **Сначала черновик.** Теги, триггеры и переменные создаются в рабочем пространстве. Публикация — отдельная явно разрушительная операция.
- **С учётом квоты.** GTM разрешает 0,25 запроса в секунду на проект; сервер делает паузу не менее 4,2 секунды между запросами, а не перегружает API.
- **Ваш доступ Google.** Сервер использует ваши OAuth-данные и запрашивает только scope GTM, нужные для чтения, редактирования, версий и публикации.

Начните с запроса, который только читает данные:

> Какие теги в моих контейнерах срабатывают по триггеру просмотра страницы?

[Подключить сервер](#быстрый-старт) · [Посмотреть сценарии](#что-можно-поручить) · [Открыть техническую документацию](#техническая-документация)

---

## Увидеть работу за минуту

> **Вы:** Покажи мои контейнеры GTM и теги, которые срабатывают при просмотре страницы.
>
> **Ассистент:** Показывает контейнеры, их рабочие пространства, подходящие триггеры и привязанные теги. Ничего не меняется.
>
> **Вы:** В Default Workspace контейнера `GTM-ABC123` подготовь GA4 configuration tag для measurement ID `G-XXXXXXX` на всех страницах.
>
> **Ассистент:** Показывает рабочее пространство, предлагаемые настройки тега и триггера, затем запрашивает подтверждение перед созданием черновика.
>
> **Вы:** Подтверждаю черновик.
>
> **Ассистент:** Создаёт тег в рабочем пространстве. Контейнер не публикуется: сборка и публикация версии остаются отдельным шагом.

## Содержание

- [Быстрый старт](#быстрый-старт)
- [Что можно поручить](#что-можно-поручить)
- [Как связаны изменения GTM](#как-связаны-изменения-gtm)
- [Что может измениться](#что-может-измениться)
- [Как получить доступ](#как-получить-доступ)
- [Конфигурация](#конфигурация)
- [Данные и телеметрия](#данные-и-телеметрия)
- [Ограничения и работа в фоне](#ограничения-и-работа-в-фоне)
- [Техническая документация](#техническая-документация)
- [Поддержка](#поддержка)

## Быстрый старт

Нужны Node.js 20+, Google-аккаунт с доступом к контейнеру GTM и OAuth-данные из проекта Google Cloud, в котором включён Tag Manager API.

1. [Подготовьте Google OAuth-доступ](#как-получить-доступ).
2. Добавьте сервер в AI-приложение.
3. Начните с запроса, который только читает данные.

<details open>
<summary><strong>Codex</strong></summary>

<br>

**В приложении:**

1. Откройте **Settings → Plugins → MCP servers**.
2. Нажмите **Add server**.
3. Добавьте `npx -y mcp-google-tagmanager@latest` и три переменные окружения ниже.

| Переменная | Значение |
|---|---|
| `GOOGLE_TAGMANAGER_CLIENT_ID` | Ваш Google OAuth client ID |
| `GOOGLE_TAGMANAGER_CLIENT_SECRET` | Ваш Google OAuth client secret |
| `GOOGLE_TAGMANAGER_REFRESH_TOKEN` | Ваш Google OAuth refresh token |

**В командной строке:**

```bash
codex mcp add google-tagmanager \
  --env GOOGLE_TAGMANAGER_CLIENT_ID=your_client_id \
  --env GOOGLE_TAGMANAGER_CLIENT_SECRET=your_client_secret \
  --env GOOGLE_TAGMANAGER_REFRESH_TOKEN=your_refresh_token \
  -- npx -y mcp-google-tagmanager@latest
```

```bash
codex mcp list
```

[Документация Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)

</details>

<details>
<summary><strong>Claude Code</strong></summary>

<br>

```bash
claude mcp add \
  --env GOOGLE_TAGMANAGER_CLIENT_ID=your_client_id \
  --env GOOGLE_TAGMANAGER_CLIENT_SECRET=your_client_secret \
  --env GOOGLE_TAGMANAGER_REFRESH_TOKEN=your_refresh_token \
  --transport stdio \
  --scope user \
  google-tagmanager \
  -- npx -y mcp-google-tagmanager@latest
```

```bash
claude mcp list
```

[Документация Claude Code MCP](https://code.claude.com/docs/en/mcp)

</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

<br>

1. Откройте **Settings → Developer → Edit Config**.
2. Добавьте запись в `mcpServers`:

```json
{
  "mcpServers": {
    "google-tagmanager": {
      "command": "npx",
      "args": ["-y", "mcp-google-tagmanager@latest"],
      "env": {
        "GOOGLE_TAGMANAGER_CLIENT_ID": "your_client_id",
        "GOOGLE_TAGMANAGER_CLIENT_SECRET": "your_client_secret",
        "GOOGLE_TAGMANAGER_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

Если **Edit Config** недоступна, отредактируйте `~/Library/Application Support/Claude/claude_desktop_config.json` на macOS или `%APPDATA%\Claude\claude_desktop_config.json` на Windows.

[Документация Claude Desktop MCP](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)

</details>

<details>
<summary><strong>Cursor</strong></summary>

<br>

Добавьте сервер уровня пользователя в `~/.cursor/mcp.json` на macOS/Linux или в `%USERPROFILE%\.cursor\mcp.json` на Windows:

```json
{
  "mcpServers": {
    "google-tagmanager": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-google-tagmanager@latest"],
      "env": {
        "GOOGLE_TAGMANAGER_CLIENT_ID": "your_client_id",
        "GOOGLE_TAGMANAGER_CLIENT_SECRET": "your_client_secret",
        "GOOGLE_TAGMANAGER_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

[Документация Cursor MCP](https://cursor.com/docs/mcp)

</details>

<details>
<summary><strong>VS Code</strong></summary>

<br>

Запустите **MCP: Open User Configuration** из Command Palette и добавьте:

```json
{
  "servers": {
    "google-tagmanager": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-google-tagmanager@latest"],
      "env": {
        "GOOGLE_TAGMANAGER_CLIENT_ID": "${input:gtm_client_id}",
        "GOOGLE_TAGMANAGER_CLIENT_SECRET": "${input:gtm_client_secret}",
        "GOOGLE_TAGMANAGER_REFRESH_TOKEN": "${input:gtm_refresh_token}"
      }
    }
  },
  "inputs": [
    { "type": "promptString", "id": "gtm_client_id", "description": "Google OAuth client ID" },
    { "type": "promptString", "id": "gtm_client_secret", "description": "Google OAuth client secret", "password": true },
    { "type": "promptString", "id": "gtm_refresh_token", "description": "Google OAuth refresh token", "password": true }
  ]
}
```

Проверьте сервер командой **MCP: List Servers**.

[Документация VS Code MCP](https://code.visualstudio.com/docs/agent-customization/mcp-servers)

</details>

## Что можно поручить

### Понять текущую настройку

- Покажи доступные мне аккаунты и контейнеры GTM.
- Какие теги срабатывают при просмотре страницы в этом рабочем пространстве?
- Покажи настройки триггера и переменных для этого тега.
- Какие встроенные переменные включены?

### Подготовить изменение аналитики в черновике

- Создай рабочее пространство для изменения отслеживания checkout.
- Подготовь GA4-тег и триггер для нужного события.
- Включи переменные клика, необходимые для этого триггера.
- Обнови этот тег, сначала показав мне полную конфигурацию для замены.

### Осознанно выпустить версию

- Собери из этого рабочего пространства версию с названием `April release`.
- Покажи ошибки компилятора, если они есть.
- Опубликуй версию `42` после моего подтверждения версии и её изменений.

## Как связаны изменения GTM

В GTM есть понятный путь выпуска:

1. В **аккаунте** находятся один или несколько **контейнеров**.
2. У контейнера есть **рабочие пространства** для черновых изменений.
3. Теги, триггеры и переменные принадлежат рабочему пространству.
4. Сборка рабочего пространства создаёт **версию контейнера** и удаляет исходное рабочее пространство. GTM создаёт замену.
5. Публикация делает выбранную версию контейнера рабочей.

Сервер умеет проверить каждый шаг. Он не приравнивает черновик к выпуску: создание версии и публикация — разные операции.

## Что может измениться

| Операция | Что происходит | Граница подтверждения |
|---|---|---|
| Просмотр аккаунтов, контейнеров, пространств, тегов, триггеров, переменных и версий | Читает конфигурацию GTM | Ничего не меняет |
| Создание контейнера или рабочего пространства | Добавляет объект GTM | Меняет GTM |
| Создание тега, триггера или переменной | Добавляет черновой объект в пространство | Меняет черновое пространство |
| Включение или выключение встроенных переменных | Меняет конфигурацию пространства | Меняет черновое пространство |
| Обновление тега, триггера или переменной | Полностью заменяет ресурс, защищённый fingerprint | Потенциально разрушительно |
| Удаление тега, триггера или переменной | Удаляет выбранный объект | Разрушительно |
| Сборка рабочего пространства | Создаёт версию и удаляет исходное пространство | Разрушительно |
| Публикация версии | Делает выбранную версию рабочей | Разрушительно |
| Технический запрос API | Может вызвать метод API без отдельного инструмента | Потенциально разрушительно |

То, как AI-приложение запрашивает подтверждение, определяет само приложение. Сервер помечает операции как read-only, write и destructive, чтобы оно могло отличить проверку от реального изменения.

## Как получить доступ

Сервер использует Google OAuth 2.0. Google Tag Manager не предоставляет API-ключи для этих пользовательских данных.

1. Создайте или выберите проект Google Cloud и включите [Tag Manager API](https://console.cloud.google.com/apis/library/tagmanager.googleapis.com). Проект без включённого API не получает квоту.
2. Настройте OAuth consent screen и создайте OAuth-клиент. Для локальной работы подходит тип **Desktop app**.
3. Авторизуйте свой Google-аккаунт и получите refresh token. Это можно сделать через [OAuth 2.0 Playground](https://developers.google.com/oauthplayground), если включить **Use your own OAuth credentials**.
4. Запросите все scope вместе:

   ```text
   https://www.googleapis.com/auth/tagmanager.readonly
   https://www.googleapis.com/auth/tagmanager.edit.containers
   https://www.googleapis.com/auth/tagmanager.edit.containerversions
   https://www.googleapis.com/auth/tagmanager.publish
   ```

Scope разделены: для чтения, редактирования, сборки версии и публикации требуется соответствующее разрешение. Храните client secret и refresh token как пароли.

## Конфигурация

| Переменная | Обязательна | Описание |
|---|---|---|
| `GOOGLE_TAGMANAGER_CLIENT_ID` | Да* | OAuth client ID. |
| `GOOGLE_TAGMANAGER_CLIENT_SECRET` | Да* | OAuth client secret. |
| `GOOGLE_TAGMANAGER_REFRESH_TOKEN` | Да* | OAuth refresh token. |
| `GOOGLE_TAGMANAGER_ACCESS_TOKEN` | Да* | Короткоживущая альтернатива OAuth-тройке. |
| `GOOGLE_TAGMANAGER_API_BASE` | Нет | Переопределяет базовый URL Tag Manager API. |
| `GOOGLE_TAGMANAGER_TIMEOUT_MS` | Нет | Тайм-аут запроса; по умолчанию `60000` мс. |
| `GOOGLE_TAGMANAGER_MAX_RETRIES` | Нет | Максимум повторов при временных ошибках; по умолчанию `3`. |
| `GOOGLE_TAGMANAGER_MIN_INTERVAL_MS` | Нет | Минимальная пауза между запросами; по умолчанию `4200` мс. |

\* Передайте либо OAuth-тройку, либо access token. Access token истекает примерно через час и автоматически не обновляется.

## Данные и телеметрия

Сервер работает локально и отправляет запросы GTM API и OAuth refresh requests в Google. Анонимная телеметрия содержит случайный ID установки, версию пакета, версии AI-клиента, Node.js и операционной системы, а также имена инструментов. OAuth-токены, данные GTM, аргументы инструментов и промпты не отправляются.

Отключить телеметрию для MCP-серверов A1 можно так:

```bash
ASKADS_TELEMETRY=0
```

## Ограничения и работа в фоне

- **GTM ограничивает частоту.** API разрешает 0,25 запроса в секунду на проект, поэтому сервер выполняет запросы с интервалом не менее 4,2 секунды. Широкая проверка может занять время.
- **Временные лимиты обрабатываются осторожно.** Ответы `429` и quota `403` от Google обрабатываются с экспоненциальной задержкой и `Retry-After`. Чтение повторяется после сетевых и `5xx` ошибок; запись после неопределённой ошибки не повторяется.
- **Постоянного наблюдения нет.** Сервер работает только во время вызова из AI-приложения. Если приложение поддерживает задания по расписанию, оно может периодически проверять контейнер или его рабочую версию.
- **Рабочее пространство исчезает при сборке.** Перед `create_version` сохраните нужные данные и проверьте путь к созданному GTM пространству-замене.

## Техническая документация

- [Все инструменты и параметры](./docs/TOOLS.md)
- [Документация по разработке](./docs/DEVELOPMENT.md)
- [Документация по публикации](./docs/PUBLISHING.md)
- [Справочник Google Tag Manager API v2](https://developers.google.com/tag-platform/tag-manager/api/reference/rest)

## Поддержка

Нашли ошибку или не хватает сценария? [Создайте issue](https://github.com/A1-x-Tech/mcp-google-tagmanager/issues) или напишите в [Telegram](https://t.me/a1_mcp).
