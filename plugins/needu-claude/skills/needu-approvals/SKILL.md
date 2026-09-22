---
name: needu-approvals
description: Use when you need to ask the user a question, obtain approval for a plan, confirm a manual action, or recover an unanswered Needu request. Route human decisions through the connected Needu MCP tools and wait before dependent work.
---

# Needu approvals

Use the connected Needu MCP tools for human decisions. Check the available tool
list first. If Needu is unavailable, use the host's native question tool or chat to collect
the human decision. Keep dependent work blocked until they answer. This skill does not configure the MCP server.

## Decide whether to ask

Proceed with work the person has already authorized. Ask when a decision needs human
judgment or the required permission is missing. This includes an irreversible action,
a cost or security choice, a change in product behavior, or a plan whose next work
depends on approval.

When you would otherwise ask in chat, use `ask_user` for a question or manual action
and `request_approval` for a proposed plan. Honor an explicit request to answer in
chat instead. Keep the host's own tool permission prompts intact. Follow
the fields and validation rules in the current MCP tool definition.

## Make a request someone can decide

State the decision needed, the relevant facts, and what happens after each option.
Offer clear options and mark one recommendation with its reason. Put the complete
plan or artifact in the request. Do not make the reviewer reconstruct it from chat
or terminal output.

The creation input includes `requestId`, `idempotencyKey`, `title`,
`contextMarkdown`, `options`, optional `recommendation`, `priority`, `revision`,
and source project and session IDs. `ask_user` also takes `kind`, either `question`
or `action`. `request_approval` sets the approval kind itself. Supply a revision such as
`plan-v1`. Needu stores that exact value, and the human decision must name it.
Record the returned request ID, idempotency key, revision, and latest delivered
cursor in the task notes before waiting. Tell the human where to answer and show the
ID and revision so they can recover after a restart. Approval applies only to that
revision.

## Submit independent decisions together

When several decisions are ready and none depends on another answer, use
`submit_requests` with a `requests` array. Supply the complete creation fields for
each item, including its explicit kind, unique request ID, idempotency key and
revision. Save those identities before submitting. Follow the tool's batch limit.

Each result names its request and reports `submitted` with the saved request or
`failed` with an error. Save every successful result even when another item fails.
Retry temporary failures with the same IDs, keys and unchanged content; replay the
same batch after an interrupted call. A permanent error needs correction or human
action. An item marked failed may still have committed before delivery failed, so
preserve its identity when retrying.

Start a separate `await_answer` for every pending successful request. Use concurrent
calls where the host supports them; otherwise start each as the host allows.
Submitting a batch is not waiting. Do not end with a summary that requests are
"waiting on you" before starting these calls, even when the preceding audit or
other independent work is finished.
Handle, save and acknowledge each event as it arrives. Do not hold completed
answers until the entire group finishes. Each decision releases only the work
that depends on its approved revision; work requiring multiple decisions waits
for all of them. Keep one owner for the batch and its waits. If a subagent needs
to own a request, have that subagent create it instead.

## Preserve the request identity

Retry a failed submission with the same idempotency key only when every submitted
field is identical. A same-key changed payload conflicts. If a request is waiting
for human review and its content changes, use `revise_request` with its exact current
revision, a new idempotency key, and a new immutable revision. If a human discussion
is waiting, use `reply_to_discussion` with an amendment instead. Never reuse an
approved revision for changed work.

If the human requests changes, the request remains open in `waiting_agent`. Treat
the feedback as discussion, reply on the same request with `reply_to_discussion`,
and include an amendment when the proposed content changed. The amendment creates
an immutable revision. A comment or clarification does not approve, reject, or
resolve a request.

## Wait and recover

Creation returns the durable request immediately; it does not start a wait. Start
`await_answer` for each pending request before ending the turn. Call it with its
`requestId`. Needu resumes after the creating agent's latest durable acknowledgment
when `afterCursor` is omitted; pass `afterCursor` only when using an explicitly saved
cursor. It returns the next event and its cursor. Save that cursor before handling
the event. A human discussion message grants no
permission. Reply on the same thread with
`reply_to_discussion`; handle later `agent_reply` events as part of that thread.
An agent edit produces a nonterminal `revision` event. Save and acknowledge
`revision` and `agent_reply` events, then keep waiting. Only a `decision` event
authorizes work, and only for its exact revision.

Record every returned event in durable task state before calling `ack_delivery`:
request ID, revision, cursor, event type, and its decision or discussion content.
Then call `ack_delivery` with the exact request ID and cursor. Acknowledgment records
delivery; it does not execute or approve the requested work. On timeout, disconnect,
or host restart, call `await_answer` again with the saved request ID. Recover and
handle any event whose cursor was not acknowledged. Keep dependent work blocked until
an explicit saved decision arrives. Silence never grants approval.

### One owner per wait

Use a subagent for the request and wait only when the main agent has independent,
already-authorized work to continue. Have that same subagent create the request,
wait, save the returned event, acknowledge it, and report the exact decision and
revision to the parent. Do not run a second wait for the same request in the parent.
The parent must keep dependent work blocked until it receives the saved decision.
If all remaining work depends on the answer, wait in the main agent.

After temporary connection errors, retry the existing request with a delay starting
at 1 second and doubling up to 60 seconds. A disconnected delivery does not cancel
the request. If authentication or access requires human action, report the problem
and preserve the request for recovery. Never retry a revoked connection indefinitely.

### Claude waits

Claude Code can move a long main-conversation MCP call to the background and deliver
its result to the same running session. When Claude reports that a wait is still
running in the background, leave that call running; do not start another wait.
Subagent calls remain foreground waits. Save and acknowledge the event when it
arrives. If Claude exits, recover the existing request on resume; a pending Needu
request alone cannot restart Claude. Honor an explicit request to stop waiting.

The Claude plugin checks that successful submissions in the current prompt have
started an `await_answer` call before Claude stops. A failed tool call does not
satisfy that check. A successful call, including Claude's native background handoff,
does. This check does not prove an answer has arrived or been saved. Continue the
save-and-acknowledge steps above when it arrives. Interrupting Claude or sending a
new prompt does not cancel any Needu request.

### Codex waits

In Codex, an `await_answer` tool call can leave its `functions.exec` cell running.
`Script running with cell ID ...` means Needu is still waiting. Keep that same cell
alive with `functions.wait` and `terminate: false`; do not terminate it because a
minute has passed. Do not return a final response while the request remains pending.

If the tool call times out or disconnects, keep the request open and call
`await_answer` again with the saved request ID. Do not create another request, change
the idempotency key, or treat the absence of an answer as permission. Honor an
explicit user request to stop waiting. Cancel the request only when the user asks to
withdraw it; otherwise stop delivery without changing the pending request.

After a restart, recover the ID, revision, and latest acknowledged cursor from prior
tool results or task notes for this task and project. Do not attach to a stale or
foreign request. If the request ID is unavailable, ask the user for it rather than
creating a replacement or repeatedly waiting on a guessed ID. Report the saved
decision and note. An approval permits only its described revision; rejection stops
it, and requested changes keep the same discussion open until a later explicit
decision.

Use `cancel_request` with the same ID and revision when withdrawing a pending
request. Only the OAuth client and user that created it can cancel it.

Only an explicit saved decision for the matching revision permits dependent work.
An agent OAuth grant can submit and read requests. It cannot approve its own work.

## Keep credentials with the user

The human browser-session holder completes Needu OAuth and MCP consent. Never
request, display, copy, or persist an access token, refresh token, client secret, or
registration token. If the MCP connection is missing or revoked, explain that the
user can reconnect it through the supported host flow. Use native questions or
chat while disconnected; an unavailable service never supplies approval.
