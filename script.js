let transactions = [];   // list of all money entries
let categories   = [];   // list of budget categories
let budgetSaved  = false;    // has the user saved a budget yet?
let setupIsOpen  = true;     // is the budget setup section expanded?


// ---- PASTEL COLORS for categories ----
const COLORS = [
  '#c06070', 
  '#5e9470', 
  '#7a88c8', 
  '#c89050',
  '#7a9e88', 
  '#c070a8', 
  '#5090b0', 
  '#a88870', 
];
let colorCount = 0;
function getNextColor() {
  return COLORS[colorCount++ % COLORS.length];
}

//  BUDGET SETUP 
function addCategory() {
  const nameInput = document.getElementById('cat-name');
  const pctInput  = document.getElementById('cat-pct');

  const name = nameInput.value.trim().toLowerCase();
  const pct  = parseFloat(pctInput.value);

  // Validate inputs
  if (!name)                   return alert('Please enter a category name!');
  if (isNaN(pct) || pct <= 0) return alert('Please enter a percentage greater than 0.');
  if (getAllocated() + pct > 100)
    return alert(`Only ${100 - getAllocated()}% left to allocate!`);
  if (categories.find(c => c.name === name))
    return alert('That category already exists!');

  // Add it to our list
  categories.push({ name, pct, color: getNextColor(), spent: 0 });

  // Clear inputs
  nameInput.value = '';
  pctInput.value  = '';

  // Refresh the UI
  drawCategoryList();
  drawPctDisplay();
  updateCategoryDropdown();
}

function removeCategory(name) {
  categories = categories.filter(c => c.name !== name);
  drawCategoryList();
  drawPctDisplay();
  updateCategoryDropdown();
}

// Total % currently allocated
function getAllocated() {
  return categories.reduce((total, c) => total + c.pct, 0);
}

// Draw the list of added categories
function drawCategoryList() {
  const list = document.getElementById('cat-list');
  list.innerHTML = '';

  categories.forEach(cat => {
    const row = document.createElement('div');
    row.className = 'cat-row';
    row.innerHTML = `
      <div class="swatch" style="background: ${cat.color};"></div>
      <span class="cat-name">${cat.name}</span>
      <span class="cat-pct">${cat.pct}%</span>
      <button class="cat-del" onclick="removeCategory('${cat.name}')">×</button>
    `;
    list.appendChild(row);
  });
}

// Update the "X% / 100%" display
function drawPctDisplay() {
  const used = getAllocated();
  const el   = document.getElementById('pct-display');
  el.textContent = used + '%';
  // Green when exactly 100, red when over
  el.className = 'pct-display' + (used === 100 ? ' ok' : used > 100 ? ' over' : '');
}

// Keep the dropdown in the "add transaction" form up to date
function updateCategoryDropdown() {
  const sel = document.getElementById('tx-category');
  sel.innerHTML = '<option value="">pick category</option>';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.name;
    opt.textContent = cat.name;
    sel.appendChild(opt);
  });
}



//  SAVE BUDGET
function saveBudget() {
  if (categories.length === 0) return alert('Add at least one category first!');
  if (getAllocated() !== 100)
    return alert(`Your percentages add up to ${getAllocated()}% — they need to total exactly 100%.`);

  budgetSaved = true;
  categories.forEach(c => c.spent = 0); // reset spending to 0

  // Show the envelopes section
  document.getElementById('envelopes-block').style.display = 'block';

  // Show the minimise button on the setup block
  document.getElementById('setup-toggle').style.display = 'inline-block';

  // Auto-minimise the setup section
  collapseSetup();

  drawEnvelopes();
  alert('Budget saved! Your envelopes are ready ✦');
}


//  MINIMISE / EXPAND-the budget setup section
function toggleSetup() {
  if (setupIsOpen) {
    collapseSetup();
  } else {
    expandSetup();
  }
}

function collapseSetup() {
  setupIsOpen = false;
  document.getElementById('setup-body').classList.add('collapsed');
  document.getElementById('setup-toggle').textContent = 'edit ▾';
}

function expandSetup() {
  setupIsOpen = true;
  document.getElementById('setup-body').classList.remove('collapsed');
  document.getElementById('setup-toggle').textContent = 'minimise ▴';
}



//  ENVELOPES-per-category spending cards


function drawEnvelopes() {
  // Total income = how much money we have to divide up
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const container = document.getElementById('envelopes-list');
  container.innerHTML = '';

  categories.forEach(cat => {
    const reserved  = (cat.pct / 100) * totalIncome; // money set aside for this category
    const spent     = cat.spent || 0;
    const remaining = reserved - spent;
    const fillPct   = reserved > 0 ? Math.min((spent / reserved) * 100, 100) : 0;
    const isDepleted = remaining <= 0 && reserved > 0;

    // Light tinted background using the category color (hex + '18' = ~10% opacity)
    const bgTint = cat.color + '18';

    const card = document.createElement('div');
    card.className = 'envelope';
    card.style.background = bgTint;
    card.id = 'env-' + cat.name;

    card.innerHTML = `
      <div class="env-top">
        <span class="env-name">${cat.name}</span>
        <span class="env-badge">${cat.pct}% of income</span>
      </div>
      <div class="env-numbers">
        <div class="env-num-group">
          <span class="env-mini-label">reserved</span>
          <span class="env-val">${rupees(reserved)}</span>
        </div>
        <div class="env-num-group">
          <span class="env-mini-label">spent</span>
          <span class="env-val">${rupees(spent)}</span>
        </div>
        <div class="env-num-group">
          <span class="env-mini-label">remaining</span>
          <span class="env-val ${isDepleted ? 'empty' : 'good'}">${rupees(Math.max(remaining, 0))}</span>
        </div>
      </div>
      <div class="env-bar-bg">
        <div class="env-bar-fill" style="width:${fillPct}%; background:${cat.color};"></div>
      </div>
      ${isDepleted ? `<p class="env-depleted">✦ all ${cat.name} money is used up!</p>` : ''}
    `;

    container.appendChild(card);
  });
}



//  ADD TRANSACTION
// Show/hide the category picker depending on income vs expense
function toggleCatPicker() {
  const type   = document.getElementById('tx-type').value;
  const catSel = document.getElementById('tx-category');
  catSel.style.display = (type === 'expense' && budgetSaved) ? 'block' : 'none';
}

function addTransaction() {
  const type    = document.getElementById('tx-type').value;
  const amount  = parseFloat(document.getElementById('tx-amount').value);
  const desc    = document.getElementById('tx-desc').value.trim();
  const catName = document.getElementById('tx-category').value;

  // Validate
  if (!desc || isNaN(amount) || amount <= 0) return alert('Please fill in all fields!');
  if (type === 'expense' && budgetSaved && !catName) return alert('Please pick a category!');

  // Check overall balance
  if (type === 'expense') {
    const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const currentBalance = totalIncome - totalExpense;

    if (currentBalance <= 0) {
      // Balance is already 0 or below — block it completely
      return alert(' You have no money left! Add income before spending.');
    }

    if (amount > currentBalance) {
      // This single expense would push balance below 0 — block it
      return alert(`You only have ${rupees(currentBalance)} left overall. You can't spend ${rupees(amount)}.`);
    }
  }

  // Warn if the envelope doesn't have enough
  if (type === 'expense' && budgetSaved && catName) {
    const cat         = categories.find(c => c.name === catName);
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const reserved    = (cat.pct / 100) * totalIncome;
    const remaining   = reserved - (cat.spent || 0);

    if (amount > remaining) {
      const ok = confirm(`⚠️ Only ${rupees(remaining)} left in "${catName}".\nSpend anyway?`);
      if (!ok) return;
    }
  }

  // Save the transaction
  transactions.push({ type, amount, description: desc, category: catName || null });

  // Add to the category's spending total
  if (type === 'expense' && catName) {
    const cat = categories.find(c => c.name === catName);
    if (cat) cat.spent = (cat.spent || 0) + amount;
  }

  // Clear the form
  document.getElementById('tx-amount').value = '';
  document.getElementById('tx-desc').value   = '';

  // Refresh UI
  updateBalance();
  drawLog('all');
  resetTabs();
  if (budgetSaved) drawEnvelopes();
}


//  BALANCE
function updateBalance() {
  let income = 0, expense = 0;
  transactions.forEach(t => {
    if (t.type === 'income')  income  += t.amount;
    if (t.type === 'expense') expense += t.amount;
  });

  document.getElementById('balance').textContent       = rupees(income - expense);
  document.getElementById('total-income').textContent  = rupees(income);
  document.getElementById('total-expense').textContent = rupees(expense);

  if (budgetSaved) drawEnvelopes();
}

//  TRANSACTION LOG
function resetTabs() {
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab')[0].classList.add('active');
  drawLog('all');
}

function switchTab(filter, btn) {
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  drawLog(filter);
}

function drawLog(filter) {
  const list = document.getElementById('tx-list');
  list.innerHTML = '';

  // Newest first, filtered by tab
  const items = [...transactions]
    .reverse()
    .filter(t => filter === 'all' || t.type === filter);

  if (items.length === 0) {
    list.innerHTML = '<li class="empty-note">nothing here yet ✦</li>';
    return;
  }

  items.forEach(tx => {
    const li = document.createElement('li');
    li.className = 'tx-item';

    const sign = tx.type === 'income' ? '+' : '−';

    // Colored pill for the category
    const cat     = tx.category ? categories.find(c => c.name === tx.category) : null;
    const pillHTML = cat
      ? `<span class="tx-pill" style="background:${cat.color}22; color:${cat.color};">${cat.name}</span>`
      : '';

    li.innerHTML = `
      <div class="tx-left">
        <span class="tx-desc">${tx.description}</span>
        <span class="tx-meta">${tx.type} ${pillHTML}</span>
      </div>
      <span class="tx-amt ${tx.type}">${sign}${rupees(tx.amount)}</span>
    `;

    list.appendChild(li);
  });
}



//  HELPER-format a number as ₹0.00
function rupees(n) {
  return '₹' + Math.abs(n).toFixed(2);
}


//  START — run when the page loads
updateBalance();
drawLog('all');