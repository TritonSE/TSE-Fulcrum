import { RemoteSelectionManager } from "@convergencelabs/monaco-collab-ext";
import Editor, { type Monaco } from "@monaco-editor/react";
import { Button } from "@tritonse/tse-constellation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Dropdown } from "react-bootstrap";
import Markdown from "react-markdown";
import { useLocation } from "react-router-dom";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp";
import { dark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { io, type Socket } from "socket.io-client";
import { twMerge } from "tailwind-merge";

import TSELogo from "../components/TSELogo";
import { useIsTabFocused } from "../hooks/focus";

import type { editor as MonacoEditor } from "monaco-editor";

SyntaxHighlighter.registerLanguage("cpp", cpp);

const LANGS = ["python", "javascript", "java", "cpp", "text"];
const SECOND = 1000;
const FUDGE = SECOND / 2; // Half second bump to ensure timer starts at 50:00
const INTERVIEW_DURATION = 50 * 60 * SECOND; // 50 minutes
const INTERVIEWEE = 0;
const INTERVIEWER = 1;

// Marks a boundary between parts in the question markdown, e.g. `<!-- PART -->`.
// Kept in sync with backend/src/services/InterviewService.ts.
const PART_MARKER = /<!--\s*PART\s*-->/;
const countParts = (question: string) => question.split(PART_MARKER).length;

// Character offset where each part (after part 0) begins, in document order.
const getPartStartOffsets = (question: string): number[] => {
  const regex = /<!--\s*PART\s*-->/g;
  const offsets: number[] = [];
  let match = regex.exec(question);

  while (match !== null) {
    offsets.push(match.index + match[0].length);
    match = regex.exec(question);
  }

  return offsets;
};

// Mirrors InterviewService.ts so the interviewer's preview
// shows exactly what the interviewee is currently gated to see.
//
// These are only invoked on the Interviewer's side. Interviewee question
// visibility is handled server-side.
const splitQuestionParts = (question: string): string[] =>
  question.split(PART_MARKER).map((part) => part.trim());

const clampStage = (stg: number, partCount: number): number => {
  if (partCount <= 0) return 0;
  return Math.min(Math.max(stg, 0), partCount - 1);
};

const getVisibleQuestion = (question: string, stg: number): string => {
  const parts = splitQuestionParts(question);
  const visibleThrough = clampStage(stg, parts.length);

  return parts.slice(0, visibleThrough + 1).join("\n\n");
};

const css = `
  .divider:hover {
    background: var(--bs-primary) !important;
  }
  .timer:hover {
    opacity: 1 !important;
  }
  .interview-inactive-part-bg {
    background-color: rgba(255, 0, 0, 0.12);
  }
  .mode-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: white;
    user-select: none;
  }
  .mode-toggle-switch {
    position: relative;
    width: 44px;
    height: 24px;
    border-radius: 12px;
    background: #555;
    cursor: pointer;
    transition: background 0.2s;
    flex-shrink: 0;
  }
  .mode-toggle-switch.active {
    background: var(--bs-primary, #0d6efd);
  }
  .mode-toggle-switch-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    transition: transform 0.2s;
  }
  .mode-toggle-switch.active .mode-toggle-switch-knob {
    transform: translateX(20px);
  }
`;

type InterviewState = {
  room: string;
  question: string;
  code: string;
  language: string;
  active: boolean;
  timerStart: number;
  lastUpdate: Date;
  stage: number;
};

type ValidKeys = "question" | "code" | "language" | "active" | "timerStart" | "stage";

type Payload = {
  userId: string;
  key: ValidKeys;
  value: string | boolean | number;
};

type SelectionPayload = {
  role: number;
  from: number;
  to: number;
};

type Callbacks = {
  [key: string]: (p: Payload) => void;
};

type EditorInstance = {
  editor: MonacoEditor.IStandaloneCodeEditor;
  monaco: Monaco;
};

type CodeProps = {
  children?: ReactNode;
  className?: string;
};

type TimerProps = {
  role: number;
  since: number;
  start: () => void;
};

type RemoteSelection = {
  setOffsets: (start: number, end: number) => void;
  show: () => void;
  hide: () => void;
};

// eslint-disable-next-line react/no-unstable-default-props
function CodeBlock({ children = [], className = "", ...rest }: CodeProps) {
  const match = /language-(\w+)/.exec(className || "");
  const monospacedDark = {
    ...dark,
    'code[class*="language-"]': {
      ...dark['code[class*="language-"]'],
      fontFamily: "Source Code Pro, monospace",
    },
    'pre[class*="language-"]': {
      ...dark['pre[class*="language-"]'],
      fontFamily: "Source Code Pro, monospace",
    },
    'span[class="token"]': {
      fontFamily: "Source Code Pro, monospace",
    },
  };

  return match ? (
    <SyntaxHighlighter
      {...rest}
      style={monospacedDark}
      language={match[1]}
      PreTag="div"
      customStyle={{
        fontSize: "14px",
        lineHeight: "1.5",
      }}
    >
      {String(children).replace(/\n$/, "") ?? ""}
    </SyntaxHighlighter>
  ) : (
    <code {...rest} className={twMerge(className, "tw:font-mono")}>
      {children}
    </code>
  );
}

function MarkdownImage({
  src,
  alt,
  height,
  width,
}: React.ClassAttributes<HTMLImageElement> & React.ImgHTMLAttributes<HTMLImageElement>) {
  return <img src={src?.replace("&amp;", "&")} alt={alt} height={height} width={width} />;
}

function Timer({ role, since, start }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(INTERVIEW_DURATION + FUDGE);
  const [visible, setVisible] = useState<boolean>(true);

  useEffect(() => {
    if (since === 0) setTimeLeft(INTERVIEW_DURATION + FUDGE);
    else setTimeLeft(since + INTERVIEW_DURATION - Date.now() + FUDGE);
  }, [since]);
  useEffect(() => {
    // See consistent-return eslint rule
    if (since === 0) return () => {};

    const timeout = setTimeout(() => setTimeLeft(since + INTERVIEW_DURATION - Date.now()), SECOND);

    return () => clearTimeout(timeout);
  }, [timeLeft]);

  const format = () =>
    `${Math.floor(timeLeft / (60 * SECOND))
      .toString()
      .padStart(2, "0")}:${(Math.floor(timeLeft / SECOND) % 60).toString().padStart(2, "0")}`;

  const view = visible ? (
    <span>{format()}&nbsp;(click to hide)</span>
  ) : (
    <svg
      style={{ width: "1rem", height: "1rem" }}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 36 36"
    >
      <path
        fill="#FFE8B6"
        d="M21 18c0-2.001 3.246-3.369 5-6 2-3 2-10 2-10H8s0 7 2 10c1.754 2.631 5 3.999 5 6s-3.246 3.369-5 6c-2 3-2 10-2 10h20s0-7-2-10c-1.754-2.631-5-3.999-5-6z"
      />
      <path
        fill="#FFAC33"
        d="M20.999 24c-.999 0-2.057-1-2.057-2C19 20.287 19 19.154 19 18c0-3.22 3.034-4.561 4.9-7H12.1c1.865 2.439 4.9 3.78 4.9 7 0 1.155 0 2.289.058 4 0 1-1.058 2-2.058 2-2 0-3.595 1.784-4 3-1 3-1 7-1 7h16s0-4-1-7c-.405-1.216-2.001-3-4.001-3z"
      />
      <path
        fill="#3B88C3"
        d="M30 34c0 1.104-.896 2-2 2H8c-1.104 0-2-.896-2-2s.896-2 2-2h20c1.104 0 2 .896 2 2zm0-32c0 1.104-.896 2-2 2H8c-1.104 0-2-.896-2-2s.896-2 2-2h20c1.104 0 2 .896 2 2z"
      />
    </svg>
  );

  return (
    <button
      className="timer"
      type="button"
      style={{
        position: "fixed",
        left: 0,
        bottom: 0,
        background: "white",
        padding: "0.5rem",
        cursor: "pointer",
        border: "none",
        opacity: 0.5,
        transition: "opacity 0.2s",
        fontVariantNumeric: "tabular-nums",
      }}
      onClick={() => {
        if (since > 0 || role === INTERVIEWEE) setVisible(!visible);
        else if (role === INTERVIEWER) start();
      }}
    >
      {since === 0 && role === INTERVIEWER && <span>Click to start timer</span>}
      {role === INTERVIEWEE || (since > 0 && role === INTERVIEWER) ? view : null}
    </button>
  );
}

export default function Interview() {
  const location = useLocation();

  const [socket, setSocket] = useState<Socket>();

  const [active, setActive] = useState<boolean>(false);
  const [timerStart, setTimerStart] = useState<number>(0);
  const [language, setLanguage] = useState<string>("python");
  const [userId] = useState<string>(Math.random().toString());
  const [questionContent, setQuestionContent] = useState<string>();
  const [editorWidth, setEditorWidth] = useState<number>(50);
  const [mouseDown, setMouseDown] = useState<boolean>(false);
  const [blinking, setBlinking] = useState<boolean>(false);
  const [selectFrom, setSelectFrom] = useState<number>(-1);
  const [selectTo, setSelectTo] = useState<number>(-1);
  const [stage, setStage] = useState<number>(0); // prefer changeStage over setStage
  const [partCount, setPartCount] = useState<number>(1);

  const questionEditor = useRef<EditorInstance | null>(null);
  const codeEditor = useRef<EditorInstance | null>(null);
  const remoteSelection = useRef<RemoteSelection | null>(null);
  const inactivePartDecorations = useRef<MonacoEditor.IEditorDecorationsCollection | null>(null);
  const stageRef = useRef<number>(0); // exclusively for keeping the editor decorations up-to-date

  const [intervieweeFocused, setIntervieweeFocused] = useState<boolean>(true);
  const [mode, setMode] = useState<"editor" | "preview">("preview");

  const isFocused = useIsTabFocused();

  const role = location.pathname.includes("/review/") ? INTERVIEWER : INTERVIEWEE;

  useEffect(() => {
    if (!socket || role !== INTERVIEWEE || !active) return;
    socket.emit("focus", { role, focused: isFocused });
  }, [isFocused, active, socket, role]);

  const editorOptions = {
    quickSuggestions: false,
    suggest: {
      showFields: false,
      showFunctions: false,
    },
    minimap: { enabled: false },
  };
  const separatorWidth = 5;

  const sendMessage = (key: string, value: string | boolean | number) => {
    if (!socket || !socket.connected) return;

    socket.emit("message", {
      userId,
      key,
      value,
    });
  };
  const refreshInactivePartDecorations = (text: string, currentStage: number) => {
    if (role !== INTERVIEWER || !questionEditor.current) return;

    const { editor, monaco } = questionEditor.current;
    const mod = editor.getModel();
    if (!mod) return;

    const partStartOffsets = getPartStartOffsets(text);
    const dimFromOffset = partStartOffsets[currentStage];

    const decorations =
      dimFromOffset === undefined
        ? []
        : [
            {
              range: new monaco.Range(
                mod.getPositionAt(dimFromOffset).lineNumber,
                1,
                mod.getLineCount(),
                mod.getLineMaxColumn(mod.getLineCount()),
              ),
              options: {
                isWholeLine: true,
                className: "interview-inactive-part-bg",
              },
            },
          ];

    if (inactivePartDecorations.current) {
      inactivePartDecorations.current.set(decorations);
    } else {
      inactivePartDecorations.current = editor.createDecorationsCollection(decorations);
    }
  };
  const onMount =
    (isCode: boolean) => (editor: MonacoEditor.IStandaloneCodeEditor, monaco: Monaco) => {
      if (isCode) {
        codeEditor.current = { editor, monaco };

        const selMgr = new RemoteSelectionManager({ editor });
        remoteSelection.current = selMgr.addSelection(
          role === INTERVIEWER ? "Interviewee" : "Interviewer",
          "blue",
        );

        editor.onDidChangeCursorSelection((e) => {
          const mod = editor.getModel();
          if (!mod || !socket) return;

          const sel = e.selection;
          const from = mod.getOffsetAt({
            column: sel.startColumn,
            lineNumber: sel.startLineNumber,
          });
          const to = mod.getOffsetAt({
            column: sel.endColumn,
            lineNumber: sel.endLineNumber,
          });

          // Debounce duplicate events
          if (selectFrom === from && selectTo === to) return;

          setSelectFrom(from);
          setSelectTo(to);
        });
      } else {
        questionEditor.current = { editor, monaco };
      }

      if ((isCode && role === INTERVIEWER) || (!isCode && role === INTERVIEWEE)) {
        editor.updateOptions({ readOnly: true });
      }

      editor.onDidChangeModelContent((e) => {
        if (e.isFlush) return;

        const val = editor.getValue();
        sendMessage(isCode ? "code" : "question", val);
        if (!isCode) {
          setQuestionContent(val);
          setPartCount(countParts(val));
          refreshInactivePartDecorations(val, stageRef.current);
        }
      });

      if (socket) {
        socket.emit("getState");
      }
    };
  const changeStage = (delta: number) => {
    const newStage = Math.max(0, Math.min(stage + delta, partCount - 1));
    setStage(newStage);
    sendMessage("stage", newStage);

    const text = questionEditor.current?.editor.getModel()?.getValue();
    if (text !== undefined) refreshInactivePartDecorations(text, newStage);
  };
  const updateEditorLanguage = (lang: string, send = false) => {
    setLanguage(lang);
    if (send) sendMessage("language", lang);

    if (!codeEditor.current) return;
    const mod = codeEditor.current.editor.getModel();
    if (!mod) return;

    codeEditor.current.monaco.editor.setModelLanguage(mod, lang);
  };
  const toggleInterview = () => {
    setActive(!active);
    sendMessage("active", !active);

    setTimerStart(0);
    sendMessage("timerStart", 0);

    changeStage(-999);
    sendMessage("stage", 0);

    setIntervieweeFocused(true);
  };
  const callbacks: Callbacks = {
    question: (payload: Payload) => {
      const val = payload.value as string;

      setQuestionContent(val);

      if (role !== INTERVIEWEE && questionEditor.current) {
        const mod = questionEditor.current.editor.getModel();
        if (!mod) return;

        mod.setValue(val);
        setPartCount(countParts(val));
        refreshInactivePartDecorations(val, stage);
      }
    },
    code: (payload: Payload) => {
      const val = payload.value as string;

      if (!codeEditor.current) return;
      const mod = codeEditor.current.editor.getModel();
      if (!mod) return;

      mod.setValue(val);
    },
    language: (payload: Payload) => updateEditorLanguage(payload.value as string),
    active: (payload: Payload) => {
      setActive(payload.value as boolean);
      setIntervieweeFocused(true);
    },
    timerStart: (payload: Payload) => setTimerStart(payload.value as number),
    stage: (payload: Payload) => {
      const newStage = payload.value as number;
      setStage(newStage);
      const text = questionEditor.current?.editor.getModel()?.getValue();
      if (text !== undefined) refreshInactivePartDecorations(text, newStage);
    },
  };
  const fetchReadmeQuestion = (version: "firstYear" | "secondYear") => {
    if (!socket || !socket.connected) return;

    socket.emit("fetch", { userId, version }, (question: string | null) => {
      if (question === null) return;

      callbacks.question({ userId, key: "question", value: question });
      callbacks.stage({ userId, key: "stage", value: 0 });
    });
  };

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    document.title = "TSE Fulcrum - Technical Interview";

    const sock = io();
    sock.on("connect", () => {
      setSocket(sock);
      sock.emit("getState");
    });

    sock.on("message", (payload: Payload) => {
      if (payload.userId === userId) return;

      const key = payload.key as keyof typeof callbacks;
      callbacks[key](payload);
    });
    sock.on("select", (select: SelectionPayload) => {
      if (
        select.role === role ||
        remoteSelection.current === null ||
        codeEditor.current === null ||
        codeEditor.current.editor.getModel() === null
      )
        return;

      remoteSelection.current.setOffsets(select.from, select.to);
    });
    sock.on("focus", (payload: { role: number; focused: boolean }) => {
      if (payload.role === role) return;

      // listens to all focus messages indiscriminately, meaning if two
      // socket clients connect to the interviewee room, may cause issues
      // when clients send independent 'focus' messages. just means we cant have
      // two interviewees at the same time, which is already the case
      setIntervieweeFocused(payload.focused);
    });
    sock.on("state", (state: InterviewState) => {
      Object.entries(callbacks).forEach(([event, callback]) => {
        const value = state[event as keyof InterviewState] as string | boolean | number;
        callback({
          userId,
          key: event as ValidKeys,
          value,
        });
      });
    });

    const unload = () => sock.emit("save");
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, []);
  useEffect(() => {
    if (!socket) return;

    socket.emit("select", {
      role,
      from: selectFrom,
      to: selectTo,
    });
  }, [selectFrom, selectTo]);

  if (!socket) {
    return <TSELogo msg="Connecting..." />;
  }

  return (
    <>
      <style>{css}</style>
      {role === INTERVIEWER && (
        <div className="tw:flex tw:flex-col tw:justify-center tw:w-full tw:gap-3 tw:p-3">
          <div className="tw:flex tw:items-center tw:justify-center tw:h-12">
            <Button
              className="tw:!bg-blue-600 tw:!px-2 tw:!py-2 tw:!rounded-lg"
              onClick={() => window.close()}
            >
              ← Back to Review
            </Button>
            <div className="tw:flex-1">&nbsp;</div>
            <Button
              className={twMerge(
                "tw:!bg-blue-600 tw:!px-3 tw:!py-2 tw:!rounded-lg",
                active ? "tw:!bg-amber-400" : "",
              )}
              onClick={toggleInterview}
            >
              {active ? "End" : "Begin"} Interview
            </Button>
            <div>&nbsp;&nbsp;&nbsp;</div>
            <Button
              className="tw:!bg-blue-600 tw:!px-3 tw:!py-2 tw:!rounded-lg tw:disabled:!bg-gray-400 tw:disabled:!cursor-not-allowed"
              disabled={!active || stage <= 0}
              onClick={() => changeStage(-1)}
            >
              ← Prev Part
            </Button>
            <div>&nbsp;</div>
            <Button
              className="tw:!bg-blue-600 tw:!px-3 tw:!py-2 tw:!rounded-lg tw:disabled:!bg-gray-400 tw:disabled:!cursor-not-allowed"
              disabled={!active || stage >= partCount - 1}
              onClick={() => changeStage(1)}
            >
              Next Part →
            </Button>
            <div>&nbsp;&nbsp;&nbsp;</div>
            <Button
              className={twMerge(
                "tw:!bg-accent tw:!px-3 tw:!py-2 tw:!rounded-lg tw:transition-all tw:duration-500",
                blinking ? "tw:!bg-green-500" : "",
              )}
              onClick={() => {
                void navigator.clipboard.writeText(
                  window.location.origin +
                    location.pathname.replace("/interview", "").replace("/review/", "/interview/"),
                );
                setBlinking(true);
                setTimeout(() => setBlinking(false), 250);
              }}
            >
              Copy Link for Interviewee
            </Button>
            <div>&nbsp;&nbsp;&nbsp;</div>
            <Button
              className="tw:!bg-blue-600 tw:!px-3 tw:!py-2 tw:!rounded-lg"
              onClick={() => fetchReadmeQuestion("firstYear")}
            >
              Fetch First Year
            </Button>
            <div>&nbsp;</div>
            <Button
              className="tw:!bg-blue-600 tw:!px-3 tw:!py-2 tw:!rounded-lg"
              onClick={() => fetchReadmeQuestion("secondYear")}
            >
              Fetch Second Year
            </Button>
            <div style={{ flex: 1 }}>&nbsp;</div>
            <div className="mode-toggle">
              <span>Preview</span>
              <div
                role="switch"
                aria-checked={mode === "editor"}
                tabIndex={0}
                className={twMerge("mode-toggle-switch", mode === "editor" ? "active" : "")}
                onClick={() => setMode(mode === "editor" ? "preview" : "editor")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setMode(mode === "editor" ? "preview" : "editor");
                  }
                }}
              >
                <div className="mode-toggle-switch-knob" />
              </div>
              <span>Editor</span>
            </div>
            <div>&nbsp;&nbsp;&nbsp;</div>
            <Dropdown>
              <Dropdown.Toggle>Set Language</Dropdown.Toggle>
              <Dropdown.Menu>
                {LANGS.map((lang) => (
                  <Dropdown.Item key={lang} onClick={() => updateEditorLanguage(lang, true)}>
                    {lang[0].toUpperCase() + lang.slice(1)}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </div>
          <div className="tw:w-full tw:text-center"> Currently rendering Part {stage}</div>
          {active && !intervieweeFocused && (
            <div className="tw:w-full tw:text-center tw:bg-red-500 tw:text-white tw:py-1 tw:rounded">
              Interviewee is currently unfocused (tab switched or window not focused)
            </div>
          )}
        </div>
      )}
      {(role === INTERVIEWER || (role === INTERVIEWEE && active)) && (
        <div
          role="presentation"
          style={{
            display: role === INTERVIEWEE && !active ? "none" : "flex",
            userSelect: mouseDown ? "none" : "unset",
          }}
          onMouseMove={(e) => {
            if (!mouseDown) return;
            setEditorWidth((100 * e.pageX) / window.innerWidth);
          }}
          onMouseUp={() => setMouseDown(false)}
        >
          {role === INTERVIEWER && mode === "editor" ? (
            <Editor
              width={`calc(${editorWidth}vw - ${separatorWidth / 2}px)`}
              height="100vh"
              theme="vs-dark"
              language="markdown"
              options={editorOptions}
              onMount={onMount(false)}
            />
          ) : (
            <div
              style={{
                width: `calc(${editorWidth}vw - ${separatorWidth / 2}px)`,
                height: "100vh",
                overflow: "auto",
                padding: "10px",
                boxSizing: "border-box",
                background: "#1e1e1e",
                color: "white",
              }}
            >
              <Markdown
                components={{
                  code: CodeBlock,
                  /**
                   * 2024 recruitment: adding below to fix URL parameters in image src getting
                   * HTML-escaped, which was leading to images not rendering correctly for candidates.
                   */
                  img: MarkdownImage,
                }}
              >
                {getVisibleQuestion(questionContent ?? "", stage)}
              </Markdown>
            </div>
          )}
          <div
            role="presentation"
            className="divider"
            style={{
              width: `${separatorWidth}px`,
              height: "100vh",
              cursor: "ew-resize",
              background: mouseDown ? "var(--bs-primary)" : "gray",
              transition: "background 0.2s",
            }}
            onMouseDown={() => setMouseDown(true)}
          />
          <Editor
            width={`calc(${100 - editorWidth}vw - ${separatorWidth / 2}px)`}
            height="100vh"
            theme="vs-dark"
            language={language}
            options={editorOptions}
            onMount={onMount(true)}
          />
        </div>
      )}
      {role === INTERVIEWEE && !active && <TSELogo msg="Please wait for your interviewer." />}
      {active && (
        <Timer
          role={role}
          since={timerStart}
          start={() => {
            setTimerStart(Date.now());
            sendMessage("timerStart", Date.now());
          }}
        />
      )}
    </>
  );
}
