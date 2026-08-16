/* =====================================================
   MANAGE REWARDS — PARENT ONLY
   Add/edit rewards, category, stock, active state and order.
===================================================== */
(function () {
  const IMAGE_BUCKET = "product-images";
  let editingId = null;
  let pendingFile = null;

  function parentOnly() {
    return String(currentProfile?.role || "").toLowerCase() === "parent";
  }

  function esc(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function imageUrl(path) {
    if (!path) return null;
    if (/^(https?:\/\/|data:)/i.test(path)) return path;
    return supabaseClient.storage.from(IMAGE_BUCKET).getPublicUrl(path).data?.publicUrl || null;
  }

  function styles() {
    if (document.getElementById("manageRewardsStyles")) return;
    const s = document.createElement("style");
    s.id = "manageRewardsStyles";
    s.textContent = `
      .manage-rewards-button{display:block;margin:0 auto 10px;width:min(560px,calc(100% - 32px));padding:11px 16px;border:1px solid #e5e7e1;border-radius:12px;background:#fafbf8;color:#242722;text-align:left;cursor:pointer;font:600 14px inherit;box-shadow:0 2px 8px rgba(0,0,0,.04)}
      .manage-rewards-button:hover{background:#f1f3ed}
      .mr-overlay{position:fixed;inset:0;background:rgba(20,22,18,.28);display:none;align-items:center;justify-content:center;z-index:1000;padding:16px}
      .mr-modal{width:min(820px,100%);max-height:calc(100vh - 32px);overflow:auto;background:#fff;border-radius:22px;padding:22px;box-shadow:0 25px 80px rgba(0,0,0,.18)}
      .mr-head{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;margin-bottom:16px}.mr-head h2{margin:0;font-size:24px}.mr-head p{margin:5px 0 0;color:#81867e;font-size:13px}.mr-close{border:0;background:#f1f2ee;border-radius:50%;width:34px;height:34px;font-size:22px;cursor:pointer}
      .mr-add{border:0;border-radius:11px;padding:10px 14px;background:#242722;color:#fff;font-weight:700;cursor:pointer;margin-bottom:14px}.mr-list{display:grid;gap:9px}
      .mr-row{display:grid;grid-template-columns:58px minmax(150px,1fr) 90px 95px 86px auto;align-items:center;gap:10px;border:1px solid #e8eae5;border-radius:14px;padding:9px;background:#fcfcfb}.mr-thumb{width:54px;height:54px;border-radius:11px;overflow:hidden;background:#f3f4ef;display:flex;align-items:center;justify-content:center;font-size:24px}.mr-thumb img{width:100%;height:100%;object-fit:cover}.mr-name strong{display:block;font-size:14px}.mr-name small{display:block;color:#858a82;margin-top:3px;font-size:11px}.mr-stat{font-size:12px;color:#666c63}.mr-stat b{display:block;color:#242722;font-size:13px;margin-bottom:2px}.mr-status{font-size:11px;font-weight:700}.mr-status.on{color:#4f794a}.mr-status.off{color:#9a6258}.mr-actions{display:flex;gap:5px;justify-content:flex-end;flex-wrap:wrap}.mr-actions button{border:1px solid #dfe2db;background:#fff;border-radius:8px;padding:7px 8px;cursor:pointer;font-weight:600;font-size:11px}.mr-actions .danger{color:#9a554c}.mr-actions .move{font-size:14px;padding:6px 8px}.mr-empty{padding:35px;text-align:center;color:#888d85;border:1px dashed #dfe2db;border-radius:14px}
      .mr-form{display:grid;grid-template-columns:1fr 1fr;gap:12px}.mr-field{display:flex;flex-direction:column;gap:5px}.mr-field.full{grid-column:1/-1}.mr-field label{font-size:12px;font-weight:700;color:#5e645b}.mr-field input,.mr-field select{border:1px solid #dfe2db;border-radius:10px;padding:10px;font:inherit;outline:none;background:#fff}.mr-photo{display:flex;align-items:center;gap:12px}.mr-preview{width:72px;height:72px;border-radius:12px;background:#f3f4ef;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:30px}.mr-preview img{width:100%;height:100%;object-fit:cover}.mr-photo button{border:1px solid #dfe2db;background:#fff;border-radius:9px;padding:9px 11px;cursor:pointer}.mr-form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.mr-form-actions button{border-radius:10px;padding:10px 16px;font-weight:700;cursor:pointer}.mr-cancel{border:1px solid #dfe2db;background:#fff}.mr-save{border:0;background:#242722;color:#fff}.mr-category-note{font-size:11px;color:#858a82;margin-top:2px}
      @media(max-width:720px){.mr-row{grid-template-columns:54px 1fr auto}.mr-row .mr-stat,.mr-row .mr-status{display:none}.mr-actions{grid-column:2/-1;justify-content:flex-start}.mr-form{grid-template-columns:1fr}.mr-field.full{grid-column:auto}}
    `;
    document.head.appendChild(s);
  }

  function ensureButton() {
    const historyButton = document.querySelector(".history-button");
    if (!historyButton) return;
    let button = document.getElementById("manageRewardsButton");
    if (!parentOnly()) { if (button) button.remove(); return; }
    if (!button) {
      button = document.createElement("button");
      button.id = "manageRewardsButton";
      button.className = "manage-rewards-button";
      button.type = "button";
      button.textContent = "🛍️  Manage Rewards";
      button.onclick = openManager;
    }
    if (historyButton.parentNode && button.nextSibling !== historyButton) historyButton.parentNode.insertBefore(button, historyButton);
  }

  function modal() {
    let el = document.getElementById("manageRewardsOverlay");
    if (el) return el;
    el = document.createElement("div"); el.id = "manageRewardsOverlay"; el.className = "mr-overlay";
    el.innerHTML = `<div class="mr-modal" role="dialog" aria-modal="true"><div class="mr-head"><div><h2>Manage Rewards</h2><p>Add, edit, reorder, stock and publish rewards.</p></div><button class="mr-close" type="button">×</button></div><button class="mr-add" type="button">＋ Add Reward</button><div id="mrList" class="mr-list"></div></div>`;
    document.body.appendChild(el);
    el.querySelector(".mr-close").onclick = closeManager;
    el.querySelector(".mr-add").onclick = () => openForm();
    el.addEventListener("click", e => { if (e.target === el) closeManager(); });
    return el;
  }

  async function refreshRewards() {
    const result = await supabaseClient.from("rewards").select("id,name,cost,category,image,icon,stock,is_active,sort_order").order("sort_order", { ascending: true, nullsFirst: false }).order("id", { ascending: true });
    if (result.error) { console.error(result.error); showToast(`Unable to load rewards: ${result.error.message}`); return false; }
    rewards = result.data || [];
    if (typeof renderFilters === "function") renderFilters();
    if (typeof renderProducts === "function") renderProducts();
    return true;
  }

  function renderList() {
    const list = document.getElementById("mrList"); if (!list) return;
    const all = [...rewards].sort((a,b) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id));
    if (!all.length) { list.innerHTML = `<div class="mr-empty">No rewards yet.</div>`; return; }
    list.innerHTML = all.map((r, i) => {
      const img = imageUrl(r.image); const stock = r.stock == null ? "∞" : Number(r.stock);
      const cat = r.category || "Uncategorized"; const status = r.is_active === false ? "Off shelf" : "On shelf";
      return `<div class="mr-row"><div class="mr-thumb">${img ? `<img src="${esc(img)}" alt="">` : esc(r.icon || "🎁")}</div><div class="mr-name"><strong>${esc(r.name)}</strong><small>${esc(cat)}</small></div><div class="mr-stat"><b>${Number(r.cost||0).toLocaleString()}</b>points</div><div class="mr-stat"><b>${esc(stock)}</b>stock</div><div class="mr-status ${r.is_active === false ? "off" : "on"}">${status}</div><div class="mr-actions"><button class="move" title="Move up" ${i===0?'disabled':''} onclick="manageRewardMove(${r.id},-1)">↑</button><button class="move" title="Move down" ${i===all.length-1?'disabled':''} onclick="manageRewardMove(${r.id},1)">↓</button><button onclick="manageRewardEdit(${r.id})">Edit</button><button class="danger" onclick="manageRewardToggle(${r.id})">${r.is_active === false ? "Activate" : "Deactivate"}</button></div></div>`;
    }).join("");
  }

  function openManager() { if (!parentOnly()) return; const m=modal(); m.style.display="flex"; refreshRewards().then(renderList); }
  function closeManager() { const m=document.getElementById("manageRewardsOverlay"); if(m)m.style.display="none"; }

  function categories() { return [...new Set(rewards.map(r=>String(r.category||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b)); }

  function openForm(id=null) {
    if (!parentOnly()) return;
    editingId = id; pendingFile = null;
    const r = id == null ? null : rewards.find(x=>x.id===Number(id));
    const m=modal();
    const cats=categories();
    m.querySelector(".mr-modal").innerHTML = `<div class="mr-head"><div><h2>${r ? "Edit Reward" : "Add Reward"}</h2><p>${r ? "Update this reward." : "Create a new reward for the store."}</p></div><button class="mr-close" type="button">×</button></div><div class="mr-form"><div class="mr-field"><label>Reward name</label><input id="mrName" value="${esc(r?.name||"")}" placeholder="e.g. Movie Night"></div><div class="mr-field"><label>Points</label><input id="mrCost" type="number" min="0" step="1" value="${Number(r?.cost||0)}"></div><div class="mr-field"><label>Category</label><input id="mrCategory" list="mrCategoryList" value="${esc(r?.category||"")}" placeholder="e.g. Snacks"><datalist id="mrCategoryList">${cats.map(c=>`<option value="${esc(c)}">`).join("")}</datalist><span class="mr-category-note">Type a new category to create it.</span></div><div class="mr-field"><label>Stock</label><input id="mrStock" type="number" min="0" step="1" value="${r?.stock == null ? "" : Number(r.stock)}" placeholder="Leave empty for unlimited"></div><div class="mr-field full"><label>Photo</label><div class="mr-photo"><div class="mr-preview" id="mrPreview">${r?.image ? `<img src="${esc(imageUrl(r.image)||"")}" alt="">` : esc(r?.icon||"🎁")}</div><button type="button" id="mrPhotoButton">📷 Choose photo</button><input id="mrPhotoInput" type="file" accept="image/*" hidden></div></div></div><div class="mr-form-actions"><button class="mr-cancel" type="button">Cancel</button><button class="mr-save" type="button">Save Reward</button></div>`;
    m.querySelector(".mr-close").onclick=closeManager; m.querySelector(".mr-cancel").onclick=closeManager;
    m.querySelector("#mrPhotoButton").onclick=()=>m.querySelector("#mrPhotoInput").click();
    m.querySelector("#mrPhotoInput").onchange=e=>{pendingFile=e.target.files?.[0]||null;if(pendingFile){const url=URL.createObjectURL(pendingFile);m.querySelector("#mrPreview").innerHTML=`<img src="${url}" alt="">`;}};
    m.querySelector(".mr-save").onclick=saveForm;
  }

  async function saveForm() {
    const name=document.getElementById("mrName")?.value.trim(); const cost=Number(document.getElementById("mrCost")?.value); const category=document.getElementById("mrCategory")?.value.trim(); const stockRaw=document.getElementById("mrStock")?.value.trim();
    if(!name){showToast("Reward name cannot be empty.");return;} if(!Number.isInteger(cost)||cost<0){showToast("Points must be a whole number.");return;} if(!category){showToast("Please enter a category.");return;}
    let stock=null; if(stockRaw!==""){stock=Number(stockRaw);if(!Number.isInteger(stock)||stock<0){showToast("Stock must be 0 or a whole number.");return;}}
    const button=document.querySelector(".mr-save");if(button){button.disabled=true;button.textContent="Saving...";}
    try{
      let image = editingId ? (rewards.find(r=>r.id===Number(editingId))?.image||null) : null;
      if(pendingFile){const ext=pendingFile.name.includes(".")?pendingFile.name.split(".").pop().toLowerCase():"jpg";const path=`reward-${editingId||"new"}-${Date.now()}.${ext}`;const up=await supabaseClient.storage.from(IMAGE_BUCKET).upload(path,pendingFile,{upsert:false,contentType:pendingFile.type});if(up.error)throw up.error;image=path;}
      if(editingId){const old=rewards.find(r=>r.id===Number(editingId));const update=await supabaseClient.from("rewards").update({name,cost,category,stock,image}).eq("id",editingId);if(update.error)throw update.error;if(old?.image&&image!==old.image){await supabaseClient.storage.from(IMAGE_BUCKET).remove([old.image]);}}
      else {const max=Math.max(0,...rewards.map(r=>Number(r.sort_order??r.id)));const insert=await supabaseClient.from("rewards").insert({name,cost,category,stock,image,is_active:true,sort_order:max+1,icon:"🎁"});if(insert.error)throw insert.error;}
      await refreshRewards(); openManager(); showToast(editingId?"Reward updated successfully":"Reward added successfully");
    }catch(e){console.error("Manage rewards save error",e);showToast(`Unable to save reward: ${e.message||e}`);}finally{if(button){button.disabled=false;button.textContent="Save Reward";}}
  }

  async function toggle(id){if(!parentOnly())return;const r=rewards.find(x=>x.id===Number(id));if(!r)return;const next=r.is_active===false;const res=await supabaseClient.from("rewards").update({is_active:next}).eq("id",id);if(res.error){showToast(`Unable to change status: ${res.error.message}`);return;}await refreshRewards();renderList();showToast(next?`${r.name} is now on the shelf.`:`${r.name} is now off the shelf.`);}
  async function move(id,direction){if(!parentOnly())return;const all=[...rewards].sort((a,b)=>(a.sort_order??a.id)-(b.sort_order??b.id));const idx=all.findIndex(x=>x.id===Number(id));const target=idx+direction;if(idx<0||target<0||target>=all.length)return;const a=all[idx],b=all[target];const sa=a.sort_order??a.id,sb=b.sort_order??b.id;const first=await supabaseClient.from("rewards").update({sort_order:sb}).eq("id",a.id);if(first.error){showToast(`Unable to move reward: ${first.error.message}`);return;}const second=await supabaseClient.from("rewards").update({sort_order:sa}).eq("id",b.id);if(second.error){await supabaseClient.from("rewards").update({sort_order:sa}).eq("id",a.id);showToast(`Unable to move reward: ${second.error.message}`);return;}await refreshRewards();renderList();}

  function edit(id){openForm(Number(id));}

  function renderStore(){
    const grid=document.getElementById("productGrid");if(!grid)return;
    const visible=rewards.filter(r=>r.is_active!==false&&(activeCategory==="All"||r.category===activeCategory));
    if(!visible.length){grid.innerHTML="<p style='padding:40px'>No rewards found.</p>";return;}
    grid.innerHTML=visible.map(r=>{const image=imageUrl(r.image);const name=esc(r.name);const cost=Number(r.cost||0);const icon=esc(r.icon||"🎁");const canRedeem=dataLoaded&&balance>=cost&&(r.stock==null||Number(r.stock)>0);const imageHtml=image?`<img src="${esc(image)}" alt="${name}">`:`<div class="product-icon">${icon}</div>`;const stockText=r.stock==null?"":(Number(r.stock)===0?"Sold out":`${Number(r.stock)} left`);const editButton=isParent()?`<button class="edit-name-button" onclick="openEditReward(${r.id})">⚙️ Edit Reward</button>`:"";return `<article class="card"><div class="product-image">${imageHtml}</div><div class="product-content"><div class="product-name">${name}</div><div class="product-cost">${cost.toLocaleString()} points</div>${stockText?`<div style="font-size:12px;color:#858a82;margin:5px 0">${stockText}</div>`:""}<button class="redeem-button" ${canRedeem?"":"disabled"} onclick="openRedeem(${r.id})">${r.stock===0?"Sold out":(canRedeem?"Redeem":"Not enough points")}</button>${editButton}</div></article>`;}).join("");
  }

  function renderStoreFilters(){const c=document.getElementById("filters");if(!c)return;const cats=["All",...new Set(rewards.filter(r=>r.is_active!==false).map(r=>r.category).filter(Boolean))];c.innerHTML=cats.map(cat=>`<button class="filter ${cat===activeCategory?"active":""}" onclick="setCategory('${esc(cat)}')">${esc(cat)}</button>`).join("");}

  async function loadManaged(){const ok=await refreshRewards();if(ok){renderStoreFilters();renderStore();}}

  window.manageRewardEdit=edit; window.manageRewardToggle=toggle; window.manageRewardMove=move;
  window.openManageRewards=openManager;
  window.renderProducts=renderStore; window.renderFilters=renderStoreFilters;

  const originalOpenRedeem=window.openRedeem;
  window.openRedeem=function(id){const r=rewards.find(x=>x.id===Number(id));if(r&&r.stock!==null&&Number(r.stock)<=0){showToast("This reward is sold out.");return;}if(typeof originalOpenRedeem==="function")originalOpenRedeem(id);};

  styles();
  document.addEventListener("DOMContentLoaded",()=>{setTimeout(()=>{ensureButton();loadManaged();},100);setInterval(ensureButton,1000);});
  document.addEventListener("click",()=>setTimeout(ensureButton,0));
})();
