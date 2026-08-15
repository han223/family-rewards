const rewards = [

  {
    id: 1,
    name: "Movie Night",
    cost: 500,
    category: "Entertainment",
    image: "assets/images/movie-night.jpg"
  },

  {
    id: 2,
    name: "Ice Cream",
    cost: 300,
    category: "Food",
    icon: "🍦"
  },

  {
    id: 3,
    name: "Choose Dinner",
    cost: 800,
    category: "Privileges",
    icon: "🍽️"
  },

  {
    id: 4,
    name: "Toy of Choice",
    cost: 1200,
    category: "Toys",
    icon: "🧸"
  },

  {
    id: 5,
    name: "Extra Screen Time",
    cost: 400,
    category: "Privileges",
    icon: "📱"
  },

  {
    id: 6,
    name: "Pizza Night",
    cost: 700,
    category: "Food",
    icon: "🍕"
  },

  {
    id: 7,
    name: "Board Game",
    cost: 1000,
    category: "Toys",
    icon: "🎲"
  },

  {
    id: 8,
    name: "Family Outing",
    cost: 1500,
    category: "Entertainment",
    icon: "🎡"
  },

  {
    id: 9,
    name: "Favorite Dessert",
    cost: 350,
    category: "Food",
    icon: "🍰"
  },

  {
    id: 10,
    name: "Skip One Chore",
    cost: 600,
    category: "Privileges",
    icon: "✨"
  },

  {
    id: 11,
    name: "New Book",
    cost: 900,
    category: "Other",
    icon: "📚"
  },

  {
    id: 12,
    name: "$5 Treat",
    cost: 500,
    category: "Other",
    icon: "🎁"
  },

  {
    id: 13,
    name: "Game Night",
    cost: 650,
    category: "Entertainment",
    icon: "🎮"
  },

  {
    id: 14,
    name: "Small Toy",
    cost: 700,
    category: "Toys",
    icon: "🚗"
  },

  {
    id: 15,
    name: "Breakfast Choice",
    cost: 450,
    category: "Food",
    icon: "🥞"
  }

];


/* =====================================================
   SAVED PRODUCT NAMES
===================================================== */

const savedNames =
  JSON.parse(
    localStorage.getItem("familyRewardsNames") || "{}"
  );


/* =====================================================
   BALANCE
===================================================== */

let balance =
  Number(
    localStorage.getItem("familyRewardsBalance")
  );

if (Number.isNaN(balance)) {
  balance = 2450;
}


/* =====================================================
   REDEMPTION HISTORY
===================================================== */

let redemptionHistory =
  JSON.parse(
    localStorage.getItem("familyRewardsHistory") || "[]"
  );


/* =====================================================
   STATE
===================================================== */

let selectedReward = null;

let activeCategory = "All";


/* =====================================================
   GET PRODUCT NAME
===================================================== */

function getRewardName(reward) {

  return (
    savedNames[reward.id] ||
    reward.name
  );

}


/* =====================================================
   SAVE PRODUCT NAME
===================================================== */

function saveRewardName(id, name) {

  savedNames[id] = name;

  localStorage.setItem(
    "familyRewardsNames",
    JSON.stringify(savedNames)
  );

}


/* =====================================================
   SAVE BALANCE
===================================================== */

function saveBalance() {

  localStorage.setItem(
    "familyRewardsBalance",
    balance.toString()
  );

}


/* =====================================================
   SAVE HISTORY
===================================================== */

function saveHistory() {

  localStorage.setItem(
    "familyRewardsHistory",
    JSON.stringify(redemptionHistory)
  );

}


/* =====================================================
   CATEGORIES
===================================================== */

const categories = [
  "All",
  ...new Set(
    rewards.map(
      reward => reward.category
    )
  )
];


/* =====================================================
   RENDER FILTERS
===================================================== */

function renderFilters() {

  const container =
    document.getElementById("filters");

  container.innerHTML =
    categories
      .map(category => {

        return `
          <button
            class="filter ${
              category === activeCategory
                ? "active"
                : ""
            }"
            onclick="setCategory('${category}')"
          >
            ${category}
          </button>
        `;

      })
      .join("");

}


/* =====================================================
   EDIT REWARD NAME
===================================================== */

function editRewardName(id) {

  const reward =
    rewards.find(
      reward => reward.id === id
    );

  if (!reward) {
    return;
  }


  const currentName =
    getRewardName(reward);


  const newName =
    prompt(
      "Enter a new name for this reward:",
      currentName
    );


  if (newName === null) {
    return;
  }


  const trimmedName =
    newName.trim();


  if (trimmedName === "") {

    showToast(
      "Name cannot be empty."
    );

    return;

  }


  saveRewardName(
    reward.id,
    trimmedName
  );


  renderProducts();


  showToast(
    "Reward name updated."
  );

}


/* =====================================================
   RENDER PRODUCTS
===================================================== */

function renderProducts() {

  const grid =
    document.getElementById("productGrid");

  let visibleRewards;


  if (activeCategory === "All") {

    visibleRewards = rewards;

  } else {

    visibleRewards =
      rewards.filter(
        reward =>
          reward.category ===
          activeCategory
      );

  }


  grid.innerHTML =
    visibleRewards
      .map(reward => {

        const canRedeem =
          balance >= reward.cost;


        const rewardName =
          getRewardName(reward);


        return `

          <article class="card">

            <div class="product-image">

              ${
                reward.image

                  ? `
                    <img
                      src="${reward.image}"
                      alt="${rewardName}"
                    >
                  `

                  : `
                    <div class="product-icon">
                      ${reward.icon || ""}
                    </div>
                  `
              }

            </div>


            <div class="product-content">

              <div class="product-name">
                ${rewardName}
              </div>


              <div class="product-cost">
                ${reward.cost.toLocaleString()}
                points
              </div>


              <button
                class="redeem-button"
                ${
                  canRedeem
                    ? ""
                    : "disabled"
                }
                onclick="openRedeem(${reward.id})"
              >
                ${
                  canRedeem
                    ? "Redeem"
                    : "Not enough points"
                }
              </button>


              <button
                class="edit-name-button"
                onclick="editRewardName(${reward.id})"
              >
                ✏️ Edit name
              </button>

            </div>

          </article>

        `;

      })
      .join("");

}


/* =====================================================
   UPDATE BALANCE DISPLAY
===================================================== */

function updateBalanceDisplay() {

  const pointsElement =
    document.getElementById("points");

  if (!pointsElement) {
    return;
  }


  pointsElement.textContent =
    balance.toLocaleString();

}


/* =====================================================
   CATEGORY
===================================================== */

function setCategory(category) {

  activeCategory = category;

  renderFilters();

  renderProducts();

}


/* =====================================================
   OPEN REDEEM MODAL
===================================================== */

function openRedeem(id) {

  selectedReward =
    rewards.find(
      reward => reward.id === id
    );


  if (!selectedReward) {
    return;
  }


  const rewardName =
    getRewardName(selectedReward);


  document.getElementById(
    "modalTitle"
  ).textContent =
    `Redeem ${rewardName}?`;


  document.getElementById(
    "modalDescription"
  ).textContent =
    `This reward costs ${
      selectedReward.cost.toLocaleString()
    } points.`;


  const afterBalance =
    balance -
    selectedReward.cost;


  document.getElementById(
    "modalBalance"
  ).innerHTML = `

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


  selectedReward = null;

}


/* =====================================================
   CONFIRM REDEEM
===================================================== */

function confirmRedeem() {

  if (!selectedReward) {
    return;
  }


  if (
    balance <
    selectedReward.cost
  ) {

    closeModal();

    showToast(
      "Not enough points."
    );

    return;

  }


  balance -=
    selectedReward.cost;


  const rewardName =
    getRewardName(selectedReward);


  redemptionHistory.push({

    reward:
      rewardName,

    cost:
      selectedReward.cost,

    date:
      new Date().toLocaleDateString()

  });


  /* Save everything */

  saveBalance();

  saveHistory();


  /* Update screen */

  updateBalanceDisplay();


  closeModal();

  renderProducts();


  showToast(
    `${rewardName} redeemed successfully`
  );

}


/* =====================================================
   TOAST
===================================================== */

function showToast(message) {

  const toast =
    document.getElementById(
      "toast"
    );


  toast.textContent =
    message;


  toast.classList.add(
    "show"
  );


  setTimeout(() => {

    toast.classList.remove(
      "show"
    );

  }, 2400);

}


/* =====================================================
   HISTORY
===================================================== */

function showHistory() {

  if (
    redemptionHistory.length === 0
  ) {

    showToast(
      "No redemption history yet."
    );

    return;

  }


  const latest =
    redemptionHistory
      .map(
        item =>
          `${item.reward} (-${item.cost} pts)`
      )
      .join(" • ");


  showToast(
    latest
  );

}


/* =====================================================
   INITIALIZE
===================================================== */

updateBalanceDisplay();

renderFilters();

renderProducts();
