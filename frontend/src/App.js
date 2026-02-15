import React, { useState, useEffect } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "./App.css";

// Chart Config
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

function App() {
  const [claim, setClaim] = useState("");
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ avg_latency: 0, total_requests: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get("http://localhost:5000/stats");
      setStats(res.data);
      if (res.data.recent_decisions) setLogs(res.data.recent_decisions);
    } catch (err) {
      console.error("API Error");
    }
  };

  const handleAnalyze = async () => {
    if (!claim) return;
    setLoading(true);
    try {
      await axios.post("http://localhost:5000/analyze-claim", {
        claim_text: claim,
      });
      fetchStats();
    } catch (err) {
      alert("Error");
    }
    setLoading(false);
    setClaim("");
  };

  const handleFeedback = async (id, action) => {
    try {
      await axios.post("http://localhost:5000/human-feedback", {
        log_id: id,
        action: action,
      });
      fetchStats();
    } catch (err) {
      alert("Failed");
    }
  };

  // Chart Styling
  const chartData = {
    labels: logs
      .slice()
      .reverse()
      .map((l) => l.timestamp),
    datasets: [
      {
        label: "Model Latency (ms)",
        data: logs
          .slice()
          .reverse()
          .map((l) => l.metrics.latency_ms),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
        pointRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: "#334155" }, ticks: { color: "#94a3b8" } },
      y: { grid: { color: "#334155" }, ticks: { color: "#94a3b8" } },
    },
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="logo">🛡️ INSURE.AI</div>
        <div className="nav-item active">📊 Observability</div>
        <div className="nav-item">⚖️ Governance</div>
        <div className="nav-item">⚙️ Settings</div>
        <div style={{ marginTop: "auto", color: "#64748b", fontSize: "12px" }}>
          v2.4.0 (Enterprise)
        </div>
      </div>

      {/* Main Area */}
      <div className="main-content">
        {/* Header */}
        <div className="header">
          <div>
            <h2 style={{ margin: 0 }}>Decision Observability</h2>
            <span style={{ color: "#94a3b8", fontSize: "14px" }}>
              Real-time monitoring of AI Agents
            </span>
          </div>
          <div className="status-badge">● SYSTEM ONLINE</div>
        </div>

        {/* KPI Cards */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Total Claims Processed</div>
            <div className="kpi-value">{stats.total_requests}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Avg. Decision Latency</div>
            <div className="kpi-value">{stats.avg_latency} ms</div>
          </div>
          <div
            className="kpi-card"
            style={{
              borderColor:
                logs[0]?.ai_output.risk_level === "High"
                  ? "#ef4444"
                  : "#334155",
            }}
          >
            <div className="kpi-label">Current Risk Level</div>
            <div
              className="kpi-value"
              style={{
                color:
                  logs[0]?.ai_output.risk_level === "High"
                    ? "#ef4444"
                    : "#10b981",
              }}
            >
              {logs[0]?.ai_output.risk_level || "Normal"}
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="panel-grid">
          {/* Left Panel: Simulator & Chart */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            <div className="glass-panel">
              <div className="panel-title">⚡ Claim Simulator</div>
              <textarea
                rows="4"
                placeholder="Paste claim details here..."
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
              />
              <button
                className="btn-primary"
                onClick={handleAnalyze}
                disabled={loading}
              >
                {loading ? "Processing via Gemini..." : "Analyze Claim"}
              </button>
            </div>

            <div className="glass-panel" style={{ flex: 1 }}>
              <div className="panel-title">📈 Latency Trend</div>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Right Panel: Live Feed */}
          <div className="glass-panel">
            <div className="panel-title">
              <span>👁️ Live Decision Stream</span>
              <span
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  marginLeft: "auto",
                }}
              >
                Auto-updating
              </span>
            </div>

            <div
              style={{
                maxHeight: "600px",
                overflowY: "auto",
                paddingRight: "5px",
              }}
            >
              {logs.map((log) => {
                const isHighRisk = log.ai_output.risk_level === "High";
                const isOverride = log.ai_output.decision.includes("Override");
                const riskColor = isHighRisk
                  ? "#ef4444"
                  : log.ai_output.risk_level === "Medium"
                    ? "#f59e0b"
                    : "#10b981";

                return (
                  <div
                    key={log.id}
                    className="log-card"
                    style={{
                      borderLeft: `4px solid ${isOverride ? "#3b82f6" : riskColor}`,
                    }}
                  >
                    <div className="log-header">
                      <span className="log-id">LOG_ID: #{log.id}</span>
                      <span className="log-time">{log.timestamp}</span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        className="decision-badge"
                        style={{
                          background: isOverride
                            ? "rgba(59, 130, 246, 0.2)"
                            : isHighRisk
                              ? "rgba(239, 68, 68, 0.2)"
                              : "rgba(16, 185, 129, 0.2)",
                          color: isOverride ? "#3b82f6" : riskColor,
                        }}
                      >
                        {log.ai_output.decision}
                      </span>
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                        Conf: {log.ai_output.confidence_score}%
                      </span>
                    </div>

                    {/* Risk Bar Visual */}
                    <div className="risk-bar-container">
                      <div
                        className="risk-bar-fill"
                        style={{
                          width: `${log.ai_output.confidence_score}%`,
                          background: riskColor,
                        }}
                      ></div>
                    </div>

                    <p
                      style={{
                        fontSize: "13px",
                        color: "#cbd5e1",
                        margin: "5px 0",
                        fontStyle: "italic",
                      }}
                    >
                      "{log.ai_output.reasoning}"
                    </p>

                    {!isOverride && (
                      <div className="human-actions">
                        <button
                          className="action-btn approve"
                          onClick={() =>
                            handleFeedback(log.id, "Override: Approved")
                          }
                        >
                          ✓ Approve
                        </button>
                        <button
                          className="action-btn reject"
                          onClick={() =>
                            handleFeedback(log.id, "Override: Rejected")
                          }
                        >
                          ✕ Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
