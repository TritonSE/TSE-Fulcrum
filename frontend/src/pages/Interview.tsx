import { RemoteSelectionManager } from "@convergencelabs/monaco-collab-ext";
import Editor, { type Monaco } from "@monaco-editor/react";
import { type editor as MonacoEditor } from "monaco-editor";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { Button, Dropdown } from "react-bootstrap";
import Markdown from "react-markdown";
import { useLocation, useNavigate } from "react-router-dom";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { io, type Socket } from "socket.io-client";

const LANGS = ["python", "javascript", "java", "cpp"];
const INTERVIEWEE = 0;
const INTERVIEWER = 1;

const css = `
  .divider:hover {
    background: var(--bs-primary) !important;
  }
`;

interface InterviewState {
  room: string;
  question: string;
  code: string;
  language: string;
  active: boolean;
  lastUpdate: Date;
}

interface Payload {
  userId: string;
  key: string;
  value: string | boolean;
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

export default function Interview() {
  const location = useLocation();
  const navigate = useNavigate();

  const [socket, setSocket] = useState<Socket>();

  const [active, setActive] = useState<boolean>(false);
  const [language, setLanguage] = useState<string>("python");
  const [userId] = useState<string>(Math.random().toString());
  const [questionContent, setQuestionContent] = useState<string>();
  const [editorWidth, setEditorWidth] = useState<number>(50);
  const [mouseDown, setMouseDown] = useState<boolean>(false);

  const questionEditor = useRef<EditorInstance | null>(null);
  const codeEditor = useRef<EditorInstance | null>(null);
  const remoteSelection = useRef<RemoteSelection | null>(null);

  useEffect(() => {
    document.title = "TSE Technical Interview";

    const unload = () => {
      if (!socket) return;
      socket.emit("save");
    };
    window.addEventListener("beforeunload", unload);

    return () => window.removeEventListener("beforeunload", unload);
  }, []);

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

  const sendMessage = (key: string, value: string | boolean) => {
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

          socket.emit("select", { role, from, to });
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
  const updateEditorLanguage = (lang: string) => {
    setLanguage(lang);
    sendMessage("language", lang);

    if (!codeEditor.current) return;
    const mod = codeEditor.current.editor.getModel();
    if (!mod) return;

    codeEditor.current.monaco.editor.setModelLanguage(mod, lang);
  };
  const toggleInterview = () => {
    setActive(!active);
    sendMessage("active", !active);
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
    language: (payload: Payload) => {
      updateEditorLanguage(payload.value as string);
    },
    active: (payload: Payload) => {
      setActive(payload.value as boolean);
    },
  };

  useEffect(() => {
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
    sock.on("state", (state: InterviewState) => {
      Object.entries(callbacks).forEach(([event, callback]) => {
        const value = state[event as keyof InterviewState] as string | boolean;
        callback({
          userId,
          key: event as string,
          value,
        });
      });
      sock.on("select", (select: SelectionPayload) => {
        if (select.role === role || remoteSelection.current === null) return;

        remoteSelection.current.setOffsets(select.from, select.to);
      });
    });
  }, []);

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
          <Button onClick={() => navigate(-1)}>← Back to Review</Button>
          <div style={{ flex: 1 }}>&nbsp;</div>
          <Button variant={active ? "warning" : "success"} onClick={toggleInterview}>
            {active ? "End" : "Begin"} Interview
          </Button>
          <div>&nbsp;&nbsp;&nbsp;</div>
          <Button
            variant="success"
            onClick={() => {
              navigator.clipboard.writeText(
                window.location.origin +
                  location.pathname.replace("/interview", "").replace("/review/", "/interview/")
              );
            }}
          >
            Copy Link for Interviewee
          </Button>
          <div style={{ flex: 1 }}>&nbsp;</div>
          <Dropdown>
            <Dropdown.Toggle>Set Language</Dropdown.Toggle>
            <Dropdown.Menu>
              {LANGS.map((lang) => (
                <Dropdown.Item key={lang} onClick={() => updateEditorLanguage(lang)}>
                  {lang[0].toUpperCase() + lang.slice(1)}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>
      )}
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
            background: mouseDown ? "var(--bs-primary)" : "gray",
            cursor: "ew-resize",
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
      {role === INTERVIEWEE && !active && (
        <LoadingScreen msg="Please wait for your interviewer..." />
      )}
    </>
  );
}
