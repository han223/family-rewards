javascript
/* =====================================================
   SUPABASE CONFIG
===================================================== */

const SUPABASE_URL =
  "https://omvmjspbrugjjlerrkrf.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2cz1Ovi8mEhXTft6UfHXoQ_uXSF8bn4";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* =====================================================
   STATE
===================================================== */

let rewards = [];

let activeCategory = "All";

let selectedReward = null;


/* =====================================================
   BALANCE
===================================================== */

let balance =
  Number(
    localStorage.getItem(
      "familyRewardsBalance"
    )
  );

if (Number.isNaN(balance)) {

  balance = 2450;

}


/* =====================================================
   HISTORY
===================================================== */

let redemptionHistory =
  JSON.parse(
    localStorage.getItem(
      "familyRewardsHistory"
    ) || "[]"
  );


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/* =====================================================
   IMAGE URL
===================================================== */

function getRewardImage(reward) {

  if (!reward.image) {

    return null;

  }


  if (
    reward.image.startsWith("http://") ||
    reward.image.startsWith("https://")
  ) {

    return reward.image;

  }


  const result =
    supabaseClient
      .storage
      .from("product-images")
      .getPublicUrl(
        reward.image
      );


  return result.data.publicUrl;

}


/* =====================================================
   LOAD REWARDS
===================================================== */

async function loadRewards() {

  console.log(
    "Loading rewards from Supabase..."
  );


  const result =
    await supabaseClient
      .from("rewards")
      .select(
        "id,name,cost,category,image,icon"
      )
      .order(
        "id",
        {
          ascending: true
        }
      );


  console.log(
    "Supabase result:",
    result
  );


  if (result.error) {

    console.error(
      "Supabase error:",
      result.error
    );


    const grid =
      document.getElementById(
        "productGrid"
      );


    grid.innerHTML =
      "<p style='padding:40px'>Unable to load rewards. Check the browser Console.</p>";


    return;

  }


  rewards =
    result.data || [];


  console.log(
    "Rewards loaded:",
    rewards
  );


  renderFilters();

  renderProducts();

}


/* =====================================================
   FILTERS
===================================================== */

function renderFilters() {

  const container =
    document.getElementById(
      "filters"
    );


  const categories = [
    "All",
    ...new Set(
      rewards
        .map(
          reward =>
            reward.category
        )
        .filter(Boolean)
    )
  ];


  container.innerHTML =
    categories
      .map(
        category => {

          const active =
            category ===
            activeCategory
              ? "active"
              : "";


          return `
            <button
              class="filter ${active}"
              onclick="setCategory('${escapeHtml(category)}')"
            >
              ${escapeHtml(category)}
            </button>
          `;

        }
      )
      .join("");

}


/* =====================================================
   PRODUCTS
===================================================== */

function renderProducts() {

  const grid =
    document.getElementById(
      "productGrid"
    );


  let visibleRewards =
    rewards;


  if (
    activeCategory !==
    "All"
  ) {

    visibleRewards =
      rewards.filter(
        reward =>
          reward.category ===
          activeCategory
      );

  }


  grid.innerHTML =
    visibleRewards
      .map(
        reward => {

          const image =
            getRewardImage(
              reward
            );


          const name =
            escapeHtml(
              reward.name
            );


          const cost =
            Number(
              reward.cost || 0
            );


          const icon =
            escapeHtml(
              reward.icon ||
              "🎁"
            );


          const canRedeem =
            balance >=
            cost;


          let imageHtml;


          if (image) {

            imageHtml = `
              <img
                src="${image}"
                alt="${name}"
              >
            `;

          } else {

            imageHtml = `
              <div class="product-icon">
                ${icon}
              </div>
            `;

          }


          return `
            <article class="card">

              <div class="product-image">
                ${imageHtml}
              </div>

              <div class="product-content">

                <div class="product-name">
                  ${name}
                </div>

                <div class="product-cost">
                  ${cost.toLocaleString()}
                  points
                </div>

                <button
                  class="redeem-button"
                  ${canRedeem ? "" : "disabled"}
                  onclick="openRedeem(${reward.id})"
                >
                  ${
                    canRedeem
                      ? "Redeem"
                      : "Not enough points"
                  }
                </button>

              </div>

            </article>
          `;

        }
      )
      .join("");

}


/* =====================================================
   CATEGORY
===================================================== */

function setCategory(
  category
) {

  activeCategory =
    category;


  renderFilters();

  renderProducts();

}


/* =====================================================
   BALANCE DISPLAY
===================================================== */

function updateBalanceDisplay() {

  const element =
    document.getElementById(
      "points"
    );


  if (!element) {

    return;

  }


  element.textContent =
    balance.toLocaleString();

}


/* =====================================================
   REDEEM
===================================================== */

function openRedeem(
  id
) {

  selectedReward =
    rewards.find(
      reward =>
        reward.id === id
    );


  if (!selectedReward) {

    return;

  }


  const name =
    selectedReward.name;


  const cost =
    Number(
      selectedReward.cost || 0
    );


  document.getElementById(
    "modalTitle"
  ).textContent =
    `Redeem ${name}?`;


  document.getElementById(
    "modalDescription"
  ).textContent =
    `This reward costs ${cost.toLocaleString()} points.`;


  const afterBalance =
    balance -
    cost;


  document.getElementById(
    "modalBalance"
  ).innerHTML =
    `
      Current balance:
      <strong>
        ${balance.toLocaleString()} pts
      </strong>

      <br>

      After redemption:
      <strong>
        ${afterBalance.toLocaleString()} pts
      </strong>
    `;


  document.getElementById(
    "overlay"
  ).style.display =
    "flex";

}


/* =====================================================
   CLOSE MODAL
===================================================== */

function closeModal() {

  document.getElementById(
    "overlay"
  ).style.display =
    "none";


  selectedReward =
    null;

}


/* =====================================================
   CONFIRM REDEEM
===================================================== */

function confirmRedeem() {

  if (!selectedReward) {

    return;

  }


  const cost =
    Number(
      selectedReward.cost || 0
    );


  if (balance < cost) {

    closeModal();

    showToast(
      "Not enough points."
    );

    return;

  }


  balance -=
    cost;


  redemptionHistory.push({

    reward:
      selectedReward.name,

    cost:
      cost,

    date:
      new Date()
        .toLocaleDateString()

  });


  localStorage.setItem(
    "familyRewardsBalance",
    balance.toString()
  );


  localStorage.setItem(
    "familyRewardsHistory",
    JSON.stringify(
      redemptionHistory
    )
  );


  updateBalanceDisplay();

  closeModal();

  renderProducts();


  showToast(
    `${selectedReward.name} redeemed successfully`
  );

}


/* =====================================================
   TOAST
===================================================== */

function showToast(
  message
) {

  const toast =
    document.getElementById(
      "toast"
    );


  if (!toast) {

    return;

  }


  toast.textContent =
    message;


  toast.classList.add(
    "show"
  );


  setTimeout(
    function () {

      toast.classList.remove(
        "show"
      );

    },
    2400
  );

}


/* =====================================================
   HISTORY
===================================================== */

function showHistory() {

  if (
    redemptionHistory.length ===
    0
  ) {

    showToast(
      "No redemption history yet."
    );

    return;

  }


  const text =
    redemptionHistory
      .map(
        item =>
          `${item.reward} (-${item.cost} pts)`
      )
      .join(" • ");


  showToast(
    text
  );

}


/* =====================================================
   INITIALIZE
===================================================== */

updateBalanceDisplay();

loadRewards();

