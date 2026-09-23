# Needu plugins

Needu gives coding agents a durable inbox for human questions and approvals.
This repository contains the public Claude Code and Codex plugin packages. It
does not contain the Needu application source, local receipts, or credentials.

## Claude Code

```sh
claude plugin marketplace add https://github.com/jonahseguin/needu-plugins
claude plugin install needu@needu --scope user
```

Start a new Claude Code session. Run `/mcp`, select
`plugin:needu:needu`, and complete browser authentication. Then run
`/plugin` and `/hooks` to confirm Needu is enabled without errors.

## Codex

```sh
codex plugin marketplace add https://github.com/jonahseguin/needu-plugins
codex plugin add needu@needu
```

Start a new Codex task and complete browser authentication when Needu first
connects. Open `/hooks`, review the Needu hooks, and trust their current
definitions. Codex skips untrusted plugin hooks.

In either host, send this harmless test after authentication:

> Use Needu to ask me a harmless test question, then wait for my answer.

The request must appear at https://needu.ai/inbox and the agent must report the
answer you save there.

## Existing manual setup

The plugin creates a new OAuth client. Requests stay in your Needu workspace
when you switch connections. Use `list_requests` to find open requests,
`get_request` to confirm the right one, then `await_answer` with its ID.
The new connection tracks its own delivery cursor. Preserve the project's
`.needu` directory. Remove only the old Needu MCP registration, standalone
Needu skill, and old Needu hooks; keep unrelated configuration.

The plugin keeps the current host session attached to its pending Needu
requests. It saves request IDs and delivery cursors, never answer content. A new
task or app restart does not attach itself to an old request automatically; use
`list_requests` and `get_request` to identify it, then call `await_answer`.

## Update

Claude Code:

```sh
claude plugin marketplace update needu
claude plugin update needu@needu
```

Codex:

```sh
codex plugin marketplace upgrade needu
codex plugin add needu@needu
```

Start a new session after updating. Review changed hook definitions again.

See the official [Claude Code plugin guide](https://code.claude.com/docs/en/discover-plugins)
and [OpenAI plugin packaging guide](https://developers.openai.com/plugins/build/plugins).

Source and releases: https://github.com/jonahseguin/needu-plugins
