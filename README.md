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

Finish, cancel, or otherwise resolve every pending request through the original
manual connection before switching. Plugin authentication creates a different
OAuth client, so it cannot await, revise, or cancel requests owned by the old
client. Preserve the project's `.needu` directory as request history.

Once no request remains pending on the old connection, remove only its Needu MCP
registration, standalone Needu skill, and old Needu hooks. Keep unrelated
configuration. Then install and authenticate the plugin. Do not run both Needu
connections against the same recovery ledger.

The plugin keeps the current host session attached to its pending Needu
requests. It saves request IDs and delivery cursors, never answer content. A new
task or app restart does not attach itself to an old request automatically; use
the saved request ID and revision to call `await_answer` again.

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
