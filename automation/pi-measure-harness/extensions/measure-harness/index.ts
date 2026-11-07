import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { StringEnum } from "@earendil-works/pi-ai";
import { getAgentDir, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import {
  agentParity,
  hasMeasureResultBlock,
  isTaskAllowed,
  loadAgents,
  sha256,
  splitModel,
  toolPolicyViolation,
  toolsForAgent,
} from "../../lib/core.mjs";
import {
  classifyObservedRouting,
  computeRoleDefinitionHash,
  extractObservedRouting,
  runtimeModelStrict,
} from "../../lib/observed-routing.mjs";

type AgentDefinition = ReturnType<typeof loadAgents>[number];

interface TaskReceipt {
  taskId: string;
  continuedFrom?: string;
  parentAgent: string;
  childAgent: string;
  parentSessionId: string;
  cwd: string;
  model?: string;
  promptHash: string;
  outputHash: string;
  startHead?: string;
  endHead?: string;
  exitCode: number;
  startedAt: string;
  completedAt: string;
  resultPath?: string;
  command?: string;
  finalOutput: string;
  stderr: string;
  logPath: string;
  requestedModel?: string;
  observedModel?: string;
  observedAt?: string;
  roleDefinitionHash?: string;
  routingClassification?: {
    class: string;
    reason?: string;
    requestedModel?: string;
    observedModel?: string;
  };
}

interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "high" | "medium" | "low";
}

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const agents = loadAgents(resolve(packageRoot, "agents"));
const agentByName = new Map(agents.map((agent) => [agent.name, agent]));
const taskDir = resolve(getAgentDir(), "measure-harness", "tasks");

function gitHead(cwd: string): string | undefined {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

function finalAssistantText(events: unknown[]): string {
  for (let index = events.length - 1; index >= 0; index--) {
    const event = events[index] as { type?: string; message?: { role?: string; content?: Array<{ type?: string; text?: string }> } };
    if (event.type !== "message_end" || event.message?.role !== "assistant") continue;
    const text = event.message.content?.find((part) => part.type === "text")?.text;
    if (text) return text;
  }
  return "";
}

function receiptPath(taskId: string): string {
  return resolve(taskDir, `${taskId}.json`);
}

function readContinuation(taskId?: string): TaskReceipt | undefined {
  if (!taskId) return undefined;
  const path = receiptPath(taskId);
  if (!existsSync(path)) throw new Error(`Unknown task_id: ${taskId}`);
  return JSON.parse(readFileSync(path, "utf8")) as TaskReceipt;
}

function runtimeModel(agent: AgentDefinition): string | undefined {
  return runtimeModelStrict(agent).model;
}

function getSelectedAgentName(pi: ExtensionAPI): string {
  const flag = pi.getFlag("agent");
  if (typeof flag === "string" && flag) return flag;
  return process.env.PI_MEASURE_AGENT || "measure-orchestrator";
}

export default function measureHarness(pi: ExtensionAPI) {
  let activeAgent = agentByName.get(process.env.PI_MEASURE_AGENT || "measure-orchestrator") ?? agents[0];
  let todos: TodoItem[] = [];

  pi.registerFlag("agent", {
    description: "Pi Measure harness agent name",
    type: "string",
  });

  async function applyAgent(name: string, ctx: ExtensionContext): Promise<boolean> {
    const agent = agentByName.get(name);
    if (!agent) {
      ctx.ui.notify(`Unknown agent: ${name}`, "error");
      return false;
    }
    activeAgent = agent;
    const modelRef = runtimeModel(agent);
    if (modelRef) {
      const model = splitModel(modelRef);
      const registered = model ? ctx.modelRegistry.find(model.provider, model.id) : undefined;
      if (!registered) {
        ctx.ui.notify(`Agent ${name}: model not registered: ${modelRef}`, "error");
        return false;
      }
      const selected = await pi.setModel(registered);
      if (!selected) {
        ctx.ui.notify(`Agent ${name}: model has no usable credential: ${modelRef}`, "error");
        return false;
      }
    }
    pi.setThinkingLevel(activeAgent.thinkingLevel);
    const available = new Set(pi.getAllTools().map((tool) => tool.name));
    pi.setActiveTools(toolsForAgent(activeAgent).filter((tool) => available.has(tool)));
    ctx.ui.setStatus("measure-agent", `agent:${name}`);
    return true;
  }

  pi.registerCommand("agent", {
    description: "Select a packaged Measure or coder agent",
    handler: async (args, ctx) => {
      const name = args.trim();
      if (!name) {
        const selected = await ctx.ui.select("Select agent", agents.map((agent) => `${agent.name} - ${agent.description}`));
        if (!selected) return;
        await applyAgent(selected.split(" - ")[0], ctx);
        return;
      }
      await applyAgent(name, ctx);
    },
  });

  pi.registerTool({
    name: "question",
    label: "Question",
    description: "Ask the user one or more structured questions.",
    parameters: Type.Object({
      questions: Type.Array(Type.Object({
        question: Type.String(),
        header: Type.String(),
        options: Type.Array(Type.Object({ label: Type.String(), description: Type.String() })),
        multiple: Type.Optional(Type.Boolean()),
      })),
    }),
    async execute(_id, params, _signal, _update, ctx) {
      if (!ctx.hasUI) {
        return { content: [{ type: "text", text: "Structured questions require interactive or RPC UI." }], details: {}, isError: true };
      }
      const answers: string[][] = [];
      for (const question of params.questions) {
        if (question.multiple) {
          const selected: string[] = [];
          for (const option of question.options) {
            if (await ctx.ui.confirm(question.header, `${question.question}\n\n${option.label}: ${option.description}`)) selected.push(option.label);
          }
          answers.push(selected);
        } else {
          const value = await ctx.ui.select(`${question.header}: ${question.question}`, question.options.map((option) => option.label));
          answers.push(value ? [value] : []);
        }
      }
      return { content: [{ type: "text", text: JSON.stringify({ answers }) }], details: { answers } };
    },
  });

  pi.registerTool({
    name: "todowrite",
    label: "Todo Write",
    description: "Replace the structured todo list for the current session.",
    parameters: Type.Object({
      todos: Type.Array(Type.Object({
        content: Type.String(),
        status: StringEnum(["pending", "in_progress", "completed", "cancelled"] as const),
        priority: StringEnum(["high", "medium", "low"] as const),
      })),
    }),
    async execute(_id, params) {
      const inProgress = params.todos.filter((todo) => todo.status === "in_progress");
      if (inProgress.length > 1) {
        return { content: [{ type: "text", text: "Only one todo may be in progress." }], details: { todos }, isError: true };
      }
      todos = params.todos as TodoItem[];
      pi.appendEntry("measure-todos", { todos });
      return { content: [{ type: "text", text: JSON.stringify(todos, null, 2) }], details: { todos } };
    },
  });

  pi.registerTool({
    name: "task",
    label: "Task",
    description: "Run a packaged subagent in an isolated Pi process with provenance receipts.",
    parameters: Type.Object({
      description: Type.String(),
      prompt: Type.String(),
      subagent_type: Type.String(),
      task_id: Type.Optional(Type.String()),
      command: Type.Optional(Type.String()),
      result_path: Type.Optional(Type.String()),
    }),
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const child = agentByName.get(params.subagent_type);
      if (!child) return { content: [{ type: "text", text: `Unknown subagent: ${params.subagent_type}` }], details: {}, isError: true };
      if (!isTaskAllowed(activeAgent.name, child.name)) {
        return { content: [{ type: "text", text: `${activeAgent.name} may not invoke ${child.name}` }], details: {}, isError: true };
      }

      let continuation: TaskReceipt | undefined;
      try {
        continuation = readContinuation(params.task_id);
      } catch (error) {
        return { content: [{ type: "text", text: String(error) }], details: {}, isError: true };
      }
      if (continuation && continuation.childAgent !== child.name) {
        return { content: [{ type: "text", text: "task_id cannot be resumed with a different subagent type" }], details: {}, isError: true };
      }

      mkdirSync(taskDir, { recursive: true, mode: 0o700 });
      const taskId = randomUUID();
      const logPath = resolve(taskDir, `${taskId}.jsonl`);
      const startedAt = new Date().toISOString();
      const startHead = gitHead(ctx.cwd);
      const resolvedModel = runtimeModelStrict(child);
      if (resolvedModel.error) {
        return {
          content: [{ type: "text", text: `undeclared_child_pin: ${resolvedModel.error.role ?? child.name} has no model: frontmatter` }],
          details: { error: resolvedModel.error, requestedModel: undefined },
          isError: true,
        };
      }
      const modelRef = resolvedModel.model;
      const model = modelRef ? splitModel(modelRef) : undefined;
      if (model && !ctx.modelRegistry.find(model.provider, model.id)) {
        return { content: [{ type: "text", text: `Required model is not registered: ${modelRef}` }], details: {}, isError: true };
      }
      const roleDefinitionHash = computeRoleDefinitionHash(child.systemPrompt);

      const continuationText = continuation
        ? `\n\nContinuation from task ${continuation.taskId}:\n${continuation.finalOutput}`
        : "";
      const fullPrompt = `Task: ${params.prompt}${continuationText}`;
      const args = ["--mode", "json", "-p", "--no-session", "--approve", "--agent", child.name];
      if (modelRef) args.push("--model", modelRef);
      args.push("--thinking", child.thinkingLevel, "--tools", toolsForAgent(child).join(","), fullPrompt);

      const events: unknown[] = [];
      const rawLines: string[] = [];
      let stderr = "";
      let aborted = false;
      const exitCode = await new Promise<number>((resolveExit) => {
        const processHandle = spawn("pi", args, {
          cwd: ctx.cwd,
          env: {
            ...process.env,
            PI_MEASURE_AGENT: child.name,
            PI_MEASURE_TASK_ID: taskId,
            PI_MEASURE_PARENT_SESSION_ID: ctx.sessionManager.getSessionId(),
            PI_MEASURE_RESULT_PATH: params.result_path ?? "",
          },
          shell: false,
          stdio: ["ignore", "pipe", "pipe"],
        });
        let buffer = "";
        processHandle.stdout.on("data", (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            rawLines.push(line);
            try { events.push(JSON.parse(line)); } catch { /* preserve malformed output in the log */ }
          }
          onUpdate?.({ content: [{ type: "text", text: `${child.name} running (${rawLines.length} events)` }], details: { taskId, child: child.name } });
        });
        processHandle.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
        processHandle.on("error", (error) => { stderr += String(error); resolveExit(1); });
        processHandle.on("close", (code) => {
          if (buffer.trim()) {
            rawLines.push(buffer);
            try { events.push(JSON.parse(buffer)); } catch { /* logged below */ }
          }
          resolveExit(code ?? 1);
        });
        const abort = () => {
          aborted = true;
          processHandle.kill("SIGTERM");
          setTimeout(() => processHandle.kill("SIGKILL"), 5000).unref();
        };
        if (signal?.aborted) abort();
        else signal?.addEventListener("abort", abort, { once: true });
      });

      writeFileSync(logPath, `${rawLines.join("\n")}\n`, { mode: 0o600 });
      const finalOutput = finalAssistantText(events);
      const observedModel = extractObservedRouting(events as Array<{ type?: string; message?: { model?: string } }>);
      const routingClassification = classifyObservedRouting(modelRef ?? "", observedModel);
      const observedAt = (() => {
        for (const event of events) {
          const candidate = event as { type?: string; message?: { model?: string; timestamp?: string } };
          if (candidate?.type !== "message_start") continue;
          if (typeof candidate.message?.timestamp === "string") return candidate.message.timestamp;
        }
        return undefined;
      })();
      const receipt: TaskReceipt = {
        taskId,
        continuedFrom: continuation?.taskId,
        parentAgent: activeAgent.name,
        childAgent: child.name,
        parentSessionId: ctx.sessionManager.getSessionId(),
        cwd: ctx.cwd,
        model: modelRef,
        requestedModel: modelRef,
        observedModel,
        observedAt,
        roleDefinitionHash,
        routingClassification,
        promptHash: sha256(fullPrompt),
        outputHash: sha256(finalOutput),
        startHead,
        endHead: gitHead(ctx.cwd),
        exitCode,
        startedAt,
        completedAt: new Date().toISOString(),
        resultPath: params.result_path,
        command: params.command,
        finalOutput,
        stderr,
        logPath,
      };
      writeFileSync(receiptPath(taskId), `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });

      const missingResultBlock = child.name.startsWith("measure-") && child.name !== "measure-orchestrator" && !hasMeasureResultBlock(finalOutput);
      const missingArtifact = Boolean(params.result_path && !existsSync(params.result_path));
      const routingFailure = routingClassification.class === "unverified_routing";
      const failed = aborted || exitCode !== 0 || !finalOutput || missingResultBlock || missingArtifact || routingFailure;
      const diagnostics = [
        aborted ? "child aborted" : "",
        exitCode !== 0 ? `exit ${exitCode}` : "",
        !finalOutput ? "no final assistant output" : "",
        missingResultBlock ? "missing MEASURE_AGENT_RESULT block" : "",
        missingArtifact ? `missing result artifact: ${params.result_path}` : "",
        routingFailure ? `${routingClassification.reason}: requested=${routingClassification.requestedModel ?? modelRef ?? "(none)"} observed=${routingClassification.observedModel ?? "(none)"}` : "",
        stderr.trim(),
      ].filter(Boolean).join("; ");

      return {
        content: [{ type: "text", text: failed ? `Task ${taskId} failed: ${diagnostics}` : `${finalOutput}\n\nTask ID: ${taskId}` }],
        details: { receipt },
        isError: failed,
      };
    },
  });

  async function doctor(ctx: ExtensionContext) {
    const parity = agentParity(agents);
    const requiredPaths = [
      resolve(process.env.HOME ?? "", ".agents/skills/measure/SKILL.md"),
      resolve(process.env.HOME ?? "", ".agents/skills/measure-orchestrator/SKILL.md"),
      resolve(process.env.HOME ?? "", ".agents/skills/measure-orchestrator/references/contracts.md"),
      resolve(process.env.HOME ?? "", ".agents/skills/measure-orchestrator/scripts/measure_interphase_checks.py"),
    ];
    const missingPaths = requiredPaths.filter((path) => !existsSync(path));
    const requiredModels = [...new Set(agents.map((agent) => agent.model).filter(Boolean))] as string[];
    const missingModels = requiredModels.filter((ref) => {
      const model = splitModel(ref);
      return !model || !ctx.modelRegistry.find(model.provider, model.id);
    });
    return { ok: parity.ok && missingPaths.length === 0 && missingModels.length === 0, parity, missingPaths, missingModels };
  }

  pi.registerCommand("measure-doctor", {
    description: "Validate Measure agent, skill, script, and model parity",
    handler: async (_args, ctx) => {
      const result = await doctor(ctx);
      ctx.ui.notify(JSON.stringify(result, null, 2), result.ok ? "info" : "error");
    },
  });

  pi.registerTool({
    name: "measure_doctor",
    label: "Measure Doctor",
    description: "Validate Measure harness parity before orchestration.",
    parameters: Type.Object({}),
    async execute(_id, _params, _signal, _update, ctx) {
      const result = await doctor(ctx);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result, isError: !result.ok };
    },
  });

  pi.on("tool_call", (event) => {
    const reason = toolPolicyViolation(activeAgent.name, event.toolName, event.input, process.env.PI_MEASURE_RESULT_PATH);
    if (reason) return { block: true, reason };
  });

  pi.on("before_agent_start", (event) => ({
    systemPrompt: `${event.systemPrompt}\n\n<selected_agent name="${activeAgent.name}">\n${activeAgent.systemPrompt}\n</selected_agent>`,
  }));

  pi.on("session_start", async (_event, ctx) => {
    const savedTodos = ctx.sessionManager.getEntries()
      .filter((entry: { type: string; customType?: string }) => entry.type === "custom" && entry.customType === "measure-todos")
      .pop() as { data?: { todos?: TodoItem[] } } | undefined;
    todos = savedTodos?.data?.todos ?? [];
    await applyAgent(getSelectedAgentName(pi), ctx);
  });
}
