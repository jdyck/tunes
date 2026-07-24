# Working with agents

Guidance for Codex, Claude, and other agents sharing this local repository.

## Best-practice pushback

When a requested change or current implementation conflicts with a well-founded
best practice, explain the concern directly, name the safer or more conventional
pattern, and connect it to this project's code or decisions. Distinguish firm
correctness, security, privacy, and maintainability concerns from subjective
preferences. Continue helping once the tradeoff is clear; do not quietly work
around it or turn a preference into a hard rule.

## Shared-worktree hygiene

- Check `git status --short` before editing and before finishing.
- Treat unfamiliar changes as owner or other-agent work.
- Do not revert, overwrite, stage, or otherwise absorb unfamiliar changes
  without inspecting them and confirming they belong in the current task.
- If another agent changed a file needed by the current task, merge deliberately
  and preserve both intents. Stop for owner direction when they conflict.
- Put reusable project knowledge in committed docs, not tool-specific memory.
  Put provisional coordination in `local/wip/`.

## Handoff

Leave the code, committed docs, and relevant local plan accurate enough that a
different agent can continue without relying on conversation history. Before
finishing, state which documentation changed or report `Docs impact: none.`
after checking.
