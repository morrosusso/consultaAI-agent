import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import Head from "next/head";

export default function Home() {
  const { data: session, status } = useSession();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [reply, setReply] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [sendStatus, setSendStatus] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [chatMessages, setChatMessages] = useState([
    { role: "ai", text: "Hello! I'm your AI Consultancy Agent. I can read your Gmail, draft replies, and help manage your consultancy. What would you like to do?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (session) fetchEmails();
  }, [session]);

  async function fetchEmails() {
    setLoading(true);
    try {
      const res = await fetch("/api/gmail/list");
      const data = await res.json();
      setEmails(data.emails || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function draftReply(email) {
    setSelectedEmail(email);
    setDraftLoading(true);
    setReply("");
    try {
      const res = await fetch("/api/gmail/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: email.from, subject: email.subject, snippet: email.snippet }),
      });
      const data = await res.json();
      setReply(data.reply || "");
    } catch (e) {
      setReply("Error generating reply.");
    }
    setDraftLoading(false);
  }

  async function sendReply() {
    if (!selectedEmail || !reply) return;
    setSendStatus("sending");
    try {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedEmail.from,
          subject: "Re: " + selectedEmail.subject,
          body: reply,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSendStatus("sent");
        setSelectedEmail(null);
        setReply("");
        setTimeout(() => setSendStatus(""), 3000);
      }
    } catch (e) {
      setSendStatus("error");
    }
  }

  async function sendChat() {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/gmail/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: "user", subject: "chat", snippet: userMsg }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: "ai", text: data.reply }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: "ai", text: "Sorry, error connecting to AI." }]);
    }
    setChatLoading(false);
  }

  if (status === "loading") return (
    <div style={styles.loading}>
      <div style={styles.loadingText}>⚡ Loading ConsultAI...</div>
    </div>
  );

  if (!session) return (
    <div style={styles.loginPage}>
      <Head><title>ConsultAI — Login</title></Head>
      <div style={styles.loginCard}>
        <div style={styles.loginLogo}>🤖</div>
        <h1 style={styles.loginTitle}>ConsultAI Agent</h1>
        <p style={styles.loginSub}>Your AI-powered consultancy assistant</p>
        <button style={styles.loginBtn} onClick={() => signIn("google")}>
          Sign in with Google
        </button>
        <p style={styles.loginNote}>Connects to your Gmail to read & reply to messages</p>
      </div>
    </div>
  );

  return (
    <div style={styles.app}>
      <Head><title>ConsultAI Agent</title></Head>

      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🤖</span>
          <div>
            <div style={styles.logoText}>ConsultAI</div>
            <div style={styles.logoSub}>Smart Agent</div>
          </div>
        </div>

        {["dashboard", "emails", "chat"].map(tab => (
          <div key={tab} style={{...styles.navItem, ...(activeTab === tab ? styles.navActive : {})}}
            onClick={() => setActiveTab(tab)}>
            {tab === "dashboard" ? "📊" : tab === "emails" ? "📨" : "🧠"} {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </div>
        ))}

        <div style={styles.userInfo}>
          <div style={styles.userEmail}>{session.user.email}</div>
          <button style={styles.signOutBtn} onClick={() => signOut()}>Sign Out</button>
        </div>
      </div>

      {/* MAIN */}
      <div style={styles.main}>
        <div style={styles.topbar}>
          <div style={styles.pageTitle}>
            {activeTab === "dashboard" ? "📊 Dashboard" : activeTab === "emails" ? "📨 Gmail Inbox" : "🧠 AI Chat"}
          </div>
          <button style={styles.refreshBtn} onClick={fetchEmails}>🔄 Refresh</button>
        </div>

        <div style={styles.content}>

          {/* DASHBOARD */}
          {activeTab === "dashboard" && (
            <div>
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Inbox Emails</div>
                  <div style={{...styles.statValue, color: "#7c6bff"}}>{loading ? "..." : emails.length}</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>AI Status</div>
                  <div style={{...styles.statValue, color: "#00e5a0"}}>Live</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Gmail</div>
                  <div style={{...styles.statValue, color: "#00e5a0"}}>Connected</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Account</div>
                  <div style={{...styles.statValue, fontSize: "14px", color: "#7c6bff"}}>{session.user.name?.split(" ")[0]}</div>
                </div>
              </div>

              <div style={styles.sectionCard}>
                <div style={styles.sectionTitle}>Recent Emails</div>
                {loading ? <div style={styles.muted}>Loading...</div> :
                  emails.slice(0, 5).map((e, i) => (
                    <div key={i} style={styles.emailRow}>
                      <div>
                        <div style={styles.emailFrom}>{e.from.split("<")[0].trim()}</div>
                        <div style={styles.emailSubject}>{e.subject}</div>
                      </div>
                      <button style={styles.miniBtn} onClick={() => { setActiveTab("emails"); draftReply(e); }}>
                        AI Reply
                      </button>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* EMAILS */}
          {activeTab === "emails" && (
            <div style={styles.twoCol}>
              <div style={styles.emailList}>
                <div style={styles.sectionTitle}>📨 {emails.length} emails in inbox</div>
                {loading ? <div style={styles.muted}>Loading emails...</div> :
                  emails.map((e, i) => (
                    <div key={i} style={{...styles.emailCard, ...(selectedEmail?.id === e.id ? styles.emailCardSelected : {})}}
                      onClick={() => draftReply(e)}>
                      <div style={styles.emailFrom}>{e.from.split("<")[0].trim()}</div>
                      <div style={styles.emailSubject}>{e.subject}</div>
                      <div style={styles.emailSnippet}>{e.snippet?.substring(0, 80)}...</div>
                    </div>
                  ))
                }
              </div>

              <div style={styles.replyPanel}>
                <div style={styles.sectionTitle}>✍️ AI Reply</div>
                {!selectedEmail ? (
                  <div style={styles.muted}>Click an email to generate an AI reply</div>
                ) : (
                  <div>
                    <div style={styles.replyMeta}>To: {selectedEmail.from}</div>
                    <div style={styles.replyMeta}>Subject: Re: {selectedEmail.subject}</div>
                    {draftLoading ? (
                      <div style={styles.muted}>🧠 AI is drafting your reply...</div>
                    ) : (
                      <textarea style={styles.replyArea} value={reply}
                        onChange={e => setReply(e.target.value)} />
                    )}
                    <button style={styles.sendBtn} onClick={sendReply} disabled={!reply || draftLoading}>
                      {sendStatus === "sending" ? "Sending..." : sendStatus === "sent" ? "✅ Sent!" : "📨 Send Reply"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CHAT */}
          {activeTab === "chat" && (
            <div style={styles.chatArea}>
              <div style={styles.chatMessages}>
                {chatMessages.map((m, i) => (
                  <div key={i} style={{...styles.msg, ...(m.role === "user" ? styles.msgUser : styles.msgAI)}}>
                    <div style={{...styles.bubble, ...(m.role === "user" ? styles.bubbleUser : styles.bubbleAI)}}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {chatLoading && <div style={styles.muted}>🧠 AI is thinking...</div>}
              </div>
              <div style={styles.chatInputRow}>
                <input style={styles.chatInput} value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendChat()}
                  placeholder="Ask your AI agent anything..." />
                <button style={styles.sendBtn} onClick={sendChat}>Send</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

const styles = {
  app: { display: "flex", minHeight: "100vh", background: "#0a0a0f", color: "#e8e8f0", fontFamily: "Inter, sans-serif" },
  loading: { display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0f" },
  loadingText: { color: "#7c6bff", fontSize: "20px" },
  loginPage: { display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0f" },
  loginCard: { background: "#12121a", border: "1px solid #2a2a3d", borderRadius: "16px", padding: "48px", textAlign: "center", maxWidth: "400px" },
  loginLogo: { fontSize: "48px", marginBottom: "16px" },
  loginTitle: { fontSize: "24px", fontWeight: "700", marginBottom: "8px" },
  loginSub: { color: "#6b6b80", marginBottom: "32px" },
  loginBtn: { background: "#7c6bff", color: "#fff", border: "none", borderRadius: "10px", padding: "14px 32px", fontSize: "15px", cursor: "pointer", width: "100%" },
  loginNote: { color: "#6b6b80", fontSize: "12px", marginTop: "16px" },
  sidebar: { width: "220px", background: "#12121a", borderRight: "1px solid #2a2a3d", padding: "24px 16px", display: "flex", flexDirection: "column", position: "fixed", top: 0, bottom: 0 },
  logo: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" },
  logoIcon: { fontSize: "28px" },
  logoText: { fontWeight: "700", fontSize: "15px" },
  logoSub: { fontSize: "11px", color: "#6b6b80" },
  navItem: { padding: "10px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", color: "#6b6b80", marginBottom: "4px", textTransform: "capitalize" },
  navActive: { background: "rgba(124,107,255,0.15)", color: "#7c6bff", border: "1px solid rgba(124,107,255,0.2)" },
  userInfo: { marginTop: "auto", padding: "12px", background: "#1a1a26", borderRadius: "10px" },
  userEmail: { fontSize: "11px", color: "#6b6b80", marginBottom: "8px", wordBreak: "break-all" },
  signOutBtn: { background: "transparent", border: "1px solid #2a2a3d", color: "#6b6b80", borderRadius: "6px", padding: "5px 10px", cursor: "pointer", fontSize: "12px" },
  main: { marginLeft: "220px", flex: 1, display: "flex", flexDirection: "column" },
  topbar: { padding: "16px 24px", borderBottom: "1px solid #2a2a3d", background: "#12121a", display: "flex", justifyContent: "space-between", alignItems: "center" },
  pageTitle: { fontSize: "17px", fontWeight: "700" },
  refreshBtn: { background: "transparent", border: "1px solid #2a2a3d", color: "#6b6b80", borderRadius: "8px", padding: "7px 14px", cursor: "pointer", fontSize: "13px" },
  content: { padding: "24px", flex: 1 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "24px" },
  statCard: { background: "#1a1a26", border: "1px solid #2a2a3d", borderRadius: "12px", padding: "18px" },
  statLabel: { fontSize: "11px", color: "#6b6b80", marginBottom: "8px", textTransform: "uppercase" },
  statValue: { fontSize: "24px", fontWeight: "700" },
  sectionCard: { background: "#1a1a26", border: "1px solid #2a2a3d", borderRadius: "12px", padding: "18px" },
  sectionTitle: { fontSize: "12px", color: "#6b6b80", textTransform: "uppercase", fontWeight: "600", marginBottom: "14px" },
  emailRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #2a2a3d" },
  emailFrom: { fontSize: "13px", fontWeight: "600" },
  emailSubject: { fontSize: "12px", color: "#6b6b80" },
  emailSnippet: { fontSize: "11px", color: "#6b6b80", marginTop: "3px" },
  miniBtn: { background: "rgba(124,107,255,0.2)", color: "#7c6bff", border: "none", borderRadius: "6px", padding: "5px 10px", cursor: "pointer", fontSize: "11px" },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  emailList: { background: "#1a1a26", border: "1px solid #2a2a3d", borderRadius: "12px", padding: "16px" },
  emailCard: { padding: "12px", borderRadius: "8px", cursor: "pointer", marginBottom: "8px", border: "1px solid #2a2a3d" },
  emailCardSelected: { border: "1px solid #7c6bff", background: "rgba(124,107,255,0.05)" },
  replyPanel: { background: "#1a1a26", border: "1px solid #2a2a3d", borderRadius: "12px", padding: "16px" },
  replyMeta: { fontSize: "12px", color: "#6b6b80", marginBottom: "6px" },
  replyArea: { width: "100%", background: "#0a0a0f", border: "1px solid #2a2a3d", borderRadius: "8px", padding: "10px", color: "#e8e8f0", fontSize: "13px", minHeight: "180px", resize: "vertical", marginTop: "10px", boxSizing: "border-box" },
  sendBtn: { background: "#7c6bff", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", cursor: "pointer", fontSize: "13px", marginTop: "10px" },
  muted: { color: "#6b6b80", fontSize: "13px" },
  chatArea: { display: "flex", flexDirection: "column", height: "calc(100vh - 130px)" },
  chatMessages: { flex: 1, overflowY: "auto", padding: "16px 0", display: "flex", flexDirection: "column", gap: "12px" },
  msg: { display: "flex" },
  msgUser: { justifyContent: "flex-end" },
  msgAI: { justifyContent: "flex-start" },
  bubble: { padding: "10px 14px", borderRadius: "12px", fontSize: "13px", maxWidth: "70%", lineHeight: "1.6" },
  bubbleAI: { background: "#1a1a26", border: "1px solid #2a2a3d" },
  bubbleUser: { background: "#7c6bff", color: "#fff" },
  chatInputRow: { display: "flex", gap: "10px", marginTop: "8px" },
  chatInput: { flex: 1, background: "#1a1a26", border: "1px solid #2a2a3d", borderRadius: "10px", padding: "12px", color: "#e8e8f0", fontSize: "13px", outline: "none" },
};
