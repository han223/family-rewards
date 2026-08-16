/* =====================================================
   POINTS HISTORY
   Children see their own history. Parent sees family history.
===================================================== */

(function () {
  function historyAvatar(name) { if (typeof cuteAvatarSvg === "function") return cuteAvatarSvg(name); if (typeof getAvatar === "function") return getAvatar(name); return "👤"; }
  function formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
  function formatTime(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }); }
  function ensureModal() {
    let modal = document.getElementById("historyOverlay"); if (modal) return modal;
    modal = document.createElement("div"); modal.id = "historyOverlay"; modal.className = "overlay history-overlay";
    modal.innerHTML = `<div class="history-modal" role="dialog" aria-modal="true" aria-labelledby="historyTitle"><div class="history-header"><div><div class="history-kicker">Family Rewards</div><h2 id="historyTitle">Points History</h2><p id="historySubtitle">Your recent points activity</p></div><button class="history-close" type="button" aria-label="Close">×</button></div><div id="historyContent" class="history-content"></div><div id="historyParentActions" class="history-parent-actions" style="display:none"><button id="clearHistoryButton" class="clear-history-button" type="button">Clear History</button></div></div>`;
    document.body.appendChild(modal); modal.querySelector(".history-close").addEventListener("click", closeHistory); modal.addEventListener("click", event => { if (event.target === modal) closeHistory(); }); modal.querySelector("#clearHistoryButton").addEventListener("click", clearAllHistory); return modal;
  }
  function closeHistory() { const modal = document.getElementById("historyOverlay"); if (modal) modal.style.display = "none"; }
  function escapeHistory(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }

  async function showHistory() {
    if (!window.currentProfile || !window.supabaseClient) return;
    const modal = ensureModal(); const content = modal.querySelector("#historyContent"); const subtitle = modal.querySelector("#historySubtitle"); const parentActions = modal.querySelector("#historyParentActions"); const isParent = String(window.currentProfile.role || "").toLowerCase() === "parent";
    content.innerHTML = '<div class="history-loading"><span class="history-spinner"></span>Loading history...</div>'; subtitle.textContent = isParent ? "Recent activity from the whole family" : "Your recent points activity"; parentActions.style.display = isParent ? "flex" : "none"; modal.style.display = "flex";
    try {
      let query = window.supabaseClient.from("points_history").select("id,user_id,amount,type,description,created_at").order("created_at", { ascending: false }).limit(50);
      if (!isParent) query = query.eq("user_id", window.currentProfile.id);
      const result = await query; if (result.error) throw result.error; const rows = result.data || [];
      if (!rows.length) { content.innerHTML = '<div class="history-empty"><div class="history-empty-icon">✨</div><strong>No points activity yet</strong><p>Points you receive or spend will appear here.</p></div>'; return; }
      const profileMap = new Map((window.profiles || []).map(profile => [Number(profile.id), profile]));
      content.innerHTML = rows.map(item => { const profile = profileMap.get(Number(item.user_id)); const name = profile?.name || (Number(item.user_id) === Number(window.currentProfile.id) ? window.currentProfile.name : "Family member"); const avatar = historyAvatar(name); const amount = Number(item.amount || 0); const positive = amount > 0; const type = String(item.type || "").toLowerCase(); const icon = type === "redemption" ? "🛒" : positive ? "⭐" : "➖"; const title = type === "redemption" ? "Reward Redeemed" : positive ? "Points Added" : "Points Removed"; const amountText = `${amount > 0 ? "+" : "−"}${Math.abs(amount).toLocaleString()}`; return `<div class="history-item"><div class="history-item-avatar">${avatar}</div><div class="history-item-main"><div class="history-item-title">${icon} ${escapeHistory(title)}</div><div class="history-item-meta">${isParent ? `<strong>${escapeHistory(name)}</strong> · ` : ""}${escapeHistory(item.description || "Points activity")} · ${formatDate(item.created_at)} · ${formatTime(item.created_at)}</div></div><div class="history-item-cost ${positive ? "history-positive" : "history-negative"}">${amountText}<small>pts</small></div></div>`; }).join("");
    } catch (error) { console.error("Points history error:", error); content.innerHTML = `<div class="history-empty"><div class="history-empty-icon">⚠️</div><strong>Unable to load history</strong><p>${escapeHistory(error.message || "Please try again.")}</p></div>`; }
  }

  async function clearAllHistory() {
    if (!window.currentProfile || String(window.currentProfile.role || "").toLowerCase() !== "parent") return;
    const confirmed = window.confirm("Clear all family history? This will permanently delete all points and redemption history for everyone."); if (!confirmed) return;
    const button = document.getElementById("clearHistoryButton"); if (button) { button.disabled = true; button.textContent = "Clearing..."; }
    try {
      const historyDelete = await window.supabaseClient.from("points_history").delete().neq("id", 0); if (historyDelete.error) throw historyDelete.error;
      const redemptionDelete = await window.supabaseClient.from("redemptions").delete().neq("id", 0); if (redemptionDelete.error) throw redemptionDelete.error;
      await showHistory();
      if (typeof showToast === "function") showToast("All family history cleared.");
    } catch (error) {
      console.error("Clear history error:", error);
      if (typeof showToast === "function") showToast(`Unable to clear history: ${error.message || error}`); else window.alert(`Unable to clear history: ${error.message || error}`);
    } finally { if (button) { button.disabled = false; button.textContent = "Clear History"; } }
  }

  const style = document.createElement("style"); style.textContent = `.history-parent-actions{justify-content:flex-end;margin-top:16px;padding-top:14px;border-top:1px solid #eceee9}.clear-history-button{border:1px solid #efc9c5;background:#fff7f6;color:#a04c43;border-radius:10px;padding:9px 14px;font:600 12px inherit;cursor:pointer}.clear-history-button:hover{background:#fcecea}.clear-history-button:disabled{opacity:.6;cursor:wait}`; document.head.appendChild(style);

  window.showHistory = showHistory; window.closeHistory = closeHistory;
})();
