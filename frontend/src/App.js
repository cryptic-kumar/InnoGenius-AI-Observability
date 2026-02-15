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

// Register Chart components
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

  // Auto-refresh every 2 seconds
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
      console.error("Backend offline");
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
      alert("Error analyzing claim");
    }
    setLoading(false);
    setClaim("");
  };

  // --- NEW: HANDLE HUMAN FEEDBACK ---
  const handleFeedback = async (id, action) => {
    try {
      await axios.post("http://localhost:5000/human-feedback", {
        log_id: id,
        action: action,
      });
      fetchStats(); // Update UI immediately
    } catch (err) {
      alert("Failed to update decision");
    }
  };

  // --- CHART DATA ---
  const chartLogs = [...logs].reverse();
  const chartData = {
    labels: chartLogs.map((log) => log.timestamp),
    datasets: [
      {
        label: "AI Latency (ms)",
        data: chartLogs.map((log) => log.metrics.latency_ms),
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.5)",
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Real-Time System Performance" },
    },
  };

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "Segoe UI, sans-serif",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ textAlign: "center", color: "#333" }}>
        🛡️ AI Insurance Observability
      </h1>

      {/* KPI Cards */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          marginBottom: "30px",
        }}
      >
        <div style={cardStyle}>
          <h3>Total Requests</h3>
          <h2>{stats.total_requests}</h2>
        </div>
        <div style={cardStyle}>
          <h3>Avg Latency</h3>
          <h2>{stats.avg_latency} ms</h2>
        </div>
        <div style={cardStyle}>
          <h3>System Status</h3>
          <h2 style={{ color: "green" }}>● Online</h2>
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
      >
        {/* Left: Input Simulator */}
        <div style={panelStyle}>
          <h2>📝 Simulate New Claim</h2>
          <textarea
            rows="4"
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "16px",
              borderRadius: "5px",
              border: "1px solid #ddd",
            }}
            placeholder="E.g., 20-year-old driver, speeding ticket, bumper damage..."
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
          />
          <button
            onClick={handleAnalyze}
            disabled={loading}
            style={{
              marginTop: "10px",
              padding: "10px 20px",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            {loading ? "AI is Thinking..." : "Analyze Risk 🚀"}
          </button>
        </div>

        {/* Right: Live Stream with Actions */}
        <div style={panelStyle}>
          <h2>⚡ Live Decision Stream</h2>
          <div style={{ height: "400px", overflowY: "auto" }}>
            {logs.map((log) => (
              <div
                key={log.id}
                style={{
                  background: "#f8f9fa",
                  padding: "15px",
                  marginBottom: "10px",
                  borderRadius: "8px",
                  borderLeft: `6px solid ${
                    log.ai_output.decision.includes("Override")
                      ? "#007bff" // Blue for Human
                      : log.ai_output.risk_level === "High"
                        ? "#dc3545"
                        : "#28a745" // Red/Green for AI
                  }`,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong style={{ fontSize: "18px" }}>
                    {log.ai_output.decision}
                  </strong>
                  <span style={{ fontSize: "12px", color: "#666" }}>
                    {log.timestamp}
                  </span>
                </div>

                <div style={{ margin: "8px 0", fontSize: "14px" }}>
                  Risk: <b>{log.ai_output.risk_level}</b> | Confidence:{" "}
                  <b>{log.ai_output.confidence_score}%</b>
                </div>

                <div
                  style={{
                    fontSize: "13px",
                    fontStyle: "italic",
                    color: "#555",
                    marginBottom: "10px",
                  }}
                >
                  "{log.ai_output.reasoning}"
                </div>

                {/* --- HUMAN FEEDBACK BUTTONS --- */}
                {!log.ai_output.decision.includes("Override") && (
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginTop: "10px",
                      borderTop: "1px solid #eee",
                      paddingTop: "10px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        alignSelf: "center",
                        color: "#888",
                      }}
                    >
                      Human Override:
                    </span>
                    <button
                      onClick={() =>
                        handleFeedback(log.id, "Override: Approved")
                      }
                      style={{ ...btnStyle, background: "#28a745" }}
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() =>
                        handleFeedback(log.id, "Override: Rejected")
                      }
                      style={{ ...btnStyle, background: "#dc3545" }}
                    >
                      ❌ Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: The Chart */}
      <div style={{ ...panelStyle, marginTop: "20px" }}>
        <Line options={chartOptions} data={chartData} height={80} />
      </div>
    </div>
  );
}

// Simple styles
const cardStyle = {
  flex: 1,
  padding: "20px",
  background: "white",
  borderRadius: "8px",
  boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
  textAlign: "center",
};
const panelStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "8px",
  boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
};
const btnStyle = {
  padding: "5px 15px",
  border: "none",
  borderRadius: "4px",
  color: "white",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "bold",
};

export default App;
