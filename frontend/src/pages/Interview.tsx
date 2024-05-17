import { RemoteSelectionManager } from "@convergencelabs/monaco-collab-ext";
import Editor, { type Monaco } from "@monaco-editor/react";
import { type editor as MonacoEditor } from "monaco-editor";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { Button, Dropdown } from "react-bootstrap";
import Markdown from "react-markdown";
import { useLocation } from "react-router-dom";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp";
import { dark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { io, type Socket } from "socket.io-client";

SyntaxHighlighter.registerLanguage("cpp", cpp);

const LANGS = ["python", "javascript", "java", "cpp", "text"];
const SECOND = 1000;
const FUDGE = SECOND / 2; // Half second bump to ensure timer starts at 50:00
const INTERVIEW_DURATION = 50 * 60 * SECOND; // 50 minutes
const INTERVIEWEE = 0;
const INTERVIEWER = 1;

const css = `
  .divider:hover {
    background: var(--bs-primary) !important;
  }
  .timer:hover {
    opacity: 1 !important;
  }
`;

interface InterviewState {
  room: string;
  question: string;
  code: string;
  language: string;
  active: boolean;
  timerStart: number;
  lastUpdate: Date;
}

type ValidKeys = "question" | "code" | "language" | "active" | "timerStart";

interface Payload {
  userId: string;
  key: ValidKeys;
  value: string | boolean | number;
}

interface SelectionPayload {
  role: number;
  from: number;
  to: number;
}

interface Callbacks {
  [key: string]: (p: Payload) => void;
}

interface EditorInstance {
  editor: MonacoEditor.IStandaloneCodeEditor;
  monaco: Monaco;
}

interface CodeProps {
  children?: ReactNode;
  className?: string;
}

interface LoadingProps {
  msg: string;
}

interface TimerProps {
  role: number;
  since: number;
  start: () => void;
}

interface RemoteSelection {
  setOffsets: (start: number, end: number) => void;
  show: () => void;
  hide: () => void;
}

function CodeBlock({ children, className, ...rest }: CodeProps) {
  const match = /language-(\w+)/.exec(className || "");
  return match ? (
    <SyntaxHighlighter {...rest} style={dark} language={match[1]} PreTag="div">
      {String(children).replace(/\n$/, "") ?? ""}
    </SyntaxHighlighter>
  ) : (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <code {...rest} className={className}>
      {children}
    </code>
  );
}
CodeBlock.defaultProps = { children: [], className: "" };

function LoadingScreen({ msg }: LoadingProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        textAlign: "center",
        background: "#0c2a34",
        color: "white",
      }}
    >
      <div>
        <img width="64" height="64" src="/logo512.png" alt="TSE logo" />
        <br />
        <h1>{msg}</h1>
      </div>
    </div>
  );
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

  const questionEditor = useRef<EditorInstance | null>(null);
  const codeEditor = useRef<EditorInstance | null>(null);
  const remoteSelection = useRef<RemoteSelection | null>(null);

  const role = location.pathname.includes("/review/") ? INTERVIEWER : INTERVIEWEE;
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
  const onMount =
    (isCode: boolean) => (editor: MonacoEditor.IStandaloneCodeEditor, monaco: Monaco) => {
      if (isCode) {
        codeEditor.current = { editor, monaco };

        const selMgr = new RemoteSelectionManager({ editor });
        remoteSelection.current = selMgr.addSelection(
          role === INTERVIEWER ? "Interviewee" : "Interviewer",
          "blue"
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

        sendMessage(isCode ? "code" : "question", editor.getValue());
      });

      if (socket) {
        socket.emit("getState");
      }
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
  };
  const callbacks: Callbacks = {
    question: (payload: Payload) => {
      const val = payload.value as string;

      if (role === INTERVIEWEE) {
        setQuestionContent(val);
      } else if (questionEditor.current) {
        const mod = questionEditor.current.editor.getModel();
        if (!mod) return;

        mod.setValue(val);
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
    active: (payload: Payload) => setActive(payload.value as boolean),
    timerStart: (payload: Payload) => setTimerStart(payload.value as number),
  };

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
    return <LoadingScreen msg="Connecting..." />;
  }

  return (
    <>
      <style>{css}</style>
      {role === INTERVIEWER && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "48px",
            background: "rgb(238, 238, 238)",
            padding: "5px",
          }}
        >
          <Button onClick={() => window.close()}>← Back to Review</Button>
          <div style={{ flex: 1 }}>&nbsp;</div>
          <Button variant={active ? "warning" : "success"} onClick={toggleInterview}>
            {active ? "End" : "Begin"} Interview
          </Button>
          <div>&nbsp;&nbsp;&nbsp;</div>
          <Button
            variant={blinking ? "success" : "secondary"}
            onClick={() => {
              navigator.clipboard.writeText(
                window.location.origin +
                  location.pathname.replace("/interview", "").replace("/review/", "/interview/")
              );
              setBlinking(true);
              setTimeout(() => setBlinking(false), 250);
            }}
          >
            Copy Link for Interviewee
          </Button>
          <div style={{ flex: 1 }}>&nbsp;</div>
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
          {role === INTERVIEWER ? (
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
                }}
              >
                {questionContent}
              </Markdown>
            </div>
          )}
          <div
            role="presentation"
            className="divider"
            style={{
              width: separatorWidth + "px",
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
      {role === INTERVIEWEE && !active && <LoadingScreen msg="Please wait for your interviewer." />}
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
