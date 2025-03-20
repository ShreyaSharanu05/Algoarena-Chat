import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import "../App.css";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { io } from "socket.io-client";
import axios from "axios";

const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "Guest";
  const [code, setCode] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [runResult, setRunResult] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [ chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const socketRef = useRef(null); // Create a reference to hold the socket instance

  const setInitialCode = async () => {
    const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/rooms/get-code/${roomId}`);
    setCode(response.data.iniCode);
  }

  useEffect(() => {
    setInitialCode();
    console.log("Chat Open State Changed: ", chatOpen);
  }, []);

  useEffect(() => {
    // If socketRef.current is null, create the socket connection
    if (!socketRef.current) {
      socketRef.current = io(`${import.meta.env.VITE_BACKEND_URL}`, {
        query: { username },
      });
    }

    // on any change to code the server is going to broadcast this message

    socketRef.current.on("update-code", (data) => {
      if (data.roomId === roomId) {
        setCode(data.code);
      }
    });

    socketRef.current.on("connect", () => {
      console.log("✅ Connected to WebSocket server");
  });

  socketRef.current.on("connect_error", (err) => {
      console.error("❌ WebSocket connection error:", err);
  });
   
    //
    socketRef.current.on("receive-message", (data) => {
      console.log("Received message:", data);  
      setMessages((prev) => [...prev, {username: data.username, text: data.message}]);    
    });

    // Cleanup function to disconnect the socket when the component unmounts
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Empty dependency array to run only once

  const handleLogout = () => {
    localStorage.removeItem("username");
    navigate("/login");
  };

  const handleLeaveRoom = () => {
    navigate("/create-join");
  };

  const toggleUserMenu = () => {
    setUserMenuOpen((prev) => !prev);
  };

  const toggleChat = () => {
    setChatOpen(prev => !prev);
  };

  const sendMessage = (e) => {
   e.preventDefault();
   if (!newMessage.trim()) return;
   console.log("🔼 Sending message:", newMessage);
   socketRef.current.emit("send-message",{roomId, username, message: newMessage});
   setMessages((prev) => [...prev, { username, text: newMessage }]);
  setNewMessage("");
  }

  const runCode = () => {
    fetch("https://emkc.org/api/v2/piston/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language,
        version: "*",
        files: [
          {
            name: `file.${language === "javascript" ? "js" : language}`,
            content: code,
          },
        ],
        stdin: "",
        args: [],
        compile_timeout: 10000,
        run_timeout: 3000,
        compile_cpu_time: 10000,
        run_cpu_time: 3000,
        compile_memory_limit: -1,
        run_memory_limit: -1,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.run && data.run.output) {
          setRunResult(data.run.output);
        }
      })
      .catch((error) => {
        console.error("Error executing code:", error);
        setRunResult("Error executing code");
      });
  };
  const getLanguageExtension = (lang) => {
    switch (lang) {
      case "python":
        return python();
      case "cpp":
        return cpp();
      case "java":
        return java();
      default:
        return javascript();
    }
  };
  const clearOutput = () => {
    setRunResult(""); // Fix missing clear functionality
  };
  const handleCodeChange = async (value) => {
    setCode(value); // Update the state with the new value
    try {
      const response = await axios.put(`${import.meta.env.VITE_BACKEND_URL}/api/rooms/update-code/${roomId}`, {
          code: value,
      });
    } catch (error) {
        console.error("Error updating room code:", error);
    }
    //console.log(code)
    socketRef.current.emit("code-update", {
      roomId: roomId,
      code: value,
    });
  };

  return (
    <div className="container">
      <div className="navbar">
        <div className="navLeft">
          <h1 className="title">Algo Arena</h1>
        </div>
        <div className="navCenter">
          <ul className="navLinks">
            <li className="navLink">Room: {roomId}</li>
          </ul>
        </div>
        <div className="navRight">
          <button onClick={handleLeaveRoom} className="leaveButton">
            Leave Room
          </button>
          <button onClick={toggleChat} className="chatButton">💬 Chat</button>
          <div className="userMenu">
            <div
              className="userIcon"
              onClick={toggleUserMenu}
              title="User Options"
            >
              👤 {username}
            </div>
            {userMenuOpen && (
              <div className="dropdownMenu">
                <div className="dropdownItem">Profile</div>
                <div className="dropdownItem" onClick={handleLogout}>
                  Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="editorResultWrapper">
        <div className="editorContainer">
          <div className="editor-navbar">
            <span className="file-name">main.js</span>
            <div className="language-selector">
              <label htmlFor="language-select" className="language-label">
                Select Language:
              </label>
              <select
                id="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="language-dropdown"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="cpp">C++</option>
                <option value="java">Java</option>
              </select>
            </div>
            <button className="runButton" onClick={runCode}>
              Run
            </button>
          </div>
          <CodeMirror
            height="80vh"
            value={code}
            onChange={(value) => {
              handleCodeChange(value); // Update state when content changes
            }}
            extensions={[getLanguageExtension(language)]}
            theme="dark"
          />
        </div>
        <div className="resultContainer">
          <div className="output-navbar">
            <span className="output-title">Output</span>
            <button className="btn clear" onClick={clearOutput}>
              Clear
            </button>
          </div>
          <pre className="output">{runResult}</pre>
        </div>
      </div>

      {chatOpen && (
        <div className={`chatContainer ${chatOpen ? 'open' : ''}`}>
            <div className="chatHeader">
              <span>Chat</span>
              <button onClick={toggleChat} className="closeChat">✖</button>
            </div>

            <div className="chatMessages">
            {messages.map((msg, index) => (
              <div key={index} className={`chatMessage ${msg.username === username ? "self" : ""}`}>
                <strong>{msg.username}: </strong> {msg.text}
              </div>
          ))}
          </div>

          <div className="chatInput">
            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." />
            <button onClick={sendMessage} type="button">Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomPage;
