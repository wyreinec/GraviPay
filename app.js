let state = getEmptyState();

let currentView = 'editor'; // 'editor' | 'history'
let billHistory = [];
let currentTheme = 'dark'; // 'dark' | 'light'

let historyFilters = {
    creator: "",
    status: "all",
    dateFrom: "",
    dateTo: "",
    platform: "all",
    title: "",
    sortBy: "updatedDesc" // "updatedDesc", "createdDesc", "totalDesc", "totalAsc", "dateAsc", "dateDesc"
};

function getEmptyState() {
    return {
        id: generateId(),
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        session: {
            title: "",
            date: new Date().toISOString().split('T')[0],
            hostName: "",
            hostInfo: "",
            platform: "Dine-in",
            taxValue: 0,
            taxType: "%",
            serviceValue: 0,
            serviceType: "%",
            deliveryFee: 0,
            orderFee: 0
        },
        participants: [],
        items: [],
        discounts: []
    };
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// ----------------- STATE ACTIONS -----------------
function updateSession(key, value) {
    state.session[key] = value;
    autoSave();
}

function addParticipant(name) {
    if (!name.trim()) return;
    state.participants.push({ id: generateId(), name: name.trim(), isPaid: false });
    autoSave();
}

function removeParticipant(id) {
    state.participants = state.participants.filter(p => p.id !== id);
    state.items.forEach(item => {
        item.assignedTo = item.assignedTo.filter(pId => pId !== id);
    });
    autoSave();
}

function toggleParticipantPaid(id) {
    const p = state.participants.find(p => p.id === id);
    if (p) {
        p.isPaid = !p.isPaid;
        autoSave();
    }
}

function addItem(name, price, qty = 1) {
    if (!name.trim() || price < 0 || qty <= 0) return;
    state.items.push({
        id: generateId(),
        name: name.trim(),
        price: parseFloat(price) || 0,
        qty: parseInt(qty) || 1,
        assignedTo: []
    });
    autoSave();
}

function updateItem(id, key, value) {
    const item = state.items.find(i => i.id === id);
    if (item) {
        if (key === 'price') item.price = parseFloat(value) || 0;
        else if (key === 'qty') item.qty = parseInt(value) || 1;
        else item[key] = value;
        autoSave();
    }
}

function removeItem(id) {
    state.items = state.items.filter(i => i.id !== id);
    autoSave();
}

function toggleItemAssignment(itemId, participantId) {
    const item = state.items.find(i => i.id === itemId);
    if (item) {
        if (item.assignedTo.includes(participantId)) {
            item.assignedTo = item.assignedTo.filter(id => id !== participantId);
        } else {
            item.assignedTo.push(participantId);
        }
        autoSave();
    }
}

function addDiscount(name, value, type = 'rp') {
    if (!name.trim() || value < 0) return;
    state.discounts.push({
        id: generateId(),
        name: name.trim(),
        value: parseFloat(value) || 0,
        type: type
    });
    autoSave();
}

function removeDiscount(id) {
    state.discounts = state.discounts.filter(d => d.id !== id);
    autoSave();
}

// ----------------- UI MODALS -----------------
function showConfirmModal(title, message, confirmText, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay fade-in';

    const card = document.createElement('div');
    card.className = 'card modal-card';

    card.innerHTML = `
        <h3 style="margin-bottom:0.5rem; color:var(--text-main)">${title}</h3>
        <p style="margin-bottom:1.5rem; color:var(--text-muted); font-size:0.9rem; line-height: 1.5;">${message}</p>
        <div class="flex-row items-center space-between">
            <button class="btn-secondary" style="flex:1" id="modal-cancel">Cancel</button>
            <button class="btn-danger ml-1" style="flex:1; background:var(--danger); color:white;" id="modal-confirm">${confirmText}</button>
        </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    document.getElementById('modal-cancel').onclick = () => document.body.removeChild(overlay);
    document.getElementById('modal-confirm').onclick = () => {
        document.body.removeChild(overlay);
        onConfirm();
    };
}

// ----------------- HISTORY ACTIONS -----------------
function saveCurrentToHistory() {
    if (state.participants.length > 0 || state.items.length > 0) {
        const existingIdx = billHistory.findIndex(h => h.id === state.id);
        const snapshot = JSON.parse(JSON.stringify(state));
        if (!snapshot.createdAt) snapshot.createdAt = new Date().toISOString();
        snapshot.lastUpdated = new Date().toISOString();

        if (existingIdx >= 0) {
            billHistory[existingIdx] = snapshot;
        } else {
            billHistory.unshift(snapshot);
        }
        saveStorage();
    }
}

function startNewBill() {
    if (state.participants.length > 0 || state.items.length > 0) {
        showConfirmModal(
            "Start New Bill",
            "Your current progress will be securely saved into the History tab. Start a fresh bill?",
            "Start New",
            executeNewBill
        );
    } else {
        executeNewBill();
    }
}

function executeNewBill() {
    saveCurrentToHistory();
    state = getEmptyState();
    currentView = 'editor';
    saveStorage();
    render();
}

function switchView(view) {
    if (view === 'history') {
        saveCurrentToHistory();
    }
    currentView = view;
    render();
}

function loadBillFromHistory(id) {
    const bill = billHistory.find(h => h.id === id);
    if (bill) {
        saveCurrentToHistory();
        state = JSON.parse(JSON.stringify(bill));
        currentView = 'editor';
        saveStorage();
        render();
    }
}

function deleteHistoryBill(id) {
    showConfirmModal(
        "Delete Bill",
        "Are you sure you want to permanently delete this bill from history?",
        "Delete",
        () => {
            billHistory = billHistory.filter(h => h.id !== id);
            if (state.id === id) {
                state = getEmptyState();
            }
            saveStorage();
            render();
        }
    );
}

function toggleHistoryParticipantPaid(billId, pId) {
    const bill = billHistory.find(h => h.id === billId);
    if (bill) {
        const p = bill.participants.find(x => x.id === pId);
        if (p) {
            p.isPaid = !p.isPaid;
            bill.lastUpdated = new Date().toISOString();
            if (state.id === billId) {
                const activeP = state.participants.find(x => x.id === pId);
                if (activeP) activeP.isPaid = p.isPaid;
                state.lastUpdated = bill.lastUpdated;
            }
            saveStorage();
            render();
        }
    }
}

function updateHistoryFilter(key, value) {
    historyFilters[key] = value;
    render();
}

// ----------------- RENDERERS (EDITOR) -----------------
function renderNav() {
    return `
        <div class="flex-row space-between items-center mb-3">
            <div class="flex-row gap-2">
                <button class="${currentView === 'editor' ? 'btn-primary' : 'btn-secondary'}" style="${currentView === 'editor' ? '' : 'background:var(--surface-hover);'}" onclick="switchView('editor')">Current Bill</button>
                <button class="${currentView === 'history' ? 'btn-primary' : 'btn-secondary'}" style="${currentView === 'history' ? '' : 'background:var(--surface-hover);'}" onclick="switchView('history')">History (${billHistory.length})</button>
            </div>
            ${currentView === 'editor' ? `<button onclick="startNewBill()" style="background:var(--success)">+ New Bill</button>` : ''}
        </div>
    `;
}

function renderSessionSetup() {
    return `
        <div class="card fade-in">
            <h2>1. Bill Details</h2>
            <div class="input-group">
                <label>Title / Occasion</label>
                <input type="text" placeholder="e.g., Dinner at Sushiro" value="${state.session.title}" onchange="updateSession('title', this.value)">
            </div>
            <div class="flex-row flex-wrap mt-2 mb-2">
                <div class="input-group" style="flex:1; min-width: 140px;">
                    <label>Date</label>
                    <input type="date" value="${state.session.date}" onchange="updateSession('date', this.value)">
                </div>
                <div class="input-group" style="flex:1; min-width: 140px;">
                    <label>Category</label>
                    <select onchange="updateSession('platform', this.value)">
                        <option value="Dining / Food" ${state.session.platform === 'Dining / Food' ? 'selected' : ''}>Dining / Food</option>
                        <option value="Transport / Ride" ${state.session.platform === 'Transport / Ride' ? 'selected' : ''}>Transport / Ride</option>
                        <option value="Groceries" ${state.session.platform === 'Groceries' ? 'selected' : ''}>Groceries</option>
                        <option value="Travel / Hotel" ${state.session.platform === 'Travel / Hotel' ? 'selected' : ''}>Travel / Hotel</option>
                        <option value="Utilities / Bills" ${state.session.platform === 'Utilities / Bills' ? 'selected' : ''}>Utilities / Bills</option>
                        <option value="Shopping" ${state.session.platform === 'Shopping' ? 'selected' : ''}>Shopping</option>
                        <option value="Other" ${state.session.platform === 'Other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
            </div>
            <div class="flex-row flex-wrap">
                <div class="input-group" style="flex:1; min-width: 140px;">
                    <label>Creator / Host Name</label>
                    <input type="text" placeholder="e.g., Alice" value="${state.session.hostName || ''}" onchange="updateSession('hostName', this.value)">
                </div>
                <div class="input-group" style="flex:2; min-width: 200px;">
                    <label>Host's Payment Info (Wallet/Bank)</label>
                    <input type="text" placeholder="e.g., BCA 12345678 or GoPay 0812..." value="${state.session.hostInfo}" onchange="updateSession('hostInfo', this.value)">
                </div>
            </div>
        </div>
    `;
}

function renderParticipants() {
    const list = state.participants.map(p => `
        <div class="participant-row">
            <span>${p.name}</span>
            <button class="btn-danger btn-sm" onclick="removeParticipant('${p.id}')">✕</button>
        </div>
    `).join('');

    return `
        <div class="card fade-in" style="animation-delay: 0.1s">
            <h2>2. Friends</h2>
            <div class="participants-list">${list}</div>
            <div class="flex-row items-end mt-2">
                <div class="input-group" style="flex: 1; margin: 0;">
                    <input type="text" id="new-participant" placeholder="Name" style="margin: 0;" onkeydown="if(event.key === 'Enter') { addParticipant(this.value); this.value=''; }">
                </div>
                <button onclick="const el = document.getElementById('new-participant'); addParticipant(el.value); el.value='';">Add</button>
            </div>
        </div>
    `;
}

function renderItems() {
    const list = state.items.map(item => {
        const isShared = item.assignedTo.length === 0;
        let assignmentsHtml = state.participants.map(p => {
            const isAssigned = item.assignedTo.includes(p.id);
            return `<span class="badge ${isAssigned ? 'active' : ''}" onclick="toggleItemAssignment('${item.id}', '${p.id}')">${p.name}</span>`;
        }).join('');

        return `
            <div class="item-row mt-2 p-2 border rounded">
                <div class="flex-row mb-1">
                    <input style="flex: 2; margin:0;" type="text" value="${item.name}" onchange="updateItem('${item.id}', 'name', this.value)">
                    <input style="flex: 1; margin:0; min-width:80px;" type="number" value="${item.price}" onchange="updateItem('${item.id}', 'price', this.value)">
                    <input style="flex: 1; margin:0; max-width:60px;" type="number" value="${item.qty}" min="1" onchange="updateItem('${item.id}', 'qty', this.value)">
                    <button class="btn-danger btn-sm" onclick="removeItem('${item.id}')">✕</button>
                </div>
                <div class="text-sm mt-1 mb-1">Split among:</div>
                <div class="assignments-wrap text-sm">
                    <span class="badge ${isShared ? 'active' : ''}" onclick="updateItem('${item.id}', 'assignedTo', [])">All (Shared)</span>
                    ${assignmentsHtml}
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="card fade-in" style="animation-delay: 0.2s">
            <h2>3. Items</h2>
            <div class="items-list">${list}</div>
            
            <div class="flex-row items-end mt-3">
                <div class="input-group" style="flex: 2; margin:0;">
                    <input type="text" id="new-item-name" placeholder="Item Name" style="margin:0;">
                </div>
                <div class="input-group" style="flex: 1; margin:0; min-width:80px;">
                    <input type="number" id="new-item-price" placeholder="Price" style="margin:0;">
                </div>
                <div class="input-group" style="flex: 1; margin:0; max-width: 60px;">
                    <input type="number" id="new-item-qty" placeholder="Qty" value="1" min="1" style="margin:0;">
                </div>
                <button onclick="const n=document.getElementById('new-item-name'); const p=document.getElementById('new-item-price'); const q=document.getElementById('new-item-qty'); addItem(n.value, p.value, q.value); n.value=''; p.value=''; q.value='1';">Add</button>
            </div>
        </div>
    `;
}

function renderDiscounts() {
    const list = state.discounts.map(d => `
        <div class="participant-row">
            <span>${d.name} <span class="text-sm">(${d.type === '%' ? d.value + '%' : formatMoney(d.value)})</span></span>
            <button class="btn-danger btn-sm" onclick="removeDiscount('${d.id}')">✕</button>
        </div>
    `).join('');

    return `
        <div class="card fade-in" style="animation-delay: 0.25s">
            <h2>4. Promos / Discounts</h2>
            <div class="participants-list">${list}</div>
            
            <div class="flex-row items-end mt-2">
                <div class="input-group" style="flex: 2; margin:0;">
                    <input type="text" id="new-disc-name" placeholder="Promo Name" style="margin:0;">
                </div>
                <div class="input-group" style="flex: 1; margin:0; min-width:80px;">
                    <input type="number" id="new-disc-val" placeholder="Value" style="margin:0;">
                </div>
                <div class="input-group" style="flex: 1; margin:0;">
                    <select id="new-disc-type" style="padding: 0.75rem; margin: 0;">
                        <option value="rp">Rp</option>
                        <option value="%">%</option>
                    </select>
                </div>
                <button onclick="const n=document.getElementById('new-disc-name'); const v=document.getElementById('new-disc-val'); const t=document.getElementById('new-disc-type'); addDiscount(n.value, v.value, t.value); n.value=''; v.value=''; t.value='rp';">Add</button>
            </div>
        </div>
    `;
}

function renderCharges() {
    const renderTypeSelect = (key) => `
        <select class="type-sel" onchange="updateSession('${key}', this.value)" style="width:50px; padding:0.2rem; margin:0; font-size: 0.8rem; height: 30px; display:inline-block">
            <option value="%" ${state.session[key] === '%' ? 'selected' : ''}>%</option>
            <option value="rp" ${state.session[key] === 'rp' ? 'selected' : ''}>Rp</option>
        </select>
    `;

    return `
        <div class="card fade-in" style="animation-delay: 0.3s">
            <h2>5. Extra Fees & Tax</h2>
            <div class="flex-row flex-wrap mb-2">
                <div class="input-group" style="flex:1; min-width:120px; margin:0;">
                    <div class="flex-row space-between items-center text-sm mb-1">
                        <span>Tax/VAT</span> ${renderTypeSelect('taxType')}
                    </div>
                    <input type="number" step="0.1" value="${state.session.taxValue}" style="margin:0;" onchange="updateSession('taxValue', parseFloat(this.value)||0)">
                </div>
                <div class="input-group" style="flex:1; min-width:120px; margin:0;">
                    <div class="flex-row space-between items-center text-sm mb-1">
                        <span>Svc/Admin</span> ${renderTypeSelect('serviceType')}
                    </div>
                    <input type="number" step="0.1" value="${state.session.serviceValue}" style="margin:0;" onchange="updateSession('serviceValue', parseFloat(this.value)||0)">
                </div>
            </div>
            <div class="flex-row flex-wrap">
                <div class="input-group" style="flex:1; min-width:120px; margin:0;">
                    <label class="text-sm mb-1">Delivery/Shipping (Rp)</label>
                    <input type="number" step="1000" value="${state.session.deliveryFee}" style="margin:0;" onchange="updateSession('deliveryFee', parseFloat(this.value)||0)">
                </div>
                <div class="input-group" style="flex:1; min-width:120px; margin:0;">
                    <label class="text-sm mb-1">Platform/Misc Fee (Rp)</label>
                    <input type="number" step="1000" value="${state.session.orderFee}" style="margin:0;" onchange="updateSession('orderFee', parseFloat(this.value)||0)">
                </div>
            </div>
        </div>
    `;
}

function renderSummary() {
    if (state.participants.length === 0) return '';
    const bill = calculateBill(state);

    // Build metadata text
    const createdAtTxt = new Date(state.createdAt).toLocaleString('en-GB');
    const updatedAtTxt = new Date(state.lastUpdated).toLocaleString('en-GB');

    const summaryCards = state.participants.map(p => {
        const t = bill.userTotals[p.id];

        return `
            <div class="user-summary-card mb-2 p-2 border rounded" style="background: var(--row-bg)">
                <div class="flex-row space-between items-center mb-1">
                    <h3 style="margin:0; font-size:1.1rem">${p.name}</h3>
                    <h3 style="margin:0; color:var(--primary)">${formatMoney(t.grandTotal)}</h3>
                </div>
                <div class="flex-row space-between items-center mt-2">
                    <button class="btn-sm" 
                            style="${p.isPaid ? 'background:var(--success)' : 'background:transparent; border:1px solid var(--border-color); color:var(--text-main)'}" 
                            onclick="toggleParticipantPaid('${p.id}')">
                        ${p.isPaid ? 'Paid ✓' : 'Pay'}
                    </button>
                    <button class="btn-sm" onclick="shareParticipantBill('${p.id}', this, false)">Copy Bill</button>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="card fade-in" style="animation-delay: 0.4s">
            <div class="flex-row space-between items-center mb-2">
                <h2 style="margin:0;">6. Summary & Share</h2>
                <div class="text-xs text-right">
                    <div>Created: ${createdAtTxt}</div>
                    <div>Updated: ${updatedAtTxt}</div>
                </div>
            </div>
            <div class="flex-row space-between mb-2 p-2 rounded" style="background: var(--surface-hover)">
                <span>Total Bill</span>
                <span style="font-weight:bold; font-size:1.2rem">${formatMoney(bill.grandTotal)}</span>
            </div>
            ${summaryCards}
        </div>
    `;
}

// ----------------- RENDERERS (HISTORY) -----------------
function renderHistoryFilters() {
    return `
        <div class="filter-bar">
            <h3 class="mb-2 text-sm" style="color:var(--text-muted)">Filter History</h3>
            <div class="filter-grid">
                <div class="input-group">
                    <label>Title</label>
                    <input type="text" placeholder="Search title..." value="${historyFilters.title}" oninput="updateHistoryFilter('title', this.value)">
                </div>
                <div class="input-group">
                    <label>Creator / Host</label>
                    <input type="text" placeholder="Search host..." value="${historyFilters.creator}" oninput="updateHistoryFilter('creator', this.value)">
                </div>
                <div class="input-group">
                    <label>Status</label>
                    <select onchange="updateHistoryFilter('status', this.value)">
                        <option value="all" ${historyFilters.status === 'all' ? 'selected' : ''}>All</option>
                        <option value="unpaid" ${historyFilters.status === 'unpaid' ? 'selected' : ''}>Has Unpaid</option>
                        <option value="paid" ${historyFilters.status === 'paid' ? 'selected' : ''}>Fully Paid</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>Category</label>
                    <select onchange="updateHistoryFilter('platform', this.value)">
                        <option value="all" ${historyFilters.platform === 'all' ? 'selected' : ''}>All</option>
                        <option value="Dining / Food" ${historyFilters.platform === 'Dining / Food' ? 'selected' : ''}>Dining / Food</option>
                        <option value="Transport / Ride" ${historyFilters.platform === 'Transport / Ride' ? 'selected' : ''}>Transport / Ride</option>
                        <option value="Groceries" ${historyFilters.platform === 'Groceries' ? 'selected' : ''}>Groceries</option>
                        <option value="Travel / Hotel" ${historyFilters.platform === 'Travel / Hotel' ? 'selected' : ''}>Travel / Hotel</option>
                        <option value="Utilities / Bills" ${historyFilters.platform === 'Utilities / Bills' ? 'selected' : ''}>Utilities / Bills</option>
                        <option value="Shopping" ${historyFilters.platform === 'Shopping' ? 'selected' : ''}>Shopping</option>
                        <option value="Other" ${historyFilters.platform === 'Other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>Date After</label>
                    <input type="date" value="${historyFilters.dateFrom}" onchange="updateHistoryFilter('dateFrom', this.value)">
                </div>
                <div class="input-group">
                    <label>Date Before</label>
                    <input type="date" value="${historyFilters.dateTo}" onchange="updateHistoryFilter('dateTo', this.value)">
                </div>
                <div class="input-group">
                    <label>Sort By</label>
                    <select onchange="updateHistoryFilter('sortBy', this.value)">
                        <option value="updatedDesc" ${historyFilters.sortBy === 'updatedDesc' ? 'selected' : ''}>Last Updated (Newest First)</option>
                        <option value="createdDesc" ${historyFilters.sortBy === 'createdDesc' ? 'selected' : ''}>Recently Created</option>
                        <option value="dateDesc" ${historyFilters.sortBy === 'dateDesc' ? 'selected' : ''}>Bill Date (Newest to Oldest)</option>
                        <option value="dateAsc" ${historyFilters.sortBy === 'dateAsc' ? 'selected' : ''}>Bill Date (Oldest to Newest)</option>
                        <option value="totalDesc" ${historyFilters.sortBy === 'totalDesc' ? 'selected' : ''}>Highest Total First</option>
                        <option value="totalAsc" ${historyFilters.sortBy === 'totalAsc' ? 'selected' : ''}>Lowest Total First</option>
                    </select>
                </div>
            </div>
        </div>
    `;
}

function getFilteredHistory() {
    let result = billHistory.filter(b => {
        if (historyFilters.title && !b.session.title.toLowerCase().includes(historyFilters.title.toLowerCase())) return false;
        if (historyFilters.creator && !(b.session.hostName || '').toLowerCase().includes(historyFilters.creator.toLowerCase())) return false;

        let paidCount = b.participants.filter(p => p.isPaid).length;
        let totalCount = b.participants.length;
        let allPaid = totalCount > 0 && paidCount === totalCount;

        if (historyFilters.status === 'paid' && !allPaid) return false;
        if (historyFilters.status === 'unpaid' && (allPaid || totalCount === 0)) return false;

        if (historyFilters.platform !== 'all' && b.session.platform !== historyFilters.platform) return false;

        if (historyFilters.dateFrom && new Date(b.session.date) < new Date(historyFilters.dateFrom)) return false;
        if (historyFilters.dateTo && new Date(b.session.date) > new Date(historyFilters.dateTo)) return false;

        return true;
    });

    result.sort((a, b) => {
        let valA, valB;
        if (historyFilters.sortBy === 'updatedDesc') {
            return new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime();
        } else if (historyFilters.sortBy === 'createdDesc') {
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        } else if (historyFilters.sortBy === 'dateDesc') {
            return new Date(b.session.date || 0).getTime() - new Date(a.session.date || 0).getTime();
        } else if (historyFilters.sortBy === 'dateAsc') {
            return new Date(a.session.date || 0).getTime() - new Date(b.session.date || 0).getTime();
        } else if (historyFilters.sortBy === 'totalDesc') {
            return calculateBill(b).grandTotal - calculateBill(a).grandTotal;
        } else if (historyFilters.sortBy === 'totalAsc') {
            return calculateBill(a).grandTotal - calculateBill(b).grandTotal;
        }
        return 0;
    });

    return result;
}

function copyUnpaidReminder(billId, btnEl) {
    const bill = billHistory.find(h => h.id === billId);
    if (!bill) return;

    const calc = calculateBill(bill);
    const unpaid = bill.participants.filter(p => !p.isPaid);

    if (unpaid.length === 0) {
        alert("Everyone has already paid!");
        return;
    }

    let titleText = bill.session.title || 'Split Bill';
    if (bill.session.platform && bill.session.platform !== 'Other') {
        titleText += ` (${bill.session.platform})`;
    }

    let text = `🔔 *Reminder for ${titleText}*\n`;
    if (bill.session.date) text += `📅 ${bill.session.date}\n`;
    text += `\nHi everyone! Just a gentle reminder for those who haven't paid their share:\n\n`;

    unpaid.forEach(p => {
        text += `- ${p.name}: ${formatMoney(calc.userTotals[p.id].grandTotal)}\n`;
    });

    if (bill.session.hostInfo) {
        let nameLine = bill.session.hostName ? ` to ${bill.session.hostName}` : '';
        text += `\n💳 Please transfer${nameLine}:\n${bill.session.hostInfo}`;
    }

    navigator.clipboard.writeText(text).then(() => {
        const oldText = btnEl.innerText;
        btnEl.innerText = "Reminders Copied!";
        btnEl.style.background = "var(--success)";
        setTimeout(() => {
            btnEl.innerText = oldText;
            btnEl.style.background = "";
        }, 3000);
    }).catch(e => {
        console.error("Copy failed", e);
        prompt("Copy logic failed. Copy manually:", text);
    });
}

function renderHistoryView() {
    let rawHtml = renderHistoryFilters();

    const filtered = getFilteredHistory();

    if (filtered.length === 0) {
        rawHtml += `<div class="card text-center fade-in"><p>No bills match the current filters.</p></div>`;
        return rawHtml;
    }

    const html = filtered.map(b => {
        const calc = calculateBill(b);
        let paidCount = b.participants.filter(p => p.isPaid).length;
        let totalCount = b.participants.length;
        let allPaid = totalCount > 0 && paidCount === totalCount;
        let hasUnpaid = !allPaid && totalCount > 0;

        let creatorLine = b.session.hostName ? ` | Created by: ${b.session.hostName}` : '';

        const createdTxt = b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-GB') : '-';
        const updatedTxt = b.lastUpdated ? new Date(b.lastUpdated).toLocaleDateString('en-GB') : '-';

        return `
            <div class="card mb-2 fade-in relative" style="${allPaid ? 'border-color: var(--success);' : ''}">
                <div class="flex-row space-between items-center mb-2">
                    <div>
                        <h3 style="margin-bottom:0.2rem">${b.session.title || 'Untitled Session'}</h3>
                        <div class="text-sm">${b.session.date} | ${b.session.platform}${creatorLine}</div>
                        <div class="text-xs mt-1">Created: ${createdTxt} | Updated: ${updatedTxt}</div>
                    </div>
                    <div style="text-align:right">
                        <div style="font-weight:bold; color:var(--primary); font-size: 1.1rem;">${formatMoney(calc.grandTotal)}</div>
                        <div class="text-sm" style="color:${allPaid ? 'var(--success)' : 'var(--text-muted)'}">${paidCount}/${totalCount} Paid</div>
                    </div>
                </div>
                
                <div class="mb-2 p-2 border rounded" style="background: var(--row-bg)">
                    ${b.participants.map(p => `
                        <div class="flex-row space-between items-center mb-1 text-sm">
                            <span>${p.name} - ${formatMoney(calc.userTotals[p.id].grandTotal)}</span>
                            <button class="btn-sm" 
                                    style="padding:0.2rem 0.5rem; ${p.isPaid ? 'background:var(--success)' : 'background:transparent; border:1px solid var(--border-color); color:var(--text-main)'}" 
                                    onclick="toggleHistoryParticipantPaid('${b.id}', '${p.id}')">
                                ${p.isPaid ? 'Paid ✓' : 'Pay'}
                            </button>
                        </div>
                    `).join('')}
                </div>
                
                <div class="flex-row space-between flex-wrap">
                    <button class="btn-danger btn-sm" onclick="deleteHistoryBill('${b.id}')">Delete</button>
                    <div class="flex-row">
                        ${hasUnpaid ? `<button class="btn-sm" style="background:var(--text-main); color:var(--bg-color)" onclick="copyUnpaidReminder('${b.id}', this)">Copy Unpaid Reminder</button>` : ''}
                        <button class="btn-sm" style="background:var(--success)" onclick="loadBillFromHistory('${b.id}')">Open & Edit</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    rawHtml += `
        <div class="fade-in">
            ${html}
        </div>
    `;
    return rawHtml;
}

// ----------------- CORE LOGIC -----------------
function calculateBill(sourceState) {
    const userTotals = {};
    let subtotal = 0;

    sourceState.participants.forEach(p => {
        userTotals[p.id] = { subtotal: 0, items: [] };
    });

    sourceState.items.forEach(item => {
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;

        let splitIds = item.assignedTo;
        if (splitIds.length === 0) {
            splitIds = sourceState.participants.map(p => p.id);
        }

        if (splitIds.length > 0) {
            const splitAmount = itemTotal / splitIds.length;
            splitIds.forEach(pId => {
                if (userTotals[pId]) {
                    userTotals[pId].subtotal += splitAmount;
                    userTotals[pId].items.push({ name: item.name, amount: splitAmount });
                }
            });
        }
    });

    let totalDiscount = 0;
    sourceState.discounts.forEach(d => {
        totalDiscount += d.type === '%' ? subtotal * (d.value / 100) : d.value;
    });

    const netSubtotal = Math.max(0, subtotal - totalDiscount);
    let discountRatio = subtotal > 0 ? (totalDiscount / subtotal) : 0;

    let totalTax = sourceState.session.taxType === '%' ? netSubtotal * (sourceState.session.taxValue / 100) : sourceState.session.taxValue;
    let totalSvc = sourceState.session.serviceType === '%' ? netSubtotal * (sourceState.session.serviceValue / 100) : sourceState.session.serviceValue;

    let totalDelivery = sourceState.session.deliveryFee || 0;
    let totalOrderFee = sourceState.session.orderFee || 0;

    const grandTotal = netSubtotal + totalTax + totalSvc + totalDelivery + totalOrderFee;

    let taxRatio = netSubtotal > 0 ? (totalTax / netSubtotal) : 0;
    let svcRatio = netSubtotal > 0 ? (totalSvc / netSubtotal) : 0;

    Object.keys(userTotals).forEach(pId => {
        let pSub = userTotals[pId].subtotal;
        let shareRatio = subtotal > 0 ? (pSub / subtotal) : 0;

        let pDiscount = shareRatio * totalDiscount;
        let pDelivery = shareRatio * totalDelivery;
        let pOrderFee = shareRatio * totalOrderFee;

        let pNet = pSub - pDiscount;
        let pTax = pNet * taxRatio;
        let pSvc = pNet * svcRatio;

        let pGrand = pNet + pTax + pSvc + pDelivery + pOrderFee;

        userTotals[pId].discount = pDiscount;
        userTotals[pId].delivery = pDelivery;
        userTotals[pId].orderFee = pOrderFee;
        userTotals[pId].tax = pTax;
        userTotals[pId].svc = pSvc;
        userTotals[pId].grandTotal = pGrand;
    });

    return { subtotal, netSubtotal, totalDiscount, totalTax, totalSvc, totalDelivery, totalOrderFee, grandTotal, userTotals };
}

function shareParticipantBill(pId, btnEl, historyMode) {
    const targetState = historyMode ? billHistory.find(h => h.participants.some(p => p.id === pId)) : state;
    if (!targetState) return;

    const p = targetState.participants.find(x => x.id === pId);
    if (p) {
        const text = generateReceiptText(targetState, p);
        navigator.clipboard.writeText(text).then(() => {
            const oldText = btnEl.innerText;
            btnEl.innerText = "Copied!";
            btnEl.style.background = "var(--success)";
            btnEl.style.borderColor = "var(--success)";
            setTimeout(() => {
                btnEl.innerText = oldText;
                btnEl.style.background = "";
                btnEl.style.borderColor = "";
            }, 2000);
        }).catch(e => {
            console.error("Copy failed", e);
            prompt("Copy logic failed. Copy manually:", text);
        });
    }
}

function generateReceiptText(sourceState, p) {
    const b = calculateBill(sourceState);
    const totals = b.userTotals[p.id];

    let itemsText = totals.items.map(i => `- ${i.name}: ${formatMoney(i.amount)}`).join('\n');
    let title = `${sourceState.session.title || 'Session'}`;
    if (sourceState.session.platform && sourceState.session.platform !== 'Other') {
        title += ` (${sourceState.session.platform})`;
    }

    let text = `[Split Bill] *${title}*\n`;
    if (sourceState.session.hostName) text += `Billed by: ${sourceState.session.hostName}\n`;
    text += `\nHi ${p.name},\nHere is your split:\n\n*Items*\n${itemsText}\n\n*Subtotal:* ${formatMoney(totals.subtotal)}`;

    if (totals.discount > 0) text += `\n*Total Discount Share:* -${formatMoney(totals.discount)}`;
    if (totals.svc > 0) text += `\n*Svc/Admin:* ${formatMoney(totals.svc)}`;
    if (totals.tax > 0) text += `\n*Tax:* ${formatMoney(totals.tax)}`;
    if (totals.delivery > 0) text += `\n*Delivery:* ${formatMoney(totals.delivery)}`;
    if (totals.orderFee > 0) text += `\n*Platform/Misc:* ${formatMoney(totals.orderFee)}`;

    text += `\n\n*Total to Pay:* ${formatMoney(totals.grandTotal)}`;

    if (sourceState.session.hostInfo) {
        text += `\n\n💳 Please pay to:\n${sourceState.session.hostInfo}`;
    }

    return text;
}

function formatMoney(amount) {
    return new Intl.NumberFormat('en-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

// ----------------- STORAGE & LIFECYCLE -----------------
function autoSave() {
    state.lastUpdated = new Date().toISOString();
    render();
    saveStorage();
}

function saveStorage() {
    localStorage.setItem('splitBillState', JSON.stringify(state));
    localStorage.setItem('splitBillHistory', JSON.stringify(billHistory));
}

function loadStorage() {
    try {
        const savedTheme = localStorage.getItem('splitBillTheme');
        if (savedTheme) {
            currentTheme = savedTheme;
            document.documentElement.setAttribute('data-theme', currentTheme);
        }

        const savedHistory = localStorage.getItem('splitBillHistory');
        if (savedHistory) {
            billHistory = JSON.parse(savedHistory);
        }
        const saved = localStorage.getItem('splitBillState');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Ensure dates gracefully upgrade
            if (!parsed.createdAt) parsed.createdAt = new Date().toISOString();
            if (!parsed.lastUpdated) parsed.lastUpdated = new Date().toISOString();
            Object.assign(state, parsed);
        }
    } catch (e) { console.error('Error loading session', e); }
}

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('splitBillTheme', currentTheme);
    render();
}

function render() {
    const main = document.getElementById('main-content');
    if (!main) return;

    // Attach theme button to header if it doesn't exist
    const header = document.querySelector('.app-header');
    if (header && !document.getElementById('themeToggleBtn')) {
        const btnHtml = `<button id="themeToggleBtn" class="theme-toggle-btn" onclick="toggleTheme()" title="Toggle Dark/Light Mode">
            ${currentTheme === 'dark' ? '☀️' : '🌙'}
        </button>`;
        header.insertAdjacentHTML('beforeend', btnHtml);
    } else if (document.getElementById('themeToggleBtn')) {
        document.getElementById('themeToggleBtn').innerHTML = currentTheme === 'dark' ? '☀️' : '🌙';
    }

    const activeId = document.activeElement ? document.activeElement.id : null;

    let html = renderNav();

    if (currentView === 'editor') {
        html += renderSessionSetup() + renderParticipants() + renderItems() + renderDiscounts() + renderCharges() + renderSummary();
    } else {
        html += renderHistoryView();
    }

    main.innerHTML = html;

    if (activeId) {
        const el = document.getElementById(activeId);
        if (el) {
            el.focus();
            if (typeof el.selectionStart == "number") {
                el.selectionStart = el.selectionEnd = el.value.length;
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadStorage();
    render();
});
