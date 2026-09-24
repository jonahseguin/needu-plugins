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

## Choose the wait owner before submitting

When the host can run a background subagent with Needu MCP tools, give it the
complete decision context and have it own the request by default. This keeps the
main conversation available for new instructions, even when it has no other work.
The subagent creates the request, saves its ID, key and revision, starts
`await_answer`, records each event before acknowledging its cursor, and reports
the exact decision and revision to the main agent. One subagent can own an entire
batch only when that host can start its separate waits concurrently. Otherwise,
give each independent request to a separate background subagent that submits and
waits for its own item. The main agent does not start a second wait or act
on work that needs the answer before the saved decision reaches it. Keep the
lead task open and do not send a final response until the subagent reports the
saved decision, unless the human explicitly stops waiting or withdraws the
request. Accept new instructions during the background wait.

If background subagents or their Needu MCP tools are unavailable, the current
agent owns creation and delivery. Use a native background handoff for that same
MCP wait when the host actually supports it; otherwise wait in the foreground.
Keep the original owner when a request already exists. Moving only the wait to a
new subagent does not move the creation receipt or its Stop guard. Keep the task
open until this owner has saved and acknowledged the answer, unless the human
explicitly stops waiting or withdraws the request.

## Make a request someone can decide

State the decision needed, the relevant facts, and what happens after each option.
For multiple-choice questions, set `recommendedOptionId` to the `id` of the option
you actually recommend. Explain why in `recommendation` prose or the question
context. Choose from the stated options, not their order. For a neutral fact
question or a personal preference only the person can judge, omit the field
instead of inventing a recommendation. Put the complete plan or artifact
in the request; do not make the reviewer reconstruct it from chat or terminal output.

The creation input includes `requestId`, `idempotencyKey`, `title`,
`contextMarkdown`, `options`, optional `recommendation`, `priority`, `revision`,
and source project and session IDs. `ask_user` also takes `kind`, either `question`
or `action`. `request_approval` sets the approval kind itself. Supply a revision such as
`plan-v1`. Needu stores that exact value, and the human decision must name it.
Use `recommendedOptionId` only for question choices. For an approval, put any
suggestion and its reason in `recommendation` prose.
The Claude plugin's PreToolUse hook replaces the source session ID with Claude's
real session ID and adds its title when SessionStart supplied one. Provide the
source project ID, and do not invent a session title.
Record the returned request ID, idempotency key, revision, and latest delivered
cursor in the task notes before waiting. Tell the human where to answer and show the
ID and revision so they can recover after a restart. Approval applies only to that
revision.

## Submit independent decisions together

When several decisions are ready and none depends on another answer, use
`submit_requests` with a `requests` array if one owner can start every wait
concurrently. Otherwise give each item to its own background subagent for
separate submission and delivery; do not have the lead submit a batch and hand
its waits to other agents. Supply the complete creation fields for
each item, including its explicit kind, unique request ID, idempotency key and
revision. Set `recommendedOptionId` against that item's options when you recommend
a choice on a question item. Save those identities before submitting. Follow the tool's
batch limit.

Each result names its request and reports `submitted` with the saved request or
`failed` with an error. Save every successful result even when another item fails.
Retry temporary failures with the same IDs, keys and unchanged content; replay the
same batch after an interrupted call. A permanent error needs correction or human
action. An item marked failed may still have committed before delivery failed, so
preserve its identity when retrying.

Start a separate `await_answer` for every pending successful request. Use concurrent
calls for a batch; if the host cannot start them concurrently, use separate owners
for future independent requests rather than assuming sequential waits deliver
every answer promptly.
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
is waiting, use `reply_to_discussion` with an amendment instead. A new question
revision or amendment has its own options and `recommendedOptionId`; choose the ID
again if you still recommend an option. Never reuse an approved revision for changed work.

If the human requests changes, the request remains open in `waiting_agent`. Treat
the feedback as discussion, reply on the same request with `reply_to_discussion`,
and include an amendment when the proposed content changed. The amendment creates
an immutable revision. A comment or clarification does not approve, reject, or
resolve a request.

## Wait and recover

Creation returns the durable request immediately; it does not start a wait. Start
`await_answer` for each pending request before ending the turn. Call it with its
`requestId`. Needu resumes after this connection's latest durable acknowledgment
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

### Resume the owner

If a background subagent times out or stops, resume that same subagent and its
saved request when the host supports it. Before another agent waits, confirm the
original wait is no longer active. Recover the same request through `get_request`
or `list_requests`, preserve its ID, revision and latest acknowledged cursor,
then call `await_answer` and record the new wait owner. If the original wait's
state is unknown, do not start a second wait; report the delivery problem. A
replacement agent does not inherit the original creation receipt or its Stop
guard. Keep dependent work blocked and do not claim that a pending request will
restart an exited host.

After temporary connection errors, retry the existing request with a delay starting
at 1 second and doubling up to 60 seconds. A disconnected delivery does not cancel
the request. If authentication or access requires human action, report the problem
and preserve the request for recovery. Never retry a revoked connection indefinitely.

## Find a request after switching connections

When the person asks to recover a request but its ID is unavailable, call
`list_requests` for open requests in their workspace. It returns 20 summaries at a
time; use `offset` for the next page. Match the project, session title or ID, and
request title with the person's task, then call `get_request` to inspect the exact
request. Ask the person to choose if more than one fits. Do not resume or acknowledge
an unconfirmed request. A new connection can call `await_answer` for a confirmed
request and keeps its own delivery cursor. Record each returned event before
acknowledging it. Listing and reading never acknowledge an event.

### Claude waits

In interactive Claude Code, prefer a background subagent that can use the Needu
MCP tools and owns creation through acknowledgement. Its result reaches the main
conversation after it finishes. Claude can also move a long main-conversation MCP
call to the background and deliver its result to the same running session. If
Claude reports that handoff, leave that call running without starting another
wait. Save and acknowledge the event when it arrives. If Claude exits, recover
the existing request on resume; a pending Needu request alone cannot restart
Claude. Honor an explicit request to stop waiting.

The Claude plugin checks that successful submissions in the current prompt have
started an `await_answer` call before Claude stops. A failed tool call does not
satisfy that check. A successful call, including Claude's native background handoff,
does. This check does not prove an answer has arrived or been saved. Continue the
save-and-acknowledge steps above when it arrives. Interrupting Claude or sending a
new prompt does not cancel any Needu request.

### Codex waits

In Codex, prefer a background subagent that can use the Needu MCP tools and owns
creation through acknowledgement. If that is unavailable and the current agent
owns the request, an `await_answer` tool call can leave its `functions.exec` cell
running. `Script running with cell ID ...` means Needu is still waiting. Keep
that same cell alive with `functions.wait` and `terminate: false`; do not
terminate it because a minute has passed. Do not close the lead task while its
child is waiting. The lead can take new instructions during the background
wait; the child reports success only after it saves the decision and
acknowledges its cursor.

If the tool call times out or disconnects, keep the request open and call
`await_answer` again with the saved request ID. Do not create another request, change
the idempotency key, or treat the absence of an answer as permission. Honor an
explicit user request to stop waiting. Cancel the request only when the user asks to
withdraw it; otherwise stop delivery without changing the pending request.

After a restart, recover the ID, revision, and latest acknowledged cursor from prior
tool results or task notes for this task and project. If the ID is unavailable,
use `list_requests` and `get_request` as described above. Report the saved
decision and note. An approval permits only its described revision; rejection stops
it, and requested changes keep the same discussion open until a later explicit
decision.

Use `cancel_request` with the same ID and revision when withdrawing a pending
request. The signed-in workspace member can cancel it; the original author stays
visible in Needu.

Only an explicit saved decision for the matching revision permits dependent work.
An agent OAuth grant can submit and read requests. It cannot approve its own work.

## Keep credentials with the user

The human browser-session holder completes Needu OAuth and MCP consent. Never
request, display, copy, or persist an access token, refresh token, client secret, or
registration token. If the MCP connection is missing or revoked, explain that the
user can reconnect it through the supported host flow. Use native questions or
chat while disconnected; an unavailable service never supplies approval.
