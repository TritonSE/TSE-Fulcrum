import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { type editor as MonacoEditor } from "monaco-editor";
// import { RemoteCursorManager } from "@convergencelabs/monaco-collab-ext";
import { useContext, useState, useEffect, useRef } from "react";
import { Button, Dropdown } from "react-bootstrap";
import Markdown from "react-markdown";
import { useLocation, useNavigate } from "react-router-dom";
import { io, type Socket } from "socket.io-client";

import { GlobalContext } from "../context/GlobalContext";

const LANGS = ["python", "javascript", "java", "cpp"];
const INTERVIEWEE = 0;
const INTERVIEWER = 1;
const NONE = 2;

interface InterviewState {
  question: string;
  code: string;
  language: string;
  active: boolean;
  interviewer: string;
}

interface Payload {
  index: number;
  userId: string;
  value: string | boolean;
}

interface Callbacks {
  [key: string]: (p: Payload) => void;
}

interface EditorOptions {
  role: number;
  editableBy: number;
  language: string;
  onMount: OnMount;
  sendMessage: (key: string, value: string | boolean) => void;
}

interface EditorInstance {
  editor: MonacoEditor.IStandaloneCodeEditor;
  monaco: Monaco;
}

function EditorColumn({ role, editableBy, language, onMount, sendMessage }: EditorOptions) {
  return (
    <Editor
      width="50vw"
      height="100vh"
      theme="vs-dark"
      language={language}
      options={{
        quickSuggestions: false,
        suggest: {
          showFields: false,
          showFunctions: false,
        },
      }}
      onMount={onMount}
      onChange={(content: string | undefined) => {
        if (role === editableBy) {
          sendMessage(editableBy === INTERVIEWEE ? "code" : "question", content ?? "");
        }
      }}
    />
  );
}

export default function Interview() {
  const location = useLocation();
  const navigate = useNavigate();

  const { user } = useContext(GlobalContext);

  const [socket, setSocket] = useState<Socket>();
  const [role, setRole] = useState<number>(
    location.pathname.includes("/interview/") ? INTERVIEWEE : NONE
  );

  const [eventCounter, setEventCounter] = useState<number>(0);
  const [active, setActive] = useState<boolean>(false);
  const [language, setLanguage] = useState<string>("python");
  const [userId] = useState<string>(Math.random().toString());
  const [questionContent, setQuestionContent] = useState<string>();

  const questionEditor = useRef<EditorInstance | null>(null);
  const codeEditor = useRef<EditorInstance | null>(null);

  const onMount =
    (isCode: boolean) => (editor: MonacoEditor.IStandaloneCodeEditor, monaco: Monaco) => {
      if (isCode) {
        codeEditor.current = { editor, monaco };
      } else {
        questionEditor.current = { editor, monaco };
      }

      if (role === NONE || (isCode && role === INTERVIEWER) || (!isCode && role === INTERVIEWEE)) {
        editor.updateOptions({ readOnly: true });
      }

      if (socket) {
        socket.emit("getState");
      }
    };
  const sendMessage = (key: string, value: string | boolean) => {
    if (!socket || !socket.connected) return;

    socket.emit(key, {
      index: eventCounter + 1,
      userId,
      value,
    });
    setEventCounter(eventCounter + 1);
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
      if (!codeEditor.current) return;
      const mod = codeEditor.current.editor.getModel();
      if (!mod) return;

      mod.setValue(payload.value as string);
    },
    language: (payload: Payload) => {
      updateEditorLanguage(payload.value as string);
    },
    active: (payload: Payload) => {
      setActive(payload.value as boolean);
    },
    interviewer: (payload: Payload) => {
      if (!user) return;

      if (payload.value === "") {
        setRole(INTERVIEWER);
        sendMessage("interviewer", user.name);
      } else if (payload.value === user.name) {
        setRole(INTERVIEWER);
      }
    },
  };

  useEffect(() => {
    if (role !== INTERVIEWEE && !user) return;

    const sock = io();
    sock.on("connect", () => {
      setSocket(sock);
      sock.emit("getState");
    });

    Object.entries(callbacks).forEach(([event, callback]) => {
      sock.on(event, (payload: Payload) => {
        if (payload.userId === userId || payload.index <= eventCounter) return;
        setEventCounter(payload.index);
        callback(payload);
      });
    });
    sock.on("state", (state: InterviewState) => {
      Object.entries(callbacks).forEach(([event, callback]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = (state as any)[event];
        callback({ index: -1, userId, value });
      });
    });
  }, [user]);

  if (!socket) {
    return <h1>Loading...</h1>;
  }

  return (
    <>
      {role !== INTERVIEWEE && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "38px",
          }}
        >
          {role === INTERVIEWER ? (
            <>
              <Button onClick={() => navigate(-1)}>← Back to Review</Button>
              <div style={{ flex: 1 }}>&nbsp;</div>
              <Button variant={active ? "warning" : "success"} onClick={toggleInterview}>
                {active ? "End" : "Begin"} Interview
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
            </>
          ) : (
            <>
              <div style={{ flex: 1 }}>&nbsp;</div>
              <h2>You are spectating this interview.</h2>
              <div style={{ flex: 1 }}>&nbsp;</div>
            </>
          )}
        </div>
      )}
      <div
        style={{
          display: role === INTERVIEWEE && !active ? "none" : "flex",
        }}
      >
        {role === INTERVIEWER ? (
          <EditorColumn
            role={role}
            editableBy={INTERVIEWER}
            language="markdown"
            onMount={onMount(false)}
            sendMessage={sendMessage}
          />
        ) : (
          <div
            style={{
              width: "50vw",
              height: "100vh",
              overflow: "auto",
            }}
          >
            <Markdown>{questionContent}</Markdown>
          </div>
        )}
        <EditorColumn
          role={role}
          editableBy={INTERVIEWEE}
          language={language ?? "python"}
          onMount={onMount(true)}
          sendMessage={sendMessage}
        />
      </div>
      {role === INTERVIEWEE && !active && <h1>Interview not active.</h1>}
    </>
  );
}
