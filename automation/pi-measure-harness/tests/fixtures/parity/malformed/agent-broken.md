This file is intentionally malformed.

It has no YAML frontmatter delimiters (no leading `---` line), so
`parseAgentFile`'s frontmatter regex will fail to match. The
`rosterParity` contract must catch this as a `malformed_agent_file`
finding named "agent-broken" with a path label, and continue loading
the other agents in the directory.